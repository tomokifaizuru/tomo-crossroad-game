# Tomo Crossroad

Version: **1.11**

A Crossy Road–style hop-across-the-road game with **real Three.js 3D**. Mobile browsers (desktop too). Plain HTML + CSS + vanilla JavaScript + Three.js via CDN — **no build step**, no frameworks.

## How to run locally

From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Or:

```bash
npx serve .
```

You can also open `index.html` directly via `file://`. Three.js is loaded from a CDN script tag (UMD r128), so double-click works when you have network access. Gameplay and synthesized music need no extra audio files.

> **Note:** Offline `file://` without CDN cache will show a blank canvas until Three.js loads. A tiny local server is still the most reliable option for GitHub Pages–style testing.

## How to play

**Goal:** Hop as far forward as you can without getting hit by a car. Score = farthest row reached.

| Input | Action |
|--------|--------|
| Tap / click (in game) | Hop forward |
| Swipe left / right / down | Hop left / right / back |
| Swipe up | Hop forward |
| Arrow keys or WASD | Move (remappable in Options) |
| **Esc** (during play) | Pause / resume |
| Space / Enter (on menu or game over) | Start / play again |
| **Play** / **Play Again** | Start a run |
| **Options** | Music + SFX volume + key mapping |
| **Back to Menu** | Return to menu after game over |
| ⏸ HUD button | Pause (during gameplay) |
| 🔊 / 🔇 HUD button | Mute / unmute (persists in localStorage) |

Cars get faster and denser as your score rises. A minority of lanes run a bit quicker. Trees on grass lanes block hops.

## Pause

During a run, **Pause** (HUD ⏸ or **Esc**) freezes cars, hops, and score. A **Paused** overlay offers:

- **Resume** — continue (music resumes from the same place)
- **Options** — same Options panel; Back returns to Pause
- **Quit to Menu** — end the run and return to the main menu

## Main menu & Options

Before each run you get a **main menu** with:

- Title **Tomo Crossroad** · version **v1.11**
- **Player name** field (max 12 chars, saved as `tomo-crossroad-player-name`; empty → **Player**)
- **Cap Kid** preview (gentle idle bob / breathe)
- **Play**, **Leaderboard**, and **Options** buttons
- Mute stays available in the HUD

**Options** (from main menu or pause):

- **Music track** — Eurobeat / Sky Spire / Dungeon Gate / Cloud Throne / Ivory Keep (`tomo-crossroad-bgm-track`); Preview button
- **Music volume** — 0–100 (`tomo-crossroad-volume`)
- **SFX volume** — 0–100 (`tomo-crossroad-sfx-volume`); wired to `sfxGain`
- Mute still silences everything
- **Key Mapping** — click a bind → press a key; persists as `tomo-crossroad-keymap`; **Reset controls** restores defaults
- Defaults after the v1.04 L/R invert: Left = ArrowLeft / A → **+col** (screen-left); Right = ArrowRight / D → **−col** (screen-right)
- Touch swipes use the same screen L/R invert (swipe left → screen-left)

| Character | Vibe | Look |
|-----------|------|------|
| **Cap Kid** | Cute mini chibi | Big head, small body, signature **blue cap** |

(Selection is saved as `tomo-crossroad-character` in localStorage.)

After game over you see your score (and combo if any), your **best + rank** for that name, a **New best! Rank #N** flash when you improve, then **Play Again**, **Leaderboard**, or **Back to Menu**.

## Leaderboard (online + local cache)

Shared global board via **HighScore API** (HTTPS). GitHub Pages players share one board. The client key is exposed in the browser (normal for casual web games; cheating is possible).

- On **personal best improved**, the game POSTs the score online (fire-and-forget; does not block game over)
- Opening **Leaderboard** fetches the online list first; on success it renders that list and writes it into localStorage as cache
- Offline / fetch failure: shows the cached local list plus a status line (`Offline · local only` or `Couldn't reach online board`); success shows `Online · synced`
- Local key `tomo-crossroad-leaderboard` — JSON `[{name, score, updatedAt}]`, one entry per name (case-insensitive); still updated only on improved personal best
- Top 3 tinted **Gold / Silver / Bronze** (`.rank-1` / `.rank-2` / `.rank-3`)
- Cap ~20 names on the panel; HUD `tomo-crossroad-best` stays in sync with the current player's best

