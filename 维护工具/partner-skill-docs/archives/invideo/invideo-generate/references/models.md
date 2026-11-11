# Models

`get_model` has each model's inputs, durations and price. These notes cover the rest.

## Picking a model

Search by name or kind (`invideo gen models --query "text to speech"` / `find_models`); "voice over narration" finds nothing. List every model before saying one is missing.

Unless the person names a model:

- Text in the image, multilingual or non-Latin type, UI mockups, infographics, surgical edits: the latest GPT Image model, with `reasoning_effort` at `high`.
- Photoreal or cinematic stills, several characters locked across frames: `nanobanana_pro`.
- Editable vector, icons, brand systems: Recraft (`recraft_v41.*`, text to vector).
- Video from references, with sound in the same pass: Seedance (`seedance_2_5.*`). Use `.frames` for known start/end frames, `.r2v` for references, `.edit` for one change, `.extend` to continue.
- Voice-over: the latest ElevenLabs text to speech; text to dialogue for two to four speakers.
- Sound effects: `elevenlabs_sfx`.
- Music: the latest ElevenLabs Music, instrumental under a voice.
- 3D object: `meshy.multi_image_to_3d`, two to four photos, front first.

- A model the person picks stays for the rest of that piece.
- If a retry fails, fix the prompt, references or tier on the same model. A model you switch to may lack the strength you picked the first one for.

## Staging a shot

- Seedance `.extend` continues the clip it is given, so describe a natural continuation rather than a new event. `get_model` has each version's reference counts and durations.
- Keep a video shot to two resolved faces and stage crowds as silhouettes; identities stay distinct.
- Keep an image to three distinct subjects; split the frame for more.
- Keep moving text and logos large. For small text, render it on a still and pass it as `first_frame`.
- Judge a prompt over several rolls and change one variable at a time.

## Prompting

- Seedance: for a simple ask, send subject, one action and one style anchor. A long structured prompt makes a simple ask worse, and past about 150 words Seedance drops instructions.
- Attachment order is binding: the Nth image is `@ImageN` (also `@VideoN`, `@AudioN`). A mismatch gives you the wrong video, with no error. Give each reference one job and one named token.
- Keep camera motion separate from subject motion ("the dancer spins, camera holds fixed"). Use one camera move per shot. Stacked moves cause jitter.
- Leave out "fast" because it costs coherence; describe the physics instead. For slow motion, write `recorded at 240fps, played back at 24fps`.
- `[MM:SS – MM:SS]` brackets create hard cuts. Seedance cuts between angles unless told `one continuous shot, no cuts`.
- Frames mode bridging two frames: write `Show what happens in between`, then give an explicit angle count (3 for ~5s, 4-5 for ~10s).
- Add a lighting line if the ask has none. Close with a `Preserve:` line naming the identity, product and composition to hold; it keeps them from drifting.
- Put dialogue in double quotes (that's the lip-sync signal) and keep each line under about 12 words. Name what's heard in the last seconds, or long clips trail into silence.
- Turn `generate_audio` off when the clip will sit under your own voiceover or music, because the native audio bleeds through.
- For identity references, use front plus left and right three-quarter views, 1024px or more on the short edge, with the face filling 30-50% of the frame. Vary light and expression; drop shots with sunglasses, hats, filters or another person. Six strong refs beat fourteen mixed ones. Re-attach them on every generation; models have no memory between calls.
- Image edits: attach only the image being changed and write "Change X, keep everything else the same".
- Phrase image prompts positively ("empty street", not "no cars") on every model. Unnamed surfaces get invented text, so ban text explicitly when you don't want it.
- Exact text: put it in quotes, give it a role (headline, label, UI), and add "Render verbatim. No extra words."
