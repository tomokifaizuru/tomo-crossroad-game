# Tomo Crossroad

**[▶ Play now](https://tomokifaizuru.github.io/tomo-crossroad-game/)** — open on phone or desktop to test the latest build.

Version: **1.21**

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
| **Play** / **Play Again** | Start a run (3-2-1-START countdown) |
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

- Title **Tomo Crossroad** · version **v1.21**
- **Player name** field (max 12 chars, saved as `tomo-crossroad-player-name`; empty → **Player**)
- **Cap Kid color** carousel — swipe or ◀ ▶ between 5 colorways (large preview + dots); persisted via `tomo-crossroad-character`
- **Play**, **Leaderboard**, and **Options** buttons
- Mute stays available in the HUD

**Options** (from main menu or pause):

- **Music track** — Eurobeat / Sky Spire / Dungeon Gate / Cloud Throne / Ivory Keep / **Custom Track** (`tomo-crossroad-bgm-track`); Preview button
- **Music volume** — 0–100 (`tomo-crossroad-volume`)
- **SFX volume** — 0–100 (`tomo-crossroad-sfx-volume`); wired to `sfxGain`
- Mute still silences everything
- **Key Mapping** — click a bind → press a key; persists as `tomo-crossroad-keymap`; **Reset controls** restores defaults
- Defaults after the v1.04 L/R invert: Left = ArrowLeft / A → **+col** (screen-left); Right = ArrowRight / D → **−col** (screen-right)
- Touch swipes use the same screen L/R invert (swipe left → screen-left)
- **Mobile buttons** (v1.21) — on-screen Left / Forward / Right; same hop mapping as keys/swipes; display:none when inactive so menu cannot steal taps

| Id | Label | Look |
|----|-------|------|
| `capkid` | **Blue** | Default blue cap / cyan shirt |
| `red` | **Red** | Coral / red colorway |
| `green` | **Green** | Mint / green colorway |
| `purple` | **Purple** | Violet colorway |
| `yellow` | **Yellow** | Gold / yellow colorway |

Same Cap Kid chibi mesh; only palette changes. Selection is saved as `tomo-crossroad-character` in localStorage.

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
  6. **Custom Track** — loops `assets/bgm-custom.mp3` via HTMLAudioElement (~82s); chiptune scheduler is skipped while this track is selected
- Chiptune tracks are **original** Web Audio compositions (sky-castle “Final Dungeon” mood — not copies of any specific piece). Changing track restarts BGM if playing; **Preview** on Options starts the selected track (including Custom).
- Music starts after **Play** or **Preview** (autoplay policy). Death **hard-cuts** BGM. Pause pauses and resumes mid-song.
- **SFX:** hop, crash, UI click, score tick, and combo — Web Audio (no extra files).
- **Mute:** HUD toggle silences **both** SFX and BGM (`tomo-crossroad-mute`).
- **Volumes:** separate Music and SFX sliders in Options.

## Files

- `index.html` — menu, name field, Leaderboard, Options, Pause, Cap Kid preview, game-over UI, HUD (score, hearts, run timer, countdown), Three.js CDN
- `style.css` — mobile-first portrait UI, menu / leaderboard / options / pause panels, medal ranks, combo flash
- `game.js` — Three.js scene, lanes, traffic, hop/collision, Cap Kid mesh + idle/hop anim, combo, remappable input, pause, online + local leaderboard, synthesized audio + Custom Track MP3
- `assets/bgm-custom.mp3` — Custom Track loop (~82s)
- `README.md` — this file

## Camera / 3D

Real **PerspectiveCamera** behind/above the player, looking forward along the hop direction (Subway Surfers vibe, slightly higher overhead since v1.05):

- Low-poly meshes for Cap Kid, cars, ground strips, and trees
- **Day / Sunset / Night** sky cycle (~30s active play per phase) with blocky sun, birds, brighter moon, stars, denser city skyline (faint by day, glowing windows at night), **street lights**, and **vehicle headlights** that sync with night ambience
- Traffic still Crossy Road–style: each **road lane** is one vehicle type (car / truck / moto); vehicles travel left↔right and **enter only from road edges** (never spawn mid-lane)
- Cap Kid richer **idle** (breathe, weight shift, arm sway, blink) and **hop** squash-stretch / limb tuck on menu and in-run

## Changelog

### v1.21
- **Invisible-menu tap steal fix** — root cause: `#overlay` without `.visible` used `pointer-events: none`, but `.panel` / buttons keep `pointer-events: auto`. In CSS, children with `auto` still receive hits when the parent is `none`, so after the menu faded out (opacity 0) Play/Options/etc. still sat over the screen on Android and stole taps from Left/GO/Right
- When `#overlay` lacks `.visible`: `visibility: hidden` + `pointer-events: none`, and **force** `#overlay:not(.visible), #overlay:not(.visible) * { pointer-events: none !important; }`; overlay `z-index: 40` (above mobile controls)
- Optional `overlay.inert = true` while hidden (via `syncTouchPad`) for supporting browsers
- `#mobileControls` when not `.active`: `display: none !important` (zero hit target during menu); when `.active`: `display: flex`, `z-index: 35` (above touchPad, below overlay)
- Hop buttons fire on **pointerup / touchend** inside button bounds (more reliable on Android than pointerdown alone); `preventDefault` on the press that fires; mapping unchanged (Left `tryHop(1,0)`, Forward `tryHop(0,1)`, Right `tryHop(-1,0)`)
- `syncTouchPad()` on every mode change (hide/show overlays, reset, countdown end, pause/resume, game over, beginPlay path)
- `#touchPad` stays secondary (`pointer-events: none` when inactive, z-index 10 — does not cover menu or sit above mobile buttons)
- Menu / Options / Pause / Leaderboard / cache-bust **v1.21**

### v1.20
- **Mobile on-screen buttons** — fixed `#mobileControls` bar at the bottom of `#app` with three large tap targets: **← Left**, **↑ GO** (forward), **Right →**
- Mapping matches keyboard/swipe (v1.04 inverted camera): Left → `tryHop(1,0)`, Forward → `tryHop(0,1)`, Right → `tryHop(-1,0)`
- Visible on touch / coarse pointer by default; hidden with `@media (hover: hover) and (pointer: fine)` (same pattern as `.mobile-only`)
- `pointerdown` / `touchstart` with `{ passive: false }` + `preventDefault` (plus `click` fallback); only hops while playing with overlay hidden (`canControl`, countdown, pause respected via `tryHop`)
- `z-index: 20` above `#touchPad`; touchPad gets a bottom inset so the bar is not covered; swipe/tap on empty area above buttons still works
- Menu hint: **Tap buttons · Left / Forward / Right**; no Down button; keyboard unchanged
- Keeps hearts, headlights, skyline, Custom Track, Android freeze / touchPad fixes
- Menu / Options / Pause / Leaderboard / cache-bust **v1.20**

### v1.19
- **Mobile tap/swipe restored** — root cause: `preventDefault()` on `pointerdown` cancelled the pointer on many Android Chrome/WebViews (`pointercancel`), clearing `gestureStart` so `pointerup` never hopped; touch fallback was skipped whenever `PointerEvent` existed
- Dedicated full-screen `#touchPad` under the HUD (`z-index: 10`, `touch-action: none`); `pointer-events: auto` only while playing with overlay hidden (`.active`)
- Register **both** Pointer and Touch listeners with ~100ms dedupe so one gesture does not double-hop
- Do **not** `preventDefault` on `pointerdown` / `touchstart`; keep scroll blocking via `touch-action: none` + `touchmove` preventDefault only during active play
- Lower `SWIPE_THRESH` to **20** for phones; HUD pause/mute stay above the pad
- Menu / options / pause: touchPad inactive; game-over backdrop tap-to-replay unchanged; keyboard + desktop click kept
- Keeps v1.18 freeze fix (no fisher call; frame loop try/catch)
- Menu / Options / Pause / Leaderboard / cache-bust **v1.19**

### v1.18
- Fix: game froze after the first hop because a removed fisher spawn call still ran and crashed the loop.
- Frame loop now catches errors so one bug cannot freeze the whole run.

### v1.17
- **Vehicle headlights** — emissive `#fff6c8` mats on car / truck / moto; intensity follows sky `lampGlow` (off by day, warm at sunset, bright at night); optional pooled SpotLights near the player
- **Richer city skyline** — wider denser layered silhouette; faintly visible in day/sunset; window emissives follow night like street lamps
- **Light-posts face the road** — arm scale flipped so lamps hang over the roadside (inward toward X=0), not outward
- **Removed straw-hat fisher NPC + Tomo Shop ads** — spawn/update/speech-bubble/ad texture/soft-blocks cleared (no mesh/timer leaks)
- **Custom Track** BGM — Options picker + Preview; loops `assets/bgm-custom.mp3`; persists as `custom` in `tomo-crossroad-bgm-track`; skips WebAudio chiptune scheduler while selected
- **Cap Kid animation** — animatable arm/leg groups; clearer idle breathe/weight-shift/arm sway; hop squash → stretch → land squash with knee tuck
- Menu / Options / Pause / Leaderboard / cache-bust **v1.17**

### v1.16
- **Vehicle facing fix** — car / truck / moto meshes are built facing **+X** only; lane direction is applied solely via `mesh.rotation.y` (`0` for +X, `Math.PI` for −X). Removes the double-mirror that made some lanes look like reversing
- **HP: 3 hearts** — HUD heart containers near score; vehicle collision loses 1 heart (shake + red flash + crash SFX + brief BGM duck); **~1.1s invulnerability** so one car cannot drain all hearts; at 0 hearts → existing game-over / leaderboard flow
- **Character select carousel** — one large Cap Kid preview at a time; swipe left/right on the stage (and ◀ ▶ / dots) cycles Blue / Red / Green / Purple / Yellow; Android-safe (carousel only while menu overlay is visible)
- Menu / Options / Pause / Leaderboard / cache-bust **v1.16**

### v1.15
- **Android controls restored** — pointer + touch listeners on `#app` play surface (not only the canvas), so HUD/overlay siblings no longer swallow hops
- Tap / swipe mapping unchanged (v1.04 inverted L/R); ignore gestures that start on buttons/inputs/panels; no steal while menu/options/pause overlay is visible
- CSS: remove global `touch-action: none`; set it only on `#app` / `#game`; UI controls use `touch-action: manipulation`
- Suppress synthetic click after pointer/touch hop (no double-hop); keyboard unchanged; `canControl` after 3-2-1-START unchanged
- Menu / Options / Pause / Leaderboard / cache-bust **v1.15**

### v1.14
- **Tomo Shop roadside ads** — after a random score threshold in **35–45**, a 3D billboard (post + double-sided board) shows `assets/tomo-shop.png`; further signs every ~25–40 crosses on grass edges (soft-block)
- **Straw-hat fisher** moves nearer the **middle** of the lane width; **reappears** every **40–60** crosses on a future grass row (mesh cleaned on despawn/respawn); speech bubbles unchanged
- **Clouds removed** from the sky cycle (sun / moon / birds / stars / skyline remain)
- **Street light-posts** along grass/road shoulders every few rows — off by day, warm at sunset, lit at night (emissive bulbs + pooled PointLights near the player)
- Menu / Options / Pause / Leaderboard / cache-bust **v1.14**

### v1.13
- **Brighter night** — deep blue-violet sky/fog, stronger hemi/ambient/moon fill + cool rim so Cap Kid and roads stay readable; larger/brighter moon; stars + skyline windows still glowy
- **Softer clouds** — overlapping semi-transparent spheres (billowy) instead of stacked cubes; faint soft wisps at night; day/sunset stay fluffy
- **5 Cap Kid colors** at start: Blue (`capkid`), Red, Green, Purple, Yellow — same mesh, distinct palettes; persisted via `tomo-crossroad-character`
- **Per-lane vehicle kind** — each road row picks car / truck / moto once for its life (mix across the world, not mixed within a lane)
- **Run timer** shows milliseconds: `m:ss.mmm` (e.g. `0:00.000`); still pauses / freezes / hides as before
- Menu / Options / Pause / Leaderboard / cache-bust **v1.13**

### v1.12
- **Sky day → sunset → night cycle** (~30s active play per phase; pause freezes the sky clock; countdown does not advance phases). Smooth ~2.5s lerp of background, fog, and lights
- Blocky sky props: sun, half-transparent clouds, bird flocks (day/sunset); glowy moon, twinkling stars, city skyline silhouette (night)
- **Start countdown** 3 → 2 → 1 → START! (~0.8s each); hops and traffic frozen until START; sky starts on Day when the run begins
- **Run progress timer** HUD `#runTimer` (`m:ss` active play time; pauses with pause; freezes on game over; resets each run)
- **Vehicle variety** on roads: cars (most common), longer **trucks** (slower), **motorcycles** (narrower/faster); hitboxes match mesh size; edge-only spawns unchanged
- **Straw-hat fisher NPC** on a safe grass row (soft-block cell) with cycling speech bubble when nearby — including *"HEY! NICE DAY FOR FISHING, AINT IT?"*
- Menu / Options / Pause / Leaderboard / cache-bust **v1.12**

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
