from __future__ import annotations

import io
import math
from collections import deque
from dataclasses import dataclass
from typing import Callable, Optional

from fastapi import HTTPException
from PIL import Image, ImageDraw, ImageFilter, ImageStat, UnidentifiedImageError

from config import settings
from services.ocr_service import extract_text_layout


ProgressCallback = Callable[[str, int], None]
CancelCheck = Callable[[], bool]


class PosterAnalysisCancelled(Exception):
    pass


@dataclass
class PosterRegionArtifact:
    payload: dict
    mask: Image.Image


@dataclass
class PosterAnalysisArtifacts:
    width: int
    height: int
    clean_background: Image.Image
    text_blocks: list[dict]
    palette: list[dict]
    regions: list[PosterRegionArtifact]
    warnings: list[str]


@dataclass
class PosterTextPatchArtifacts:
    image: Image.Image
    source_box: dict
    normalized_box: dict
    text_box: dict
    normalized_text_box: dict


def _check_cancelled(cancelled: Optional[CancelCheck]) -> None:
    if cancelled and cancelled():
        raise PosterAnalysisCancelled("Poster conversion was cancelled.")


def _report(progress: Optional[ProgressCallback], stage: str, percentage: int) -> None:
    if progress:
        progress(stage, percentage)


def _decode_image(payload: bytes) -> Image.Image:
    try:
        source = Image.open(io.BytesIO(payload))
        source.load()
        if source.width <= 0 or source.height <= 0:
            raise ValueError("Invalid image dimensions")
        if source.width * source.height > settings.MAX_UPLOAD_IMAGE_PIXELS:
            raise HTTPException(status_code=413, detail="The poster dimensions are too large for analysis.")
        return source.convert("RGBA")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail="The selected poster is not a valid supported image.") from error


def _pixel_box(item: dict, width: int, height: int) -> dict:
    box = item.get("box") or {}
    left = max(0, min(width, round(float(box.get("x") or 0) * width)))
    top = max(0, min(height, round(float(box.get("y") or 0) * height)))
    box_width = max(1, min(width - left, round(float(box.get("width") or 0) * width)))
    box_height = max(1, min(height - top, round(float(box.get("height") or 0) * height)))
    return {"x": left, "y": top, "width": box_width, "height": box_height}


def _pixel_polygon(item: dict, width: int, height: int, box: dict) -> list[list[int]]:
    points = []
    for point in item.get("polygon") or []:
        if not isinstance(point, list) or len(point) < 2:
            continue
        points.append([
            max(0, min(width, round(float(point[0]) * width))),
            max(0, min(height, round(float(point[1]) * height))),
        ])
    if len(points) >= 3:
        return points
    x, y = box["x"], box["y"]
    right, bottom = x + box["width"], y + box["height"]
    return [[x, y], [right, y], [right, bottom], [x, bottom]]


def _can_merge_text_row(left: dict, right: dict) -> bool:
    left_box = left["bounding_box"]
    right_box = right["bounding_box"]
    left_height = max(1, left_box["height"])
    right_height = max(1, right_box["height"])
    height_ratio = max(left_height, right_height) / min(left_height, right_height)
    left_center = left_box["y"] + left_height / 2
    right_center = right_box["y"] + right_height / 2
    vertical_distance = abs(left_center - right_center)
    horizontal_gap = right_box["x"] - (left_box["x"] + left_box["width"])
    rotation_difference = abs(float(left["style"]["rotation"]) - float(right["style"]["rotation"]))
    return (
        height_ratio <= 1.35
        and vertical_distance <= max(left_height, right_height) * 0.35
        and -max(left_height, right_height) * 0.2 <= horizontal_gap <= max(left_height, right_height) * 1.25
        and rotation_difference <= 2.5
    )


