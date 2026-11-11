# Audio: buses, effects and loudness

**Mix.** Voice first and steady, then everything else around it. Place effects between lines rather than ducking hard. Keep the dynamics; platforms turn loud mixes down, so a crushed mix only sounds flatter. Play it on a phone speaker: if a line matters, it is clear there.

**Buses.** One bus per layer: dialogue, music, effects (`create_audio_bus`, then `set_audio_routing`). One fader then moves a whole layer, and one effect treats it as a whole. A shared reverb sits on its own bus, fed by sends (`create_audio_send`), never a reverb on every clip.

**Ducking.** Name the voice track as the sidechain source (`set_sidechain_source`) and put a `ducker` on the music bus. A slow release lets the music swell back between lines instead of pumping.

**Voice chain.** Gentle passes, in order: `voice_eq`, `click_remover`, `de_esser`, then a light `compressor`. Effects go on a clip, a track, a bus or the whole timeline (`add_audio_effect`); treat the layer, not each clip.

**Loudness.** Leave about 1 dB of peak headroom: a `limiter` on the main output with its ceiling at -1 dBTP. Aim for about -14 LUFS integrated for social and streaming. Broadcast and CTV: -24 LKFS in the US, -23 LUFS in Europe.