## Combo milestones

Every **50** points (50, 100, 150, 200, …):

- Big on-screen celebration: **COMBO x1**, **COMBO x2**, … where `x = score / 50`
- Short flash/pulse animation + combo SFX
- A small **COMBO xN** HUD chip stays visible for the rest of the run once the first milestone hits

## Audio

- **BGM tracks** (Options → Music track, saved as `tomo-crossroad-bgm-track`):
  1. **Eurobeat** — racing chiptune (~168 BPM, ~60s loop; intro → A → B → chorus → bridge → seam)
  2. **Sky Spire** — soaring ascending arps, hope under tension (~126 BPM, ~61s); pulse + triangle + sawtooth arp (VRC6-ish)
  3. **Dungeon Gate** — darker heavier bass, slow ominous pulse (~96 BPM, ~60s); final-boss foyer mood
  4. **Cloud Throne** — mid-tempo march / eurobeat×dungeon hybrid (~140 BPM, ~62s)
  5. **Ivory Keep** — haunted majestic castle ascent (~152 BPM, ~60s); fuller non-chiptune mix — sine pads, warm saw leads, delayed echoes, rounded kicks (tempo matched to Tower of Dreams pace)
- All tracks are **original** Web Audio compositions (sky-castle “Final Dungeon” mood — not copies of any specific piece). Changing track restarts BGM if playing; **Preview** on Options starts the selected track.
- Music starts after **Play** or **Preview** (autoplay policy). Death **hard-cuts** BGM. Pause pauses and resumes mid-song.
- **SFX:** hop, crash, UI click, score tick, and combo — Web Audio (no extra files).
- **Mute:** HUD toggle silences **both** SFX and BGM (`tomo-crossroad-mute`).
- **Volumes:** separate Music and SFX sliders in Options.

## Files

- `index.html` — menu, name field, Leaderboard, Options, Pause, Cap Kid preview, game-over UI, HUD, Three.js CDN
- `style.css` — mobile-first portrait UI, menu / leaderboard / options / pause panels, medal ranks, combo flash
- `game.js` — Three.js scene, lanes, traffic, hop/collision, Cap Kid mesh + idle, combo, remappable input, pause, online + local leaderboard, synthesized audio
- `README.md` — this file

## Camera / 3D

Real **PerspectiveCamera** behind/above the player, looking forward along the hop direction (Subway Surfers vibe, slightly higher overhead since v1.05):

- Low-poly meshes for Cap Kid, cars, ground strips, and trees
- Warm **sunset** sky, fog, and lighting (orange / pink / purple mood)
- Traffic still Crossy Road–style: cars travel left↔right and **enter only from road edges** (never spawn mid-lane)
- Cap Kid gentle **idle** (bob / breathe / sway / blink) on menu and when not hopping

## Changelog

### v1.11
- **Online shared leaderboard** — HighScore API sync (HTTPS); POST on improved personal best; fetch on Leaderboard open
- localStorage board kept as **offline cache / fallback** with status line (`Online · synced` / `Offline · local only` / unreachable)
- Leaderboard subtitle: best scores from all players (online); gold/silver/bronze ranks unchanged
- Menu / Options / Pause / Leaderboard / cache-bust **v1.11**

### v1.10
- **Local best-score leaderboard** — one entry per player name; store only each name's best (`tomo-crossroad-leaderboard`); update on improved ranking only
- Main menu **player name** field + **Leaderboard** button; leaderboard overlay with Gold/Silver/Bronze top 3
- Game over: **New best! Rank #N** flash, best + rank line, optional Leaderboard button
- Persist name as `tomo-crossroad-player-name`; keep HUD / `tomo-crossroad-best` in sync with current player's best
- Menu / Options / Pause / Leaderboard / cache-bust **v1.10**