def _merge_text_rows(blocks: list[dict], width: int, height: int) -> list[dict]:
    ordered = sorted(
        blocks,
        key=lambda block: (
            block["bounding_box"]["y"] + block["bounding_box"]["height"] / 2,
            block["bounding_box"]["x"],
        ),
    )
    merged: list[dict] = []
    for block in ordered:
        if not merged or not _can_merge_text_row(merged[-1], block):
            merged.append(block)
            continue
        previous = merged.pop()
        previous_box = previous["bounding_box"]
        block_box = block["bounding_box"]
        left = min(previous_box["x"], block_box["x"])
        top = min(previous_box["y"], block_box["y"])
        right = max(previous_box["x"] + previous_box["width"], block_box["x"] + block_box["width"])
        bottom = max(previous_box["y"] + previous_box["height"], block_box["y"] + block_box["height"])
        combined_box = {"x": left, "y": top, "width": right - left, "height": bottom - top}
        merged.append({
            **previous,
            "id": f"{previous['id']}__{block['id']}",
            "text": f"{previous['text'].rstrip()} {block['text'].lstrip()}",
            "confidence": round(min(previous["confidence"], block["confidence"]), 4),
            "reading_order": min(previous["reading_order"], block["reading_order"]),
            "bounding_box": combined_box,
            "normalized_bounding_box": {
                "x": round(left / width, 6),
                "y": round(top / height, 6),
                "width": round((right - left) / width, 6),
                "height": round((bottom - top) / height, 6),
            },
            "polygon": [[left, top], [right, top], [right, bottom], [left, bottom]],
        })
    return sorted(merged, key=lambda block: block["reading_order"])


def _normalize_text_blocks(ocr_result: dict, width: int, height: int) -> list[dict]:
    blocks = []
    for index, item in enumerate(ocr_result.get("items") or []):
        box = _pixel_box(item, width, height)
        style = item.get("style") or {}
        blocks.append({
            "id": str(item.get("id") or f"text-block-{index + 1}"),
            "text": str(item.get("text") or "").strip(),
            "confidence": round(float(item.get("confidence") or 0), 4),
            "reading_order": int(item.get("readingOrder") or index),
            "bounding_box": box,
            "normalized_bounding_box": {
                "x": round(box["x"] / width, 6),
                "y": round(box["y"] / height, 6),
                "width": round(box["width"] / width, 6),
                "height": round(box["height"] / height, 6),
            },
            "polygon": _pixel_polygon(item, width, height, box),
            "style": {
                "font_family_guess": str(style.get("fontFamilyGuess") or "Inter"),
                "font_size": max(8, round(float(style.get("fontSizeRatio") or 0.045) * height)),
                "font_weight": str(style.get("fontWeight") or "normal"),
                "font_style": str(style.get("fontStyle") or "normal"),
                "fill": str(style.get("color") or "#ffffff"),
                "stroke": style.get("stroke"),
                "stroke_width": max(0, float(style.get("strokeWidth") or 0)),
                "background_color": style.get("backgroundColor"),
                "text_align": str(style.get("textAlign") or "left"),
                "letter_spacing": float(style.get("letterSpacing") or 0),
                "line_height": float(style.get("lineHeight") or 1.2),
                "rotation": float(style.get("rotation") or 0),
            },
        })
    return _assign_text_roles(_merge_text_rows(
        [block for block in blocks if block["text"]],
        width,
        height,
    ), height)


def _assign_text_roles(blocks: list[dict], height: int) -> list[dict]:
    if not blocks:
        return blocks
    largest_font = max(float(block["style"].get("font_size") or 0) for block in blocks)
    ordered = sorted(blocks, key=lambda block: block["reading_order"])
    for index, block in enumerate(ordered):
        box = block["bounding_box"]
        font_size = float(block["style"].get("font_size") or 0)
        text = str(block.get("text") or "")
        relative_y = (box["y"] + box["height"] / 2) / max(1, height)
        word_count = len(text.split())
        if relative_y >= 0.86:
            role = "footer"
        elif font_size >= largest_font * 0.86 and index <= 2:
            role = "heading"
        elif font_size >= largest_font * 0.68 and word_count <= 10:
            role = "subheading"
        elif word_count <= 4 and box["height"] <= height * 0.08:
            role = "label"
        elif font_size <= largest_font * 0.48 or word_count <= 6:
            role = "caption"
        else:
            role = "body"
        block["role"] = role
    return sorted(ordered, key=lambda block: block["reading_order"])


