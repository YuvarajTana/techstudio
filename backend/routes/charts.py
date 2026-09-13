from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from auth import get_current_user
from database import User
import base64
import math

router = APIRouter(prefix="/api/charts", tags=["charts"])


class ChartDataPoint(BaseModel):
    label: str
    value: float
    color: Optional[str] = None


class ChartRequest(BaseModel):
    chart_type: str = Field("bar", description="Type: bar, line, pie, doughnut, progress")
    title: Optional[str] = "Stat Overview"
    data: List[ChartDataPoint]
    width: int = Field(500, ge=200, le=2000)
    height: int = Field(350, ge=150, le=2000)
    background_color: str = Field("#ffffff", description="Background hex color")
    primary_color: str = Field("#6366f1", description="Primary chart color")
    text_color: str = Field("#1e293b", description="Text label color")


DEFAULT_PALETTE = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"]


def generate_bar_chart_svg(req: ChartRequest) -> str:
    padding = 50
    w, h = req.width, req.height
    chart_w = w - (padding * 2)
    chart_h = h - (padding * 2) - 40

    values = [d.value for d in req.data]
    max_val = max(values) if values and max(values) > 0 else 100
    bar_count = len(req.data)
    gap = 15
    bar_w = max(10, (chart_w - (gap * (bar_count + 1))) / bar_count)

    elements = []
    # Title
    if req.title:
        elements.append(f'<text x="{w/2}" y="30" font-family="sans-serif" font-size="16" font-weight="bold" fill="{req.text_color}" text-anchor="middle">{req.title}</text>')

    # Gridlines
    for i in range(5):
        y_pos = padding + 40 + (chart_h / 4) * i
        grid_val = round(max_val * (1 - i / 4))
        elements.append(f'<line x1="{padding}" y1="{y_pos}" x2="{w - padding}" y2="{y_pos}" stroke="#e2e8f0" stroke-dasharray="4,4"/>')
        elements.append(f'<text x="{padding - 8}" y="{y_pos + 4}" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="end">{grid_val}</text>')

    # Bars
    for idx, item in enumerate(req.data):
        x = padding + gap + idx * (bar_w + gap)
        bar_height = (item.value / max_val) * chart_h
        y = padding + 40 + (chart_h - bar_height)
        color = item.color or DEFAULT_PALETTE[idx % len(DEFAULT_PALETTE)]

        elements.append(f'<rect x="{x}" y="{y}" width="{bar_w}" height="{bar_height}" fill="{color}" rx="4" />')
        # Value label on bar
        elements.append(f'<text x="{x + bar_w/2}" y="{y - 6}" font-family="sans-serif" font-size="11" font-weight="bold" fill="{req.text_color}" text-anchor="middle">{item.value:g}</text>')
        # X Axis label
        elements.append(f'<text x="{x + bar_w/2}" y="{h - padding + 20}" font-family="sans-serif" font-size="11" fill="{req.text_color}" text-anchor="middle">{item.label}</text>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
        <rect width="100%" height="100%" fill="{req.background_color}" rx="8"/>
        {"".join(elements)}
    </svg>'''
    return svg


def generate_pie_chart_svg(req: ChartRequest, is_doughnut: bool = False) -> str:
    w, h = req.width, req.height
    cx, cy = w / 2, (h / 2) + 15
    radius = min(w, h) * 0.32

    values = [max(0, d.value) for d in req.data]
    total = sum(values) if sum(values) > 0 else 1

    elements = []
    if req.title:
        elements.append(f'<text x="{w/2}" y="30" font-family="sans-serif" font-size="16" font-weight="bold" fill="{req.text_color}" text-anchor="middle">{req.title}</text>')

    current_angle = 0.0
    for idx, item in enumerate(req.data):
        slice_angle = (item.value / total) * 2 * math.pi
        start_angle = current_angle
        end_angle = current_angle + slice_angle
        current_angle = end_angle

        x1 = cx + radius * math.cos(start_angle)
        y1 = cy + radius * math.sin(start_angle)
        x2 = cx + radius * math.cos(end_angle)
        y2 = cy + radius * math.sin(end_angle)

        large_arc = 1 if slice_angle > math.pi else 0
        color = item.color or DEFAULT_PALETTE[idx % len(DEFAULT_PALETTE)]

        d_path = f"M {cx},{cy} L {x1},{y1} A {radius},{radius} 0 {large_arc},1 {x2},{y2} Z"
        elements.append(f'<path d="{d_path}" fill="{color}" stroke="#ffffff" stroke-width="2" />')

    if is_doughnut:
        hole_radius = radius * 0.55
        elements.append(f'<circle cx="{cx}" cy="{cy}" r="{hole_radius}" fill="{req.background_color}" />')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
        <rect width="100%" height="100%" fill="{req.background_color}" rx="8"/>
        {"".join(elements)}
    </svg>'''
    return svg


@router.post("/generate")
def generate_chart(req: ChartRequest, current_user: User = Depends(get_current_user)):
    """Generate vector SVG chart element for canvas insertion."""
    if not req.data:
        raise HTTPException(status_code=400, detail="Chart requires at least one data point")

    ctype = req.chart_type.lower().strip()
    if ctype == "bar":
        svg_code = generate_bar_chart_svg(req)
    elif ctype == "pie":
        svg_code = generate_pie_chart_svg(req, is_doughnut=False)
    elif ctype == "doughnut":
        svg_code = generate_pie_chart_svg(req, is_doughnut=True)
    else:
        svg_code = generate_bar_chart_svg(req)

    encoded_svg = base64.b64encode(svg_code.encode("utf-8")).decode("utf-8")
    data_url = f"data:image/svg+xml;base64,{encoded_svg}"

    return {
        "success": True,
        "chart_type": req.chart_type,
        "title": req.title,
        "svg": svg_code,
        "data_url": data_url,
        "width": req.width,
        "height": req.height,
    }
