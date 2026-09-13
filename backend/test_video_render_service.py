import asyncio
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from PIL import Image
from starlette.datastructures import Headers, UploadFile

from services.video_render_service import (
    VideoRenderValidationError,
    build_ffmpeg_command,
    build_frame_sequence_command,
    cleanup_render_inputs,
    request_cancel,
    validate_render_request,
)


class _FakeQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.result


class _FakeDb:
    def __init__(self):
        self.project = SimpleNamespace(id="project-1", user_id="user-1", name="Export Test")
        self.added_job = None

    def query(self, model):
        if model.__name__ == "Project":
            return _FakeQuery(self.project)
        return _FakeQuery(None)

    def add(self, job):
        self.added_job = job

    def commit(self):
        return None

    def refresh(self, job):
        return None


class _FakeJobDb:
    def __init__(self, job):
        self.job = job
        self.commits = 0

    def query(self, model):
        return _FakeQuery(self.job)

    def commit(self):
        self.commits += 1

    def close(self):
        return None


def timeline(scene_count: int = 2):
    clips = [
        {
            "id": f"clip-{index}",
            "pageId": f"page-{index}",
            "durationMs": 3000,
            "visible": True,
            "animation": {
                "enter": {"type": "fade", "durationMs": 500},
                "hold": {"type": "zoom-in", "durationMs": 0},
                "exit": {"type": "slide-left", "durationMs": 500},
            },
        }
        for index in range(scene_count)
    ]
    return {
        "durationMs": scene_count * 3000 - max(scene_count - 1, 0) * 500,
        "tracks": [{"id": "poster-track", "type": "poster", "clips": clips}],
        "transitions": [
            {
                "id": f"transition-{index}",
                "fromClipId": clips[index]["id"],
                "toClipId": clips[index + 1]["id"],
                "type": "crossfade",
                "durationMs": 500,
            }
            for index in range(max(scene_count - 1, 0))
        ],
    }