def _build_text_mask(size: tuple[int, int], blocks: list[dict]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for block in blocks:
        polygon = [tuple(point) for point in block["polygon"]]
        draw.polygon(polygon, fill=255)
    padding = max(2, min(20, settings.POSTER_TEXT_MASK_PADDING))
    filter_size = padding * 2 + 1
    return mask.filter(ImageFilter.MaxFilter(filter_size))


def _surrounding_colour(source: Image.Image, box: dict, padding: int) -> tuple[tuple[int, int, int, int], float]:
    left = max(0, box["x"] - padding)
    top = max(0, box["y"] - padding)
    right = min(source.width, box["x"] + box["width"] + padding)
    bottom = min(source.height, box["y"] + box["height"] + padding)
    crop = source.crop((left, top, right, bottom)).convert("RGB")
    ring = Image.new("L", crop.size, 255)
    inner_left = max(0, box["x"] - left)
    inner_top = max(0, box["y"] - top)
    inner_right = min(crop.width, inner_left + box["width"])
    inner_bottom = min(crop.height, inner_top + box["height"])
    ImageDraw.Draw(ring).rectangle((inner_left, inner_top, inner_right, inner_bottom), fill=0)
    stat = ImageStat.Stat(crop, ring)
    mean = tuple(round(channel) for channel in stat.mean[:3]) + (255,)
    variation = sum(stat.stddev[:3]) / 3
    return mean, variation


def _remove_text(source: Image.Image, blocks: list[dict]) -> tuple[Image.Image, list[str]]:
    if not blocks:
        return source.copy(), []
    mask = _build_text_mask(source.size, blocks)
    blur_radius = max(7, round(min(source.size) * 0.018))
    replacement = source.filter(ImageFilter.GaussianBlur(blur_radius))
    warnings = []
    replacement_draw = ImageDraw.Draw(replacement)
    for block in blocks:
        padding = max(5, round(min(block["bounding_box"]["width"], block["bounding_box"]["height"]) * 0.2))
        colour, variation = _surrounding_colour(source, block["bounding_box"], padding)
        box = block["bounding_box"]
        if variation < 32:
            replacement_draw.rectangle(
                (box["x"] - padding, box["y"] - padding, box["x"] + box["width"] + padding, box["y"] + box["height"] + padding),
                fill=colour,
            )
        elif block["confidence"] < 0.65:
            warnings.append(f"Text removal around “{block['text'][:32]}” may need manual correction.")
    softened_mask = mask.filter(ImageFilter.GaussianBlur(1.4))
    return Image.composite(replacement, source, softened_mask), warnings


def _clean_text_region_patch(source: Image.Image, block: dict) -> PosterTextPatchArtifacts:
    box = block["bounding_box"]
    padding = max(
        settings.POSTER_TEXT_MASK_PADDING,
        round(max(box["height"], min(box["width"], box["height"]) * 0.5) * 0.3),
        4,
    )
    left = max(0, box["x"] - padding)
    top = max(0, box["y"] - padding)
    right = min(source.width, box["x"] + box["width"] + padding)
    bottom = min(source.height, box["y"] + box["height"] + padding)
    patch_box = {
        "x": left,
        "y": top,
        "width": max(1, right - left),
        "height": max(1, bottom - top),
    }
    crop = source.crop((left, top, right, bottom))
    local_polygon = [
        (
            max(0, min(patch_box["width"], point[0] - left)),
            max(0, min(patch_box["height"], point[1] - top)),
        )
        for point in block["polygon"]
    ]
    mask = Image.new("L", crop.size, 0)
    ImageDraw.Draw(mask).polygon(local_polygon, fill=255)
    dilation = max(3, min(19, round(box["height"] * 0.18)))
    if dilation % 2 == 0:
        dilation += 1
    mask = mask.filter(ImageFilter.MaxFilter(dilation)).filter(ImageFilter.GaussianBlur(1.4))

    blur_radius = max(4, min(24, round(box["height"] * 0.42)))
    replacement = crop.filter(ImageFilter.GaussianBlur(blur_radius))
    colour, variation = _surrounding_colour(source, box, max(padding, 6))
    if variation < 32:
        flat = Image.new("RGBA", crop.size, colour)
        replacement = Image.composite(flat, replacement, mask.filter(ImageFilter.GaussianBlur(3)))
    cleaned = Image.composite(replacement, crop, mask)
    return PosterTextPatchArtifacts(
        image=cleaned,
        source_box=patch_box,
        normalized_box={
            "x": round(left / source.width, 6),
            "y": round(top / source.height, 6),
            "width": round(patch_box["width"] / source.width, 6),
            "height": round(patch_box["height"] / source.height, 6),
        },
        text_box=dict(box),
        normalized_text_box=dict(block["normalized_bounding_box"]),
    )


def create_text_region_patch(payload: bytes, block: dict) -> PosterTextPatchArtifacts:
    source = _decode_image(payload)
    return _clean_text_region_patch(source, block)


def _extract_palette(image: Image.Image, count: int = 8) -> list[dict]:
    sample = image.convert("RGB")
    sample.thumbnail((320, 320), Image.Resampling.LANCZOS)
    quantized = sample.quantize(colors=count, method=Image.Quantize.MEDIANCUT)
    colours = quantized.getcolors(maxcolors=sample.width * sample.height) or []
    palette = quantized.getpalette() or []
    total = max(1, sample.width * sample.height)
    result = []
    for pixels, index in sorted(colours, reverse=True):
        offset = index * 3
        red, green, blue = palette[offset:offset + 3]
        result.append({
            "color": f"#{red:02X}{green:02X}{blue:02X}",
            "percentage": round(pixels * 100 / total, 2),
            "region_count": 0,
        })
    return result


def _hex_rgb(value: str) -> tuple[int, int, int]:
    cleaned = value.lstrip("#")
    return int(cleaned[0:2], 16), int(cleaned[2:4], 16), int(cleaned[4:6], 16)


def _connected_components(flags: list[bool], width: int, height: int) -> list[list[int]]:
    visited = bytearray(width * height)
    components = []
    for start, enabled in enumerate(flags):
        if not enabled or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        component = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            for neighbour in (
                index - 1 if x > 0 else -1,
                index + 1 if x + 1 < width else -1,
                index - width if y > 0 else -1,
                index + width if y + 1 < height else -1,
            ):
                if neighbour >= 0 and flags[neighbour] and not visited[neighbour]:
                    visited[neighbour] = 1
                    queue.append(neighbour)
        components.append(component)
    return components


def _detect_colour_regions(image: Image.Image, palette: list[dict]) -> list[PosterRegionArtifact]:
    sample = image.convert("RGB")
    sample.thumbnail((240, 240), Image.Resampling.LANCZOS)
    pixels = list(sample.getdata())
    minimum_pixels = max(12, round(len(pixels) * settings.POSTER_REGION_MIN_PERCENTAGE / 100))
    candidates = []
    for palette_item in palette[:6]:
        target = _hex_rgb(palette_item["color"])
        flags = [
            math.sqrt(sum((pixel[channel] - target[channel]) ** 2 for channel in range(3))) <= 34
            for pixel in pixels
        ]
        for component in _connected_components(flags, sample.width, sample.height):
            if len(component) < minimum_pixels:
                continue
            xs = [index % sample.width for index in component]
            ys = [index // sample.width for index in component]
            left, top, right, bottom = min(xs), min(ys), max(xs) + 1, max(ys) + 1
            box_area = max(1, (right - left) * (bottom - top))
            coverage = len(component) / box_area
            percentage = len(component) * 100 / len(pixels)
            touches_edges = left == 0 and top == 0 and right == sample.width and bottom == sample.height
            confidence = min(0.99, 0.55 + coverage * 0.35 + min(percentage / 100, 0.09))
            mask_small = Image.new("L", sample.size, 0)
            mask_pixels = mask_small.load()
            for index in component:
                mask_pixels[index % sample.width, index // sample.width] = 255
            alpha = mask_small.resize(image.size, Image.Resampling.NEAREST).filter(ImageFilter.GaussianBlur(0.7))
            mask = Image.new("RGBA", image.size, (255, 255, 255, 0))
            mask.putalpha(alpha)
            scale_x, scale_y = image.width / sample.width, image.height / sample.height
            candidates.append(PosterRegionArtifact(
                payload={
                    "name": "Main background" if touches_edges or percentage > 45 else f"{palette_item['color']} design region",
                    "color": palette_item["color"],
                    "percentage": round(percentage, 2),
                    "confidence": round(confidence, 3),
                    "bounding_box": {
                        "x": round(left * scale_x),
                        "y": round(top * scale_y),
                        "width": max(1, round((right - left) * scale_x)),
                        "height": max(1, round((bottom - top) * scale_y)),
                    },
                    "editable": confidence >= 0.72,
                    "region_type": "background" if touches_edges or percentage > 45 else "design-region",
                    "simple_shape": "rectangle" if coverage >= 0.9 and confidence >= 0.84 else None,
                },
                mask=mask,
            ))
    candidates.sort(key=lambda item: item.payload["percentage"] * item.payload["confidence"], reverse=True)
    selected = candidates[:settings.POSTER_ANALYSIS_MAX_REGIONS]
    for index, region in enumerate(selected):
        region.payload["id"] = f"region-{index + 1}"
    counts = {item["color"]: 0 for item in palette}
    for region in selected:
        counts[region.payload["color"]] = counts.get(region.payload["color"], 0) + 1
    for item in palette:
        item["region_count"] = counts.get(item["color"], 0)
    return selected


def analyze_poster_image(
    payload: bytes,
    mime_type: str,
    mode: str,
    language: str = "auto",
    progress: Optional[ProgressCallback] = None,
    cancelled: Optional[CancelCheck] = None,
) -> PosterAnalysisArtifacts:
    _report(progress, "Preparing image", 8)
    source = _decode_image(payload)
    _check_cancelled(cancelled)

    _report(progress, "Detecting text", 22)
    ocr_result = extract_text_layout(payload, mime_type, language)
    text_blocks = _normalize_text_blocks(ocr_result, source.width, source.height)
    _check_cancelled(cancelled)

    _report(progress, "Detecting text styles", 38)
    warnings = []
    if any(block["confidence"] < settings.OCR_CONFIDENCE_THRESHOLD for block in text_blocks):
        warnings.append("Low-confidence text was detected. Review it before creating layers.")
    _check_cancelled(cancelled)

    _report(progress, "Preserving original pixels", 52)
    clean_background = source.copy()
    _check_cancelled(cancelled)

    _report(progress, "Extracting colours", 66)
    palette = _extract_palette(source)
    _check_cancelled(cancelled)

    _report(progress, "Finalising text metadata", 80)
    regions = []
    _check_cancelled(cancelled)

    if not text_blocks:
        warnings.append("No readable text was detected.")
    warnings.append("The original uploaded poster is preserved as a fallback and is not recompressed.")
    warnings.append("Only a user-selected text region receives a local clean patch when that region is edited.")
    warnings.append("Backgrounds, photos, graphics, icons, and decorative elements remain the original image.")
    warnings.append("Complex text backgrounds and exact fonts may require manual adjustment after conversion.")
    return PosterAnalysisArtifacts(
        width=source.width,
        height=source.height,
        clean_background=clean_background,
        text_blocks=text_blocks,
        palette=palette,
        regions=regions,
        warnings=warnings,
    )
