# Color and effects

Grades with `edit_grade`, `set_grade_parameter` and `set_grade_curve`; LUTs with `apply_lut`; masks with `edit_grade_mask`; effects with `add_effect`. When no built-in effect or transition fits, write your own GLSL (`add_custom_effect`, `add_custom_transition`) after reading the `custom_shader` guide in `timeline_catalog`.

## Start from a brief

Name the feeling in three words before touching a grade, like dusty, nostalgic, tender. Judge every move against them.

## What makes it work

A look decides how the viewer feels. Most of the time nobody should notice it; when they do, the noticing has to mean something. A loud look with nothing to say is the amateur tell: a film LUT on an interview, a glitch between two talking heads, a ramp on someone walking to a desk. An effect either disappears into the world or defines it, never the middle.

- A few confident moves beat a stack of fixes.
- Hold everything consistent, so one deliberate shift can mean something.
- Push too far, then pull back to where the image wants to sit.

## Craft

**Grade.** Balance, then match, then one look over the whole piece, then shape. Never build a look on one pretty frame; it breaks on the next twenty. Contrast before color: most color problems are contrast. Contrast carries tension; soft contrast reads as memory. Separate colors rather than saturate: warm one range, cool another. Roll off highlights and shadows softly and keep the mids where skin lives. Spend color where it matters; if everything is saturated, nothing is.

**Skin.** Faces are the anchor. Viewers forgive a wall changing between shots, never a face. If skin looks wrong, fix the balance before masking the face.

**Looks.** A look answers a story question: which world, whose memory, what changed. One palette per place or time can tell viewers where they are, quiet enough not to feel like a filter. A LUT goes on after balancing, never stacked, usually well under full strength. Teal and orange, faded matte blacks and a sepia wash on hot countries are reflexes, not choices. Grain and halation are felt, not seen; never fake scratches or burns.

**Matching.** Grade one hero shot per scene and match every shot to it, not to its neighbor: black point, white point and face brightness first, then balance. Judge it playing across the cut, not on stills.

**Masks.** A mask looks like light that was really there, shaped to the lighting, never the same oval on every shot.

**Transitions.** Cut by default. Anything else is a sentence: a dissolve says time passed, a fade to black says it ended, a match cut says these two are connected. A stylized transition works as a repeated motif built into the shot (a whip, an object wipe, a match on action), never a pack between unrelated clips. If a cut would do, cut. Often the best transition is sound arriving early.

**Effects.** A clean plate or composite matches the plate's flaws: grain, blur, black level, light direction. Grade it as one image; anything cleaner than the plate gives itself away. A shader effect is either the whole world or absent.

**Screen.** Check on a phone at mid brightness. Moody crushed shadows vanish there.