class VideoRenderServiceTests(unittest.TestCase):
    def test_validate_request_accepts_supported_settings(self):
        clips, duration_ms = validate_render_request(
            timeline(),
            scene_count=2,
            output_format="mp4",
            width=1080,
            height=1350,
            fps=30,
            quality="high",
        )
        self.assertEqual(len(clips), 2)
        self.assertEqual(duration_ms, 5500)

    def test_validate_request_rejects_scene_mismatch(self):
        with self.assertRaises(VideoRenderValidationError):
            validate_render_request(
                timeline(),
                scene_count=1,
                output_format="mp4",
                width=1080,
                height=1350,
                fps=30,
                quality="high",
            )

    def test_validate_request_rejects_invalid_format_fps_and_resolution(self):
        invalid_settings = [
            {"output_format": "mov", "width": 1080, "height": 1350, "fps": 30},
            {"output_format": "mp4", "width": 1080, "height": 1350, "fps": 25},
            {"output_format": "mp4", "width": 239, "height": 1350, "fps": 30},
            {"output_format": "mp4", "width": 1081, "height": 1350, "fps": 30},
        ]
        for values in invalid_settings:
            with self.subTest(values=values), self.assertRaises(VideoRenderValidationError):
                validate_render_request(
                    timeline(),
                    scene_count=2,
                    quality="high",
                    **values,
                )

    def test_validate_request_rejects_empty_timeline(self):
        with self.assertRaises(VideoRenderValidationError):
            validate_render_request(
                {"durationMs": 0, "tracks": [{"type": "poster", "clips": []}]},
                scene_count=0,
                output_format="mp4",
                width=1080,
                height=1350,
                fps=30,
                quality="high",
            )

    def test_mp4_command_uses_browser_compatible_h264(self):
        command, duration_ms = build_ffmpeg_command(
            [Path("/tmp/scene-1.png"), Path("/tmp/scene-2.png")],
            timeline(),
            Path("/tmp/output.mp4"),
            "mp4",
            1080,
            1350,
            30,
            "high",
        )
        self.assertIn("libx264", command)
        self.assertIn("yuv420p", command)
        self.assertIn("+faststart", command)
        self.assertIn("xfade=transition=fade", " ".join(command))
        self.assertEqual(duration_ms, 5500)

    def test_webm_command_uses_vp9(self):
        command, _ = build_ffmpeg_command(
            [Path("/tmp/scene-1.png"), Path("/tmp/scene-2.png")],
            timeline(),
            Path("/tmp/output.webm"),
            "webm",
            1080,
            1350,
            30,
            "standard",
        )
        self.assertIn("libvpx-vp9", command)
        self.assertIn("yuv420p", command)
        self.assertIn("-row-mt", command)

    def test_frame_sequence_command_encodes_every_numbered_frame(self):
        command, duration_ms = build_frame_sequence_command(
            Path("/tmp/render-frames"),
            Path("/tmp/output.mp4"),
            "mp4",
            1080,
            1350,
            30,
            "high",
            360,
        )
        command_text = " ".join(command)
        self.assertIn("frame-%06d.png", command_text)
        self.assertIn("-frames:v 360", command_text)
        self.assertNotIn("-loop 1", command_text)
        self.assertIn("libx264", command)
        self.assertIn("yuv420p", command)
        self.assertEqual(duration_ms, 12000)

    def test_frame_sequence_command_prefers_compacted_jpeg_frames(self):
        with tempfile.TemporaryDirectory() as temporary_root:
            frame_directory = Path(temporary_root)
            (frame_directory / "frame-000000.jpg").write_bytes(b"jpeg")
            command, _ = build_frame_sequence_command(
                frame_directory,
                Path("/tmp/output.mp4"),
                "mp4",
                1080,
                1350,
                30,
                "high",
                1,
            )
            self.assertIn("frame-%06d.jpg", " ".join(command))

    def test_persist_frame_compacts_uploaded_png_to_jpeg(self):
        from routes.video_render import _persist_frame

        source = io.BytesIO()
        Image.new("RGBA", (1080, 1920), (120, 70, 220, 255)).save(source, format="PNG")
        source.seek(0)
        upload = UploadFile(
            filename="frame-000000.png",
            file=source,
            headers=Headers({"content-type": "image/png"}),
        )
        with tempfile.TemporaryDirectory() as temporary_root:
            destination = Path(temporary_root) / "frame-000000.jpg"
            asyncio.run(_persist_frame(upload, destination, 1080, 1920))
            self.assertTrue(destination.exists())
            with Image.open(destination) as image:
                self.assertEqual(image.format, "JPEG")
                self.assertEqual(image.size, (1080, 1920))

    def test_cleanup_render_inputs_removes_frames_but_keeps_output(self):
        with tempfile.TemporaryDirectory() as temporary_root:
            job_directory = Path(temporary_root) / "video_job"
            job_directory.mkdir()
            output_path = job_directory / "final.mp4"
            output_path.write_bytes(b"video")
            (job_directory / "frame-000000.png").write_bytes(b"frame")
            (job_directory / "scene-001.png").write_bytes(b"scene")
            (job_directory / "audio-000-input.mp3").write_bytes(b"audio")

            from services import video_render_service
            original_root = video_render_service.RENDER_ROOT
            video_render_service.RENDER_ROOT = Path(temporary_root)
            try:
                cleanup_render_inputs(job_directory, output_path)
            finally:
                video_render_service.RENDER_ROOT = original_root

            self.assertTrue(output_path.exists())
            self.assertFalse((job_directory / "frame-000000.png").exists())
            self.assertFalse((job_directory / "scene-001.png").exists())
            self.assertFalse((job_directory / "audio-000-input.mp3").exists())

    def test_cancel_queued_render_marks_cancelled_and_removes_directory(self):
        from services import video_render_service

        job_id = "video_cancel_queued"
        job = SimpleNamespace(
            id=job_id,
            cancel_requested=False,
            status="queued",
            progress=1,
            stage="Queued for rendering",
            completed_at=None,
            updated_at=None,
        )

        with tempfile.TemporaryDirectory() as temporary_root:
            job_directory = Path(temporary_root) / job_id
            job_directory.mkdir()
            (job_directory / "frame-000000.jpg").write_bytes(b"frame")
            original_root = video_render_service.RENDER_ROOT
            original_session_local = video_render_service.SessionLocal
            video_render_service.RENDER_ROOT = Path(temporary_root)
            video_render_service.SessionLocal = lambda: _FakeJobDb(job)
            video_render_service.ACTIVE_PROCESSES.clear()
            try:
                request_cancel(job_id)
            finally:
                video_render_service.RENDER_ROOT = original_root
                video_render_service.SessionLocal = original_session_local
                video_render_service.ACTIVE_PROCESSES.clear()

            self.assertTrue(job.cancel_requested)
            self.assertEqual(job.status, "cancelled")
            self.assertEqual(job.progress, 0)
            self.assertEqual(job.stage, "Render cancelled")
            self.assertIsNotNone(job.completed_at)
            self.assertFalse(job_directory.exists())

    def test_frame_sequence_command_rejects_empty_sequence(self):
        with self.assertRaises(VideoRenderValidationError):
            build_frame_sequence_command(
                Path("/tmp/render-frames"),
                Path("/tmp/output.mp4"),
                "mp4",
                1080,
                1350,
                30,
                "high",
                0,
            )

    def test_frame_render_route_accepts_multipart_timeline_and_audio(self):
        from routes import video_render

        export_timeline = timeline()
        export_timeline["audioClips"] = [
            {
                "id": "audio-1",
                "name": "Background Music",
                "assetUrl": "uploaded-audio://audio-1",
                "trackType": "bgmusic",
                "startTimeMs": 0,
                "durationMs": export_timeline["durationMs"],
                "trimStartMs": 0,
                "trimEndMs": 0,
                "volume": 1,
                "muted": False,
            }
        ]
        timeline_file = UploadFile(
            filename="timeline.json",
            file=io.BytesIO(json.dumps(export_timeline).encode("utf-8")),
            headers=Headers({"content-type": "application/json"}),
        )
        audio_file = UploadFile(
            filename="background.mp3",
            file=io.BytesIO(b"ID3\x04\x00\x00\x00\x00\x00\x00"),
            headers=Headers({"content-type": "audio/mpeg"}),
        )
        db = _FakeDb()
        user = SimpleNamespace(id="user-1")

        with tempfile.TemporaryDirectory() as temporary_root:
            original_root = video_render.RENDER_ROOT
            original_ffmpeg_available = video_render._ffmpeg_available
            original_cleanup = video_render.cleanup_expired_render_files
            video_render.RENDER_ROOT = Path(temporary_root)
            video_render._ffmpeg_available = lambda: True
            video_render.cleanup_expired_render_files = lambda update_database=True: None
            try:
                response = asyncio.run(video_render.create_frame_video_render(
                    project_id="project-1",
                    format="mp4",
                    width=1080,
                    height=1920,
                    fps=30,
                    quality="high",
                    total_frames=165,
                    timeline_json=None,
                    include_audio=True,
                    audio_file_ids='["audio-1"]',
                    timeline_file=timeline_file,
                    audio_files=[audio_file],
                    current_user=user,
                    db=db,
                ))
            finally:
                video_render.RENDER_ROOT = original_root
                video_render._ffmpeg_available = original_ffmpeg_available
                video_render.cleanup_expired_render_files = original_cleanup

            self.assertEqual(response.status, "queued")
            self.assertIsNotNone(db.added_job)
            audio_url = db.added_job.timeline_json["audioClips"][0]["assetUrl"]
            self.assertTrue(audio_url.startswith(str(Path(temporary_root))))
            self.assertTrue(Path(audio_url).exists())


if __name__ == "__main__":
    unittest.main()
