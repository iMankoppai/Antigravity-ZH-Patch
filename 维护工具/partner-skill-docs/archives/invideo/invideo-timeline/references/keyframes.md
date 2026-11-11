# Keyframes and motion

A move is a keyframe lane on one property (`add_keyframe_lane`, then `add_keyframes`): `opacity`, `position_x`, `position_y`, `zoom_x`, `zoom_y`, `anchor_x`, `anchor_y` and `rotation` on video; `volume` and `pan` on audio. Effect and shape settings get their own lanes (`create_effect_keyframe_lane`, `create_shape_keyframe_lane`). Shape each stretch between two keys with `set_keyframe_interpolation`: bezier handles, or `hold` for a step.

## Craft

**Easing.** Ease out on entrances, ease in on exits, exits shorter. Linear only for crawls and tickers. Functional moves take 3 to 12 frames. The most frequent animation is the quietest; only the one title that earns it gets to be slow.

**Overlap.** Elements of one group start a few frames apart, so they move as one gesture, not a queue. The next move starts before the last one has fully landed.

**Settle.** Every move lands and rests. Nothing drifts under words being read.

**Scale.** Keep `zoom_x` and `zoom_y` equal; unequal values add bars or crop, never stretch. A push-in is a zoom lane, slow and eased, ending on the thing it points at.

**Position and anchor.** Position is canvas pixels from the center. Set the anchor where the object should pivot before you scale or rotate it.

**Speed.** A ramp exists to show one frame: slow into the impact or reveal, release just after. Ease every keyframe, never linear. Land it on a sound hit; retiming silences the clip's own sound, so music or a designed hit carries it. Slow what the eye can't follow, speed up what is already clear. If everything ramps, nothing does.

`retime` holds speed: `ramp` from one speed to another with an easing shape, `section` for one speed over a range, `freeze` to hold a frame, `points` for a whole speed map.
