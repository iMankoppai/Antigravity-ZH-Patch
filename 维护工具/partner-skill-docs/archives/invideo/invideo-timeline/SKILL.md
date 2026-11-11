---
name: invideo-timeline
description: "Use for operations depth on an invideo timeline: frame math, tracks and layering, keyframes and motion, speed ramps, grades, LUTs, effects and custom shaders, audio buses, ducking and loudness."
---

# Timeline operations

Read `/invideo` first.

An edit is a list of operations, applied all or none. Look up each op's fields before its first use (`timeline_catalog`), and check a big edit with `dry_run: true` before it lands.

## Frame math

- Fields ending in `_f` are frames at the timeline's own rate; `_seconds` fields are seconds. Frames = seconds × fps: half a second is 15 frames at 30 fps, 12 at 24.
- Read the rate from the timeline; never assume it.
- Ranges include their start and exclude their end: a clip from 0 to 90 ends on frame 89.
- Reads give times as `{value, rate}`, which is value / rate seconds.

## Tracks and layering

- Higher video tracks draw over lower ones. Build up: footage, then the grade on an adjustment clip over everything below it (`add_adjustment`), then type and overlays on top.
- A video's sound is its own audio clip, linked to the picture. They move, trim and delete together.
- Give each track one job and name it (`set_name`): dialogue, music, effects; footage, b-roll, titles. Lock what you aren't touching (`set_track_locked`).

## The locality test

Move one reveal, keep everything else. Every edit touches only what it must; if a small change moved anything else, the edit was wrong.

- Prefer the op that holds the rest still. `roll` moves a cut and nothing after it; `slip_clip` changes what a clip shows without moving it.
- Rippling ops shift everything later on the track: `edit_gap`, `delete_clip` with `close_gap`, `retime`, `edit_time_range` across every unlocked track. Use them when that shift is the point.
- Before you send, say what should change. After, capture that moment and its neighbors and compare.

## What to read

Every `edit_timeline` operation with its fields, and the effect, transition and audio effect names: https://docs.invideo.io/reference/edit-operations (markdown: add `.md`).

| The need | Read |
|---|---|
| Easing, overlap, keyframing type, scale, position and opacity, speed ramps | `references/keyframes.md` |
| Grades, LUTs, looks, masks, transitions, effects, custom shaders | `references/color-and-effects.md` |
| Buses, sends, ducking, audio effects, loudness | `references/audio.md` |
