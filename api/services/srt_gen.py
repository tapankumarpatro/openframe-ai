"""SRT subtitle generation using OpenAI Whisper (local, free).

Downloads audio from URL, transcribes with Whisper, returns SRT text.
"""

import os
import tempfile
import httpx


def _seconds_to_srt_time(seconds: float) -> str:
    """Convert seconds to SRT timestamp format HH:MM:SS,mmm."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt_from_audio(audio_url: str, language: str = "en") -> str:
    """Download audio from URL and generate SRT subtitles using Whisper.

    Returns SRT-formatted string.
    Requires: pip install openai-whisper
    """
    import whisper

    # Download audio to temp file
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name
        with httpx.Client(timeout=60) as client:
            resp = client.get(audio_url)
            resp.raise_for_status()
            tmp.write(resp.content)

    try:
        # Load Whisper model (cached after first download)
        model = whisper.load_model("base")
        result = model.transcribe(tmp_path, language=language)

        # Build SRT from segments
        srt_lines = []
        for i, seg in enumerate(result.get("segments", []), start=1):
            start = _seconds_to_srt_time(seg["start"])
            end = _seconds_to_srt_time(seg["end"])
            text = seg["text"].strip()
            srt_lines.append(f"{i}\n{start} --> {end}\n{text}\n")

        return "\n".join(srt_lines)
    finally:
        os.unlink(tmp_path)