### v1.09
- Remix **Ivory Keep** BGM: tempo matched to Tower of Dreams pace (~152 BPM, 38 bars ≈ 60s); fuller non-chiptune mix (sine pads, long triangle sustains, warm saw leads, delayed octave/fifth echoes, rounded sine kicks + soft noise hats)
- Keep identity: dreamy/majestic minor–soft Dorian castle ascent; intro → build → peak → soft seam loop
- Menu / Options / Pause / cache-bust **v1.09**

### v1.08
- Add original chiptune BGM **Ivory Keep** (~112 BPM, ~60s loop): haunted majestic castle ascent — sparse echoing pulse leads, rising arps under square/saw, deep triangle bass, NES-like noise hats
- Options track list now: Eurobeat + 4 sky-castle tracks (Sky Spire, Dungeon Gate, Cloud Throne, Ivory Keep)
- Menu / Options / Pause / cache-bust **v1.08**

### v1.07
- **4 BGM tracks:** keep Eurobeat; add original chiptune **Sky Spire**, **Dungeon Gate**, **Cloud Throne** (sky-castle / Final Dungeon mood, VRC6+MMC5-inspired palette via Web Audio)
- Options **Music track** picker + Preview; persists `tomo-crossroad-bgm-track`; changing track restarts if playing
- AudioFX music scheduler refactored for multiple song definitions; pause/resume + death hard-cut unchanged
- Menu / Options / Pause / cache-bust **v1.07**

### v1.06
- **Pause** during gameplay (HUD ⏸ + Esc) with Resume / Options / Quit to Menu; freezes sim; BGM pauses and resumes mid-song
- Separate **Music volume** + **SFX volume** sliders (`tomo-crossroad-volume`, `tomo-crossroad-sfx-volume`); mute still silences all
- BGM expanded to a proper **~1 minute** eurobeat chiptune loop (intro → A → B → chorus → bridge → seamless loop); death still hard-cuts
- Menu / Options / Pause / cache-bust **v1.06**

### v1.05
- Chase camera raised (`CAM_HEIGHT` 6.2 → 7.6) with a slight `CAM_BACK` / lookAt tweak for a bit more overhead framing
- On car hit: Cap Kid **fades out** (~0.55s), camera shake intensifies, BGM **hard-cuts** (hit SFX still plays)
- BGM rewritten as **eurobeat / racing chiptune** (~168 BPM, 16ths, punchy bass + square lead, noise hats)
- Menu / Options / cache-bust **v1.05**

### v1.04
- **Inverted horizontal hop deltas** so Left / swipe-left moves toward the **left side of the screen** (v1.03 only fixed facing yaw)
  - Defaults: ArrowLeft/KeyA → `[1, 0]`, ArrowRight/KeyD → `[-1, 0]`; swipe left → `tryHop(1,0)`, swipe right → `tryHop(-1,0)`
  - `colToX` unchanged (camera looks +Z → world +X is already screen-left)
- Main menu: **Play** + **Options** (volume slider + remappable keys, both in localStorage)
- Cap Kid idle animation (3D + 2D menu preview)

### v1.03
- Fixed left/right hop feel after playtest: corrected horizontal facing yaw and idle spin after left hop (Left/A/swipe-left → screen-left)
- Single playable character: **Cap Kid** mini chibi with blue cap (Speed/Beast select removed)
- Sunset mood sky, fog, and warmer lights
- Cars spawn / respawn only from off-screen left or right edges (no mid-road pops)
- Minority of road lanes get a mild speed bump (~15–30%)

### v1.02
- Replaced canvas 2D fake-perspective renderer with **Three.js** WebGL 3D
- Same gameplay, menu, audio, combo, and controls as v1.01

### v1.01
- Main menu, Speed/Beast select, combo milestones, chiptune BGM, Subway Surfers–style 2D perspective

## License

Made for fun. Use and remix freely.
