(() => {
  "use strict";

  // ─── Config ───────────────────────────────────────────────
  const COLS = 9;
  const VIEW_ROWS = 14;
  const HOP_MS = 140;
  const PLAYER_COL_START = 4;
  const SAFE_START_ROWS = 3;
  const BEST_KEY = "tomo-crossroad-best";
  const MUTE_KEY = "tomo-crossroad-mute";

  const COLORS = {
    grassA: "#40916c",
    grassB: "#52b788",
    sidewalk: "#95d5b2",
    road: "#2b2d42",
    roadLine: "#edf2f4",
    tree: "#1b4332",
    treeTop: "#2d6a4f",
    player: "#ffe66d",
    playerEye: "#1a1a2e",
    playerShadow: "rgba(0,0,0,0.28)",
    carPalette: ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#9b5de5", "#f77f00"],
  };

  // ─── DOM ──────────────────────────────────────────────────
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const muteBtn = document.getElementById("muteBtn");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const finalScoreEl = document.getElementById("finalScore");
  const titleEl = overlay.querySelector("h1");
  const taglineEl = overlay.querySelector(".tagline");

  // ─── State ────────────────────────────────────────────────
  let W = 0, H = 0, cell = 0, dpr = 1;
  let rows = [];           // row objects from south (index 0) going north
  let player = null;
  let cameraY = 0;         // world Y of bottom of view (in row units * cell)
  let score = 0;
  let best = 0;
  let playing = false;
  let gameOver = false;
  let animId = 0;
  let lastTs = 0;
  let hopQueue = [];       // pending move directions while hopping
  let shake = 0;

  try {
    best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
  } catch (_) {
    best = 0;
  }
  updateBestHud();


  // ─── Audio (Web Audio API — no external files) ───────────
  const AudioFX = (() => {
    let ctx = null;
    let master = null;
    let sfxGain = null;
    let musicGain = null;
    let muted = false;
    let musicTimer = null;
    let musicStep = 0;
    let audioStarted = false;
    let lastScoreTick = 0;

    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch (_) {
      muted = false;
    }

    function syncMuteUi() {
      if (!muteBtn) return;
      muteBtn.textContent = muted ? "🔇" : "🔊";
      muteBtn.classList.toggle("muted", muted);
      muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      muteBtn.title = muted ? "Unmute" : "Mute";
    }

    function ensureCtx() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.55;
      sfxGain.connect(master);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.09;
      musicGain.connect(master);

      applyMuteGains();
      return ctx;
    }

    function applyMuteGains() {
      if (!master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(muted ? 0 : 1, now);
    }

    function resume() {
      const c = ensureCtx();
      if (!c) return;
      if (c.state === "suspended") c.resume();
    }

    function unlock() {
      resume();
      audioStarted = true;
      if (!muted) startMusic();
    }

    function tone(freq, dur, type, gainNode, vol, slideTo) {
      if (!ctx || muted) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo != null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(gainNode || sfxGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    function noiseBurst(dur, vol, slideDown) {
      if (!ctx || muted) return;
      const t0 = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900, t0);
      if (slideDown) {
        filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
      }
      filter.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(sfxGain);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }

    function hop() {
      if (!audioStarted || muted) return;
      resume();
      tone(520, 0.07, "square", sfxGain, 0.22);
      tone(780, 0.05, "square", sfxGain, 0.12);
    }

    function crash() {
      if (!audioStarted || muted) return;
      resume();
      noiseBurst(0.35, 0.35, true);
      tone(220, 0.4, "sawtooth", sfxGain, 0.2, 55);
      tone(110, 0.45, "triangle", sfxGain, 0.15, 40);
    }

    function uiClick() {
      if (muted) return;
      resume();
      tone(660, 0.05, "triangle", sfxGain, 0.14);
      tone(880, 0.06, "triangle", sfxGain, 0.1);
    }

    function scoreTick(score) {
      if (!audioStarted || muted) return;
      if (score <= 0 || score % 5 !== 0) return;
      if (score === lastScoreTick) return;
      lastScoreTick = score;
      resume();
      tone(440 + Math.min(score, 40) * 4, 0.06, "square", sfxGain, 0.1);
      tone(660 + Math.min(score, 40) * 3, 0.08, "triangle", sfxGain, 0.08);
    }

    // Short looping chiptune phrase (C major-ish pentatonic hop)
    const MELODY = [
      // note midi-ish freqs, duration beats
      [523.25, 1], [587.33, 1], [659.25, 1], [784.0, 1],
      [659.25, 1], [587.33, 1], [523.25, 2],
      [392.0, 1], [440.0, 1], [523.25, 1], [587.33, 1],
      [523.25, 1], [440.0, 1], [392.0, 2],
      [523.25, 1], [0, 1], [659.25, 1], [0, 1],
      [784.0, 1], [659.25, 1], [523.25, 2],
    ];
    const BEAT = 0.18; // seconds per step

    function playMusicNote(freq, beats) {
      if (!ctx || muted || !musicGain) return;
      if (!freq) return;
      const t0 = ctx.currentTime;
      const dur = beats * BEAT * 0.92;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t0);
      // soft pulse duty via gain envelope
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(musicGain);

      // quiet bass octave under melody notes
      const bass = ctx.createOscillator();
      const bg = ctx.createGain();
      bass.type = "triangle";
      bass.frequency.setValueAtTime(freq / 2, t0);
      bg.gain.setValueAtTime(0.0001, t0);
      bg.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      bass.connect(bg);
      bg.connect(musicGain);

      osc.start(t0);
      bass.start(t0);
      osc.stop(t0 + dur + 0.03);
      bass.stop(t0 + dur + 0.03);
    }

    function scheduleNextMusic() {
      if (!audioStarted || muted) return;
      const [freq, beats] = MELODY[musicStep % MELODY.length];
      musicStep++;
      playMusicNote(freq, beats);
      const delay = beats * BEAT * 1000;
      musicTimer = setTimeout(scheduleNextMusic, delay);
    }

    function startMusic() {
      if (!audioStarted || muted) return;
      ensureCtx();
      resume();
      if (musicTimer != null) return; // already looping
      musicStep = 0;
      scheduleNextMusic();
    }

    function stopMusic() {
      if (musicTimer != null) {
        clearTimeout(musicTimer);
        musicTimer = null;
      }
    }

    function setMuted(next) {
      muted = !!next;
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch (_) {}
      ensureCtx();
      applyMuteGains();
      syncMuteUi();
      if (muted) {
        stopMusic();
      } else if (audioStarted) {
        startMusic();
      }
    }

    function toggleMute() {
      setMuted(!muted);
    }

    function resetScoreTick() {
      lastScoreTick = 0;
    }

    syncMuteUi();

    return {
      unlock,
      hop,
      crash,
      uiClick,
      scoreTick,
      resetScoreTick,
      toggleMute,
      isMuted: () => muted,
      startMusic,
      stopMusic,
    };
  })();

  // ─── Resize ───────────────────────────────────────────────
  function resize() {
    const app = document.getElementById("app");
    const rect = app.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = Math.floor(rect.width);
    H = Math.floor(rect.height);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = W / COLS;
  }

  window.addEventListener("resize", () => {
    resize();
    if (!playing && !gameOver) draw();
  });
  resize();

  // ─── Row / traffic generation ─────────────────────────────
  function difficulty() {
    // 0 → 1 as score climbs; soft cap (easier ramp — 20 is reachable)
    return Math.min(1, score / 120);
  }

  function makeGrassRow(index) {
    const trees = [];
    // Block some side columns so player can't go forever sideways into void
    if (Math.random() < 0.55) {
      const count = 1 + Math.floor(Math.random() * 3);
      const used = new Set();
      for (let i = 0; i < count; i++) {
        const c = Math.floor(Math.random() * COLS);
        if (c === PLAYER_COL_START && index < SAFE_START_ROWS) continue;
        if (used.has(c)) continue;
        used.add(c);
        trees.push(c);
      }
    }
    return { type: "grass", index, trees, shade: index % 2 };
  }

  function makeRoadRow(index) {
    const d = difficulty();
    const dir = Math.random() < 0.5 ? 1 : -1;
    const speed = (0.65 + d * 1.1 + Math.random() * 0.35) * dir; // cells / sec (eased)
    const carW = 1.2 + Math.random() * 0.45; // in cells
    // denser with score: smaller gaps (wider base gaps for easier play)
    const gap = 5.2 - d * 1.0 + Math.random() * 1.0;
    const cars = [];
    // seed a few cars across the width (+ margin)
    const span = COLS + 6;
    let x = Math.random() * gap;
    while (x < span) {
      cars.push({
        x: x - 3,
        w: carW,
        color: COLORS.carPalette[Math.floor(Math.random() * COLORS.carPalette.length)],
      });
      x += carW + gap;
    }
    return { type: "road", index, dir, speed, cars, carW };
  }

  function ensureRowsAhead() {
    // player.row is world row index; keep ~ VIEW_ROWS + buffer ahead
    const needUntil = player.row + VIEW_ROWS + 8;
    while (rows.length <= needUntil) {
      const i = rows.length;
      let row;
      if (i < SAFE_START_ROWS) {
        row = makeGrassRow(i);
        row.trees = []; // clear start
      } else {
        // pattern: mix of grass / road strips
        const prev = rows[i - 1];
        if (prev.type === "road") {
          // chance to continue road strip or switch to grass
          row = Math.random() < 0.35 ? makeRoadRow(i) : makeGrassRow(i);
        } else {
          row = Math.random() < 0.45 ? makeRoadRow(i) : makeGrassRow(i);
        }
      }
      rows.push(row);
    }
  }

  // ─── Player ───────────────────────────────────────────────
  function resetGame() {
    rows = [];
    score = 0;
    scoreEl.textContent = "0";
    cameraY = 0;
    shake = 0;
    hopQueue = [];
    gameOver = false;
    playing = true;

    player = {
      col: PLAYER_COL_START,
      row: 1,
      fromCol: PLAYER_COL_START,
      fromRow: 1,
      toCol: PLAYER_COL_START,
      toRow: 1,
      hopT: 1,          // 0..1, 1 = idle
      facing: 1,        // 1 forward (up)
      maxRow: 1,
    };

    // seed enough rows
    for (let i = 0; i < VIEW_ROWS + 10; i++) {
      if (i < SAFE_START_ROWS) {
        const g = makeGrassRow(i);
        g.trees = [];
        rows.push(g);
      } else {
        rows.push(Math.random() < 0.4 ? makeRoadRow(i) : makeGrassRow(i));
      }
    }

    hideOverlay();
    lastTs = performance.now();
    cancelAnimationFrame(animId);
    loop(lastTs);
  }

  function tryHop(dx, dy) {
    if (!playing || gameOver) return;
    if (player.hopT < 1) {
      // queue one pending hop (latest wins for snappy feel)
      hopQueue = [{ dx, dy }];
      return;
    }
    doHop(dx, dy);
  }

  function doHop(dx, dy) {
    const nc = player.col + dx;
    const nr = player.row + dy;
    if (nc < 0 || nc >= COLS) return;
    if (nr < 0) return;

    ensureRowsAhead();
    const target = rows[nr];
    if (target && target.type === "grass" && target.trees.includes(nc)) {
      return; // blocked by tree
    }

    player.fromCol = player.col;
    player.fromRow = player.row;
    player.toCol = nc;
    player.toRow = nr;
    player.hopT = 0;
    player.facing = dy !== 0 ? dy : (dx || player.facing);
    hopQueue = [];
    AudioFX.hop();
  }

  function finishHop() {
    player.col = player.toCol;
    player.row = player.toRow;
    player.hopT = 1;
    if (player.row > player.maxRow) {
      player.maxRow = player.row;
      score = player.maxRow - 1;
      scoreEl.textContent = String(score);
      AudioFX.scoreTick(score);
    }
    ensureRowsAhead();
    if (hopQueue.length) {
      const next = hopQueue.shift();
      doHop(next.dx, next.dy);
    }
  }

  // ─── Collision ────────────────────────────────────────────
  function playerWorldBox() {
    // during hop, use interpolated position; collision box slightly smaller than cell
    const t = easeOutBack(Math.min(1, player.hopT));
    const c = player.fromCol + (player.toCol - player.fromCol) * t;
    const r = player.fromRow + (player.toRow - player.fromRow) * t;
    const inset = 0.22;
    return {
      x: c + inset,
      y: r + inset,
      w: 1 - inset * 2,
      h: 1 - inset * 2,
    };
  }

  function checkHit() {
    const pb = playerWorldBox();
    const row = rows[Math.round(player.fromRow + (player.toRow - player.fromRow) * Math.min(1, player.hopT))];
    // also check current integer row and destination
    const checkRows = new Set([
      player.row,
      player.toRow,
      player.fromRow,
      Math.floor(pb.y),
      Math.ceil(pb.y),
    ]);
    for (const ri of checkRows) {
      const r = rows[ri];
      if (!r || r.type !== "road") continue;
      for (const car of r.cars) {
        const cx = car.x;
        const cy = ri;
        const cw = car.w;
        const ch = 0.72;
        const padY = (1 - ch) / 2;
        if (rectsOverlap(pb.x, pb.y, pb.w, pb.h, cx, cy + padY, cw, ch)) {
          return true;
        }
      }
    }
    return false;
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    playing = false;
    shake = 10;
    AudioFX.crash();
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (_) {}
      updateBestHud();
    }
    titleEl.textContent = "Ouch!";
    taglineEl.textContent = "You got hit.";
    finalScoreEl.textContent = `Score ${score}` + (best ? ` · Best ${best}` : "");
    finalScoreEl.classList.remove("hidden");
    startBtn.textContent = "Play again";
    showOverlay();
  }

  function updateBestHud() {
    bestEl.textContent = best > 0 ? `Best ${best}` : "";
  }

  function showOverlay() {
    overlay.classList.add("visible");
  }
  function hideOverlay() {
    overlay.classList.remove("visible");
  }

  // ─── Update ───────────────────────────────────────────────
  function update(dt) {
    if (!playing) {
      if (shake > 0) shake = Math.max(0, shake - dt * 30);
      return;
    }

    // hop
    if (player.hopT < 1) {
      player.hopT = Math.min(1, player.hopT + dt / (HOP_MS / 1000));
      if (player.hopT >= 1) finishHop();
    }

    // move cars
    const d = difficulty();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.type !== "road") continue;
      // slight global speed bump with score already baked into row.speed at creation;
      // also nudge existing roads a bit
      const boost = 1 + d * 0.15;
      for (const car of row.cars) {
        car.x += row.speed * boost * dt;
      }
      // wrap cars
      const margin = 4;
      for (const car of row.cars) {
        if (row.dir > 0 && car.x > COLS + margin) {
          // find leftmost
          let minX = Infinity;
          for (const c of row.cars) minX = Math.min(minX, c.x);
          car.x = minX - car.w - (4.5 - d * 0.8 + Math.random() * 0.8);
        } else if (row.dir < 0 && car.x + car.w < -margin) {
          let maxX = -Infinity;
          for (const c of row.cars) maxX = Math.max(maxX, c.x + c.w);
          car.x = maxX + (4.5 - d * 0.8 + Math.random() * 0.8);
        }
      }
    }

    // camera: keep player ~ 35% from bottom
    const targetCam = Math.max(0, playerVisualRow() - VIEW_ROWS * 0.35);
    cameraY += (targetCam - cameraY) * Math.min(1, dt * 8);

    // cull far-behind rows? keep for simplicity (rows grow but capped usage)

    if (checkHit()) triggerGameOver();
    if (shake > 0) shake = Math.max(0, shake - dt * 30);
  }

  function playerVisualRow() {
    const t = easeOutBack(Math.min(1, player.hopT));
    return player.fromRow + (player.toRow - player.fromRow) * t;
  }
  function playerVisualCol() {
    const t = easeOutBack(Math.min(1, player.hopT));
    return player.fromCol + (player.toCol - player.fromCol) * t;
  }

  function easeOutBack(t) {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  // ─── Draw ─────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    let ox = 0, oy = 0;
    if (shake > 0) {
      ox = (Math.random() - 0.5) * shake;
      oy = (Math.random() - 0.5) * shake;
    }
    ctx.save();
    ctx.translate(ox, oy);

    const startRow = Math.max(0, Math.floor(cameraY) - 1);
    const endRow = Math.min(rows.length - 1, Math.ceil(cameraY + VIEW_ROWS) + 1);

    for (let r = startRow; r <= endRow; r++) {
      drawRow(rows[r], r);
    }

    if (player) drawPlayer();

    ctx.restore();
  }

  function rowScreenY(rowIndex) {
    // world row 0 at bottom-ish; higher rows go up the screen
    // cameraY is the world-row at the bottom of the visible band
    return H - (rowIndex - cameraY + 1) * cell;
  }

  function drawRow(row, index) {
    const y = rowScreenY(index);
    if (y + cell < -cell || y > H + cell) return;

    if (row.type === "grass") {
      ctx.fillStyle = row.shade ? COLORS.grassA : COLORS.grassB;
      ctx.fillRect(0, y, W, cell + 1);
      // sidewalk tint for starting rows
      if (index < SAFE_START_ROWS) {
        ctx.fillStyle = COLORS.sidewalk;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, y, W, cell + 1);
        ctx.globalAlpha = 1;
      }
      for (const tc of row.trees) {
        drawTree(tc * cell + cell / 2, y + cell / 2, cell);
      }
    } else {
      ctx.fillStyle = COLORS.road;
      ctx.fillRect(0, y, W, cell + 1);
      // dashed center line
      ctx.strokeStyle = COLORS.roadLine;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.setLineDash([cell * 0.25, cell * 0.2]);
      ctx.beginPath();
      ctx.moveTo(0, y + cell / 2);
      ctx.lineTo(W, y + cell / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      for (const car of row.cars) {
        drawCar(car, y, row.dir);
      }
    }
  }

  function drawTree(cx, cy, s) {
    const trunkW = s * 0.18;
    const trunkH = s * 0.28;
    ctx.fillStyle = "#6b4226";
    ctx.fillRect(cx - trunkW / 2, cy - trunkH * 0.1, trunkW, trunkH);
    ctx.fillStyle = COLORS.treeTop;
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.18, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.tree;
    ctx.beginPath();
    ctx.arc(cx - s * 0.1, cy - s * 0.22, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCar(car, rowY, dir) {
    const x = car.x * cell;
    const w = car.w * cell;
    const h = cell * 0.62;
    const y = rowY + (cell - h) / 2;
    const r = Math.min(10, h * 0.22);

    // body
    ctx.fillStyle = car.color;
    roundRect(x, y, w, h, r);
    ctx.fill();

    // cabin
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    const cabW = w * 0.38;
    const cabX = dir > 0 ? x + w * 0.45 : x + w * 0.17;
    roundRect(cabX, y + h * 0.15, cabW, h * 0.45, r * 0.6);
    ctx.fill();

    // wheels
    ctx.fillStyle = "#111";
    const wh = h * 0.18;
    const ww = w * 0.12;
    ctx.fillRect(x + w * 0.15, y + h - wh * 0.4, ww, wh);
    ctx.fillRect(x + w * 0.7, y + h - wh * 0.4, ww, wh);
    ctx.fillRect(x + w * 0.15, y - wh * 0.5, ww, wh);
    ctx.fillRect(x + w * 0.7, y - wh * 0.5, ww, wh);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPlayer() {
    const t = Math.min(1, player.hopT);
    const et = easeOutBack(t);
    const col = player.fromCol + (player.toCol - player.fromCol) * et;
    const row = player.fromRow + (player.toRow - player.fromRow) * et;
    const x = col * cell + cell / 2;
    const y = rowScreenY(row) + cell / 2;

    // hop arc
    const hopHeight = Math.sin(Math.min(1, t) * Math.PI) * cell * 0.38;
    const scale = 1 + Math.sin(Math.min(1, t) * Math.PI) * 0.08;

    // shadow
    ctx.fillStyle = COLORS.playerShadow;
    ctx.beginPath();
    ctx.ellipse(x, y + cell * 0.28, cell * 0.28 * (1 - hopHeight / (cell * 0.5) * 0.35), cell * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y - hopHeight);
    ctx.scale(scale, scale);

    // body (chick-like blob)
    const s = cell * 0.36;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();

    // belly
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.25, s * 0.55, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    ctx.fillStyle = COLORS.playerEye;
    const eyeY = -s * 0.15;
    const eyeX = s * 0.22;
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, s * 0.14, 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-eyeX - s * 0.04, eyeY - s * 0.04, s * 0.05, 0, Math.PI * 2);
    ctx.arc(eyeX - s * 0.04, eyeY - s * 0.04, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.fillStyle = "#f4a261";
    ctx.beginPath();
    ctx.moveTo(0, s * 0.05);
    ctx.lineTo(s * 0.2, s * 0.22);
    ctx.lineTo(-s * 0.2, s * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ─── Loop ─────────────────────────────────────────────────
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0.016;
    lastTs = ts;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  // idle preview before first play
  function setupPreview() {
    rows = [];
    player = {
      col: PLAYER_COL_START, row: 1,
      fromCol: PLAYER_COL_START, fromRow: 1,
      toCol: PLAYER_COL_START, toRow: 1,
      hopT: 1, facing: 1, maxRow: 1,
    };
    for (let i = 0; i < VIEW_ROWS + 6; i++) {
      if (i < SAFE_START_ROWS) {
        const g = makeGrassRow(i);
        g.trees = [];
        rows.push(g);
      } else {
        rows.push(i % 3 === 0 ? makeGrassRow(i) : makeRoadRow(i));
      }
    }
    cameraY = 0;
    playing = false;
    // animate cars in preview
    lastTs = performance.now();
    cancelAnimationFrame(animId);
    const previewLoop = (ts) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0.016;
      lastTs = ts;
      if (!playing && !gameOver) {
        for (const row of rows) {
          if (row.type !== "road") continue;
          for (const car of row.cars) {
            car.x += row.speed * dt;
            if (row.dir > 0 && car.x > COLS + 4) car.x = -car.w - 2;
            if (row.dir < 0 && car.x + car.w < -4) car.x = COLS + 2;
          }
        }
        draw();
        animId = requestAnimationFrame(previewLoop);
      }
    };
    animId = requestAnimationFrame(previewLoop);
  }

  // ─── Input: keyboard ──────────────────────────────────────
  const keyMap = {
    ArrowUp: [0, 1], KeyW: [0, 1],
    ArrowDown: [0, -1], KeyS: [0, -1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (!playing) {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        beginPlay();
      }
      return;
    }
    const m = keyMap[e.code];
    if (!m) return;
    e.preventDefault();
    tryHop(m[0], m[1]);
  });

  // ─── Input: touch ─────────────────────────────────────────
  let touchStart = null;
  const SWIPE_THRESH = 28;

  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    if (!playing) {
      touchStart = null;
      beginPlay();
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    touchStart = null;

    if (adx < SWIPE_THRESH && ady < SWIPE_THRESH) {
      tryHop(0, 1); // tap = forward
      return;
    }
    if (adx > ady) {
      tryHop(dx > 0 ? 1 : -1, 0);
    } else {
      // swipe up = forward (screen Y decreases), swipe down = back
      tryHop(0, dy < 0 ? 1 : -1);
    }
  }, { passive: true });

  // prevent scroll / pull-to-refresh on the app
  document.getElementById("app").addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, { passive: false });

  // ─── UI ───────────────────────────────────────────────────
  function beginPlay() {
    titleEl.textContent = "Tomo Crossroad";
    taglineEl.textContent = "Hop across. Don't get hit.";
    finalScoreEl.classList.add("hidden");
    startBtn.textContent = "Play";
    AudioFX.unlock();
    AudioFX.uiClick();
    AudioFX.resetScoreTick();
    resetGame();
  }

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    beginPlay();
  });

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    AudioFX.toggleMute();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === startBtn) return;
    // allow tap-outside panel on game over / start to also start
    if (overlay.classList.contains("visible")) beginPlay();
  });

  // boot
  setupPreview();
})();
