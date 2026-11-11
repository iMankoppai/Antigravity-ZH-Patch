---
name: invideo-media
description: "Get and check media for an invideo video: the person's uploads, stock video, images and music, rights, and the craft of voice-over, music, sound effects, cleanup and dubbing."
---

# Media in invideo

Read `/invideo` first.

## Where it comes from, best first

1. **The person's own files:** upload them into the project (`invideo asset upload` / `start_upload`).
2. **Stock:** search the library (`invideo library search` / `search_library`) and bring a pick in (`invideo asset add` / `add_media`).
3. **Generation:** for what neither has: `/invideo-generate`.

## Before it goes on the timeline

Probe, filmstrip and waveform every file (`invideo media metadata|video.frames|audio.waveform` / `media` with that `op`). Stock comes as a watermarked preview; exports render it clean. Check commercial-use rights for stock and generated media.

## What to read

| The need | Read |
|---|---|
| Voice-over, music, sound effects, dialogue cleanup, dubbing | `references/voice-music.md` |
| Generating images, video, voice, music and sound | `/invideo-generate` |
| Mixing, ducking, loudness | `/invideo-timeline` |
