---
name: invideo-generate
description: "Generate images, video, voice-over, music, sound effects and 3D for an invideo video: picking and prompting a model, pricing, narration first, retries."
---

# Generation in invideo

Read `/invideo` first. Generate what the person's files and stock can't give (`/invideo-media`).

## How to generate

- Pick the model from the live list (`invideo gen models` / `find_models`); it changes as models ship.
- Price it with `invideo gen run … --dry-run` / `dry_run`, say the cost, then run it with `--max-credits` / `max_credits`. Make one sample, review it, then make the rest.
- With narration, generate the voice first, read its length (`invideo media metadata` / `media`), then generate picture to fit.
- At most three tries per asset, changing something each time; then stop and tell the person. Redo only what failed.

## What to read

| The need | Read |
|---|---|
| Choosing and prompting a model | `references/models.md` |
| Model ids by job, the dry run and the retirement rule | https://docs.invideo.io/reference/models (markdown: add `.md`) |
| Voice-over, music and sound craft | `/invideo-media` |
| Checking what came back | `/invideo-media` |
