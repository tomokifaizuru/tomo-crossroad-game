# Tomo Crossroad

A Crossy Road–style hop-across-the-road game for mobile browsers (works on desktop too). Plain HTML + CSS + vanilla JavaScript — no build step, no frameworks.

## How to run locally

From this folder:

```bash
npx serve .
```

Then open the URL it prints (usually `http://localhost:3000`).

Or open `index.html` directly in a modern browser. A local static server is preferred so mobile testing / PWA-ish behavior is smoother.

## How to play

**Goal:** Hop as far forward as you can without getting hit by a car. Score = farthest row reached.

| Input | Action |
|--------|--------|
| Tap / click | Hop forward |
| Swipe left / right / down | Hop left / right / back |
| Swipe up | Hop forward |
| Arrow keys or WASD | Move |
| Space / Enter (on menu) | Start / restart |
| **Play** button | Start / one-tap restart after game over |
| 🔊 / 🔇 HUD button | Mute / unmute (persists in localStorage) |

Cars get faster and denser as your score rises. Trees on grass lanes block hops.

## Audio

All sound is synthesized with the **Web Audio API** (oscillators / noise) — no audio files, CDNs, or downloads — so the game works from `file://` and offline.

- **SFX:** hop blip, crash (descending noise + tone), soft UI click on Play, score tick every 5 points
- **BGM:** short looping chiptune-style melody, quiet under SFX; starts only after you click **Play** (browser autoplay rules)
- **Mute:** HUD toggle; when muted, both SFX and BGM are silent; preference saved as `tomo-crossroad-mute`

## Files

- `index.html` — single playable page shell
- `style.css` — mobile-first portrait UI + HUD overlay
- `game.js` — lanes, traffic, hop/collision, input, render loop, Web Audio SFX/BGM + mute
- `README.md` — this file

## Next ideas

- Themes (night city, snow, desert) with palette swaps
- Power-ups: brief invincibility, slow-mo traffic, magnet score bonus
- Log / river lanes (Frogger mashup)
- Character skins unlockable by high score
- Soft haptic buzz on hop / crash
- Online leaderboard / share score card

## License

Made for fun. Use and remix freely.
