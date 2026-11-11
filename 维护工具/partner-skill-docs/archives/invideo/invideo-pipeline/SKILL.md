---
name: invideo-pipeline
description: "Use for scale and automation: a CSV to many videos, `--json`, idempotency keys, CI with device sign-in, outreach at scale, course batches, bulk orders, and several agents sharing one project."
---

# Many videos at once

Read `/invideo` first.

## Start from a brief

Get the whole sheet, not the sample row; the sample is always the nicest one.

## What makes it work

At scale you stop editing videos and start editing the system that makes them. Each viewer sees only their own, so the batch is as good as its worst row: the name that overflows, the empty field, the "1 lessons". Spend the craft on the edges of the data, not the middle.

- Cut three very different rows by hand first. What changed between them is the variables; the rest is locked.
- Personalize what the viewer did, made or earned. A first name alone is decoration.
- Fix the template or the data, never one video by hand.

## Craft

- **Locked and free.** Lock story, pacing, music, type and color. Let the data change the name, number, image, language and hook. If a value flattens the key moment (confetti over "1 lesson"), that row gets a different scene, not a smaller font.
- **Worst rows.** Before the batch, run the hardest rows: longest name, empty cells, ALL CAPS, other scripts, zero and one, a portrait photo in a wide slot, a white logo on white. Each should look designed, not just unbroken.
- **Text.** Leave room, then wrap, then shrink to a floor, then switch layout. Never truncate a name or split first from last. Hold time follows word count; the slack goes into a held background, never the beat that hits the music. Short labels grow most in translation.
- **Fallbacks.** Missing data gets a rewritten line ("Welcome aboard"), not "Hi Friend". Thin-data viewers get a warmer, shorter cut about a beginning, never a sad number. When wrong is worse than missing, skip the row.
- **Voice.** One voice for the whole line. A name spliced into another voice is the fastest tell. Pin how names and brand terms are said.
- **Variation.** Variants are cousins, lessons are siblings. Vary the hook and first seconds hard, keep the brand thread; a caption swap is not a variant. Rotate two or three layouts so the set never looks machine-made. Your boredom is not the viewer's.
- **Checks.** Pilot five to ten rows from the extremes, get them approved, then run the rest. A repeating defect stops the batch. Scan stills at the moment of most variation, every branch, and outliers in length. Watch a few as the person each is for.
- **Names.** Name files from the data: who or what, format, version. Give each row a stable key, so a rerun skips finished rows and nobody gets two videos.

## Scripted runs

Worked scripts with the exact commands: https://docs.invideo.io/how-to/ci-and-servers and https://docs.invideo.io/how-to/developers/csv-to-videos (markdown: add `.md`).

- Use the CLI with `--json` and read the JSON.
- Give each generation its own `--idempotency-key` (the row's id and step, like `row-42-voice`), so a rerun finds the earlier generations instead of making them again.
- `invideo status <urls…> --wait` follows generations and exports until they finish.
- The session lives on the machine that signed in (the keychain or keyring, else `~/.config/invideo/credentials.json`). For CI, use a persistent runner where someone signed in once with `INVIDEO_NO_BROWSER=1 invideo auth login`.

## Several agents in one project

Register a name that says your role, own one part, read the inbox and the timeline before every pass, and write every update for the person. The craft: `references/collaborate.md`.

## By type

| Video | Focus |
|---|---|
| Outreach | A few real seconds from the sender up front, then a shared body about the prospect's own problem. |
| Course batch | Lessons under six minutes. Lock lesson one as the reference; one loudness, one look. At the end, watch the first next to the last. |
| Bulk order | Pilot the easiest and hardest item. Every client note goes into one style sheet the rest are checked against. |
