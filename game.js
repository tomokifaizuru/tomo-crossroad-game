(() => {
  "use strict";

  if (typeof THREE === "undefined") {
    console.error("Three.js failed to load. Check CDN / network.");
    const overlay = document.getElementById("overlay");
    if (overlay) {
      const p = document.createElement("p");
      p.style.cssText = "color:#ffe66d;margin-top:12px;font-size:13px;";
      p.textContent = "3D engine failed to load (CDN). Use a network connection or local server.";
      const panel = document.getElementById("menuPanel");
      if (panel) panel.appendChild(p);
    }
    return;
  }

  // ─── Config ───────────────────────────────────────────────
  const COLS = 9;
  const VIEW_ROWS = 16;
  const HOP_MS = 140;
  const PLAYER_COL_START = 4;
  const SAFE_START_ROWS = 3;
  const BEST_KEY = "tomo-crossroad-best";
  const LEADERBOARD_KEY = "tomo-crossroad-leaderboard";
  const PLAYER_NAME_KEY = "tomo-crossroad-player-name";
  const LEADERBOARD_CAP = 20;
  const PLAYER_NAME_MAX = 12;
  const ONLINE_LB_BASE = "https://api-leaderboard.qulyubis.biz.id";
  const ONLINE_LB_API_KEY = "game_191J_kSKtwYbVVUlCLxoK3aUuFhWf-Bu4wl92x_zdBA";
  const ONLINE_LB_GAME_ID = 17;
  const MUTE_KEY = "tomo-crossroad-mute";
  const CHAR_KEY = "tomo-crossroad-character";
  const VOLUME_KEY = "tomo-crossroad-volume"; // music volume 0–100
  const SFX_VOLUME_KEY = "tomo-crossroad-sfx-volume";
  const KEYMAP_KEY = "tomo-crossroad-keymap";
  const BGM_TRACK_KEY = "tomo-crossroad-bgm-track";
  const COMBO_STEP = 50;
  const BGM_VOLUME = 0.22;
  const SFX_GAIN_BASE = 0.55;
  const CELL = 1;
  const CAM_HEIGHT = 7.6;
  const CAM_BACK = 7.0;
  const CAM_LOOK_AHEAD = 4.2;
  const CAM_LERP = 10;
  const CAM_LOOK_Y = 0.35;
  const DEATH_FADE_SEC = 0.55;

  const CHARACTERS = {
    capkid: {
      id: "capkid",
      label: "Blue",
      body: "#ffdbac",
      accent: "#2e86ff",
      belly: "#7ad7ff",
      hair: "#5d3a1a",
      eye: "#ffffff",
      pupil: "#1a1a1a",
      detail: "#1e6fe0",
      shirt: "#33ccff",
      pants: "#1a237e",
      shoes: "#333333",
      cap: "#2e86ff",
      capBill: "#1e6fe0",
    },
    red: {
      id: "red",
      label: "Red",
      body: "#ffb4a2",
      accent: "#ef476f",
      belly: "#ffe0e6",
      hair: "#5c4033",
      eye: "#ffffff",
      pupil: "#2b2d42",
      detail: "#c9184a",
      shirt: "#ff6b6b",
      pants: "#c1121f",
      shoes: "#2b2d42",
      cap: "#ef476f",
      capBill: "#b5172a",
    },
    green: {
      id: "green",
      label: "Green",
      body: "#ffb4a2",
      accent: "#06d6a0",
      belly: "#e0fff4",
      hair: "#5c4033",
      eye: "#ffffff",
      pupil: "#2b2d42",
      detail: "#0aad7a",
      shirt: "#80ed99",
      pants: "#2d6a4f",
      shoes: "#2b2d42",
      cap: "#06d6a0",
      capBill: "#04966f",
    },
    purple: {
      id: "purple",
      label: "Purple",
      body: "#ffb4a2",
      accent: "#9b5de5",
      belly: "#f3e8ff",
      hair: "#5c4033",
      eye: "#ffffff",
      pupil: "#2b2d42",
      detail: "#7b2cbf",
      shirt: "#c77dff",
      pants: "#5a189a",
      shoes: "#2b2d42",
      cap: "#9b5de5",
      capBill: "#7b2cbf",
    },
    yellow: {
      id: "yellow",
      label: "Yellow",
      body: "#ffb4a2",
      accent: "#ffd166",
      belly: "#fff6d9",
      hair: "#5c4033",
      eye: "#ffffff",
      pupil: "#2b2d42",
      detail: "#e09f3e",
      shirt: "#ffe66d",
      pants: "#bc6c25",
      shoes: "#2b2d42",
      cap: "#ffd166",
      capBill: "#e09f3e",
    },
  };

  const COLORS = {
    grassA: "#3d7a5c",
    grassB: "#4a946e",
    sidewalk: "#8bc4a0",
    road: "#2b2d42",
    roadLine: "#edf2f4",
    tree: "#1b4332",
    treeTop: "#2d6a4f",
    trunk: "#704522",
    carPalette: ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#9b5de5", "#f77f00"],
    sky: "#ff8c5a",
    skyFog: "#c97b9a",
    ground: "#4f8a5e",
  };

  // Action deltas. Camera looks +Z → world +X is screen-left.
  // v1.04 inverted L/R per user report (v1.03 only fixed facing yaw; deltas stayed wrong).
  const ACTION_DELTAS = {
    up: [0, 1],
    down: [0, -1],
    left: [1, 0],   // ArrowLeft / KeyA → +col → screen-left
    right: [-1, 0], // ArrowRight / KeyD → -col → screen-right
    upAlt: [0, 1],
    downAlt: [0, -1],
    leftAlt: [1, 0],
    rightAlt: [-1, 0],
  };

  const DEFAULT_KEY_BINDS = {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    upAlt: "KeyW",
    downAlt: "KeyS",
    leftAlt: "KeyA",
    rightAlt: "KeyD",
  };

  // ─── DOM ──────────────────────────────────────────────────
  const canvas = document.getElementById("game");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const muteBtn = document.getElementById("muteBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const menuPanel = document.getElementById("menuPanel");
  const optionsPanel = document.getElementById("optionsPanel");
  const pausePanel = document.getElementById("pausePanel");
  const gameOverPanel = document.getElementById("gameOverPanel");
  const startBtn = document.getElementById("startBtn");
  const optionsBtn = document.getElementById("optionsBtn");
  const optionsBackBtn = document.getElementById("optionsBackBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const pauseOptionsBtn = document.getElementById("pauseOptionsBtn");
  const quitMenuBtn = document.getElementById("quitMenuBtn");
  const againBtn = document.getElementById("againBtn");
  const menuBtn = document.getElementById("menuBtn");
  const finalScoreEl = document.getElementById("finalScore");
  const goTitle = document.getElementById("goTitle");
  const goTagline = document.getElementById("goTagline");
  const leaderboardPanel = document.getElementById("leaderboardPanel");
  const leaderboardBtn = document.getElementById("leaderboardBtn");
  const leaderboardBackBtn = document.getElementById("leaderboardBackBtn");
  const goLeaderboardBtn = document.getElementById("goLeaderboardBtn");
  const leaderboardList = document.getElementById("leaderboardList");
  const leaderboardEmpty = document.getElementById("leaderboardEmpty");
  const leaderboardStatus = document.getElementById("leaderboardStatus");
  const playerNameInput = document.getElementById("playerNameInput");
  const newBestFlash = document.getElementById("newBestFlash");
  const goRankLine = document.getElementById("goRankLine");
  const comboHud = document.getElementById("comboHud");
  const comboFlash = document.getElementById("comboFlash");
  const comboFlashText = document.getElementById("comboFlashText");
  const countdownEl = document.getElementById("countdown");
  const countdownText = document.getElementById("countdownText");
  const runTimerEl = document.getElementById("runTimer");
  const charSelectEl = document.getElementById("charSelect");
  const charCarouselEl = document.getElementById("charCarousel");
  const charStageEl = document.getElementById("charStage");
  const charPreviewCanvas = document.getElementById("charPreviewCanvas");
  const charNameLabel = document.getElementById("charNameLabel");
  const charPrevBtn = document.getElementById("charPrevBtn");
  const charNextBtn = document.getElementById("charNextBtn");
  const charDots = Array.from(document.querySelectorAll(".char-dot"));
  const heartsEl = document.getElementById("hearts");
  const hitFlashEl = document.getElementById("hitFlash");
  const CHAR_ORDER = ["capkid", "red", "green", "purple", "yellow"];
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const sfxVolumeSlider = document.getElementById("sfxVolumeSlider");
  const sfxVolumeValue = document.getElementById("sfxVolumeValue");
  const resetControlsBtn = document.getElementById("resetControlsBtn");
  const trackPicker = document.getElementById("trackPicker");
  const trackBtns = trackPicker ? Array.from(trackPicker.querySelectorAll(".track-btn")) : [];
  const previewBgmBtn = document.getElementById("previewBgmBtn");
  const remapHint = document.getElementById("remapHint");
  const keymapRows = Array.from(document.querySelectorAll(".keymap-row"));

  // ─── State ────────────────────────────────────────────────
  let W = 0, H = 0;
  let rows = [];
  let player = null;
  let cameraZ = 0;
  let cameraX = 0;
  let score = 0;
  let best = 0;
  let playing = false;
  let paused = false;
  let optionsReturnMode = "menu"; // "menu" | "pause"
  let leaderboardReturnMode = "menu"; // "menu" | "gameover"
  let playerName = "Player";
  let gameOver = false;
  let animId = 0;
  let lastTs = 0;
  let hopQueue = [];
  let shake = 0;
  let hearts = 3;
  const MAX_HEARTS = 3;
  const HIT_INVULN_SEC = 1.1;
  let invulnTimer = 0; // seconds remaining; skip checkHit damage while > 0
  let hitFlashTimer = 0;
  let deathFade = 0; // 0 = idle; else elapsed seconds since hit
  let deathOverlayTimer = 0;
  let playerFadeMats = [];
  let comboLevel = 0;
  let lastComboMilestone = 0;
  let comboFlashTimer = 0;
  let selectedChar = "capkid";
  let idleTime = 0;
  let remappingAction = null;
  let musicVolume = 100;
  let sfxVolume = 100;
  let bgmTrack = "eurobeat";
  let keyBinds = Object.assign({}, DEFAULT_KEY_BINDS);
  let keyMap = {};
  let previewIdleRaf = 0;
  let countdownActive = false;
  let canControl = false;
  let runTimeSec = 0;
  let runTimerFrozen = false;
  let skyPhaseIndex = 0; // 0 day, 1 sunset, 2 night
  let skyPhaseAge = 0;
  let skyBlend = 1; // 1 = fully in current phase
  let skyBlendFrom = 0;
  let skyBlendTo = 0;
  let skyClockRunning = false;
  let countdownQueue = null;
  let countdownStepTimer = 0;
  const SKY_PHASE_SEC = 30;
  const SKY_LERP_SEC = 2.5;
  const COUNTDOWN_STEP_SEC = 0.8;

  try {
    best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
  } catch (_) {
    best = 0;
  }
  try {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY);
    if (savedName && typeof savedName === "string") {
      playerName = sanitizePlayerName(savedName);
    }
  } catch (_) {}
  try {
    const saved = localStorage.getItem(CHAR_KEY);
    if (saved && CHARACTERS[saved]) selectedChar = saved;
    else selectedChar = "capkid";
  } catch (_) {
    selectedChar = "capkid";
  }
  try {
    const v = parseInt(localStorage.getItem(VOLUME_KEY) || "100", 10);
    musicVolume = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100;
  } catch (_) {
    musicVolume = 100;
  }
  try {
    const v = parseInt(localStorage.getItem(SFX_VOLUME_KEY) || "100", 10);
    sfxVolume = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100;
  } catch (_) {
    sfxVolume = 100;
  }
  try {
    const t = localStorage.getItem(BGM_TRACK_KEY);
    if (t && ["eurobeat", "skyspire", "dungeongate", "cloudthrone", "ivorykeep", "custom"].includes(t)) bgmTrack = t;
  } catch (_) {}
  try {
    const raw = localStorage.getItem(KEYMAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.keys(DEFAULT_KEY_BINDS).forEach((k) => {
          if (typeof parsed[k] === "string") keyBinds[k] = parsed[k];
        });
      }
    }
  } catch (_) {}

  function rebuildKeyMap() {
    keyMap = {};
    Object.keys(keyBinds).forEach((action) => {
      const code = keyBinds[action];
      const delta = ACTION_DELTAS[action];
      if (code && delta) keyMap[code] = delta;
    });
  }
  rebuildKeyMap();

  function saveKeyBinds() {
    try {
      localStorage.setItem(KEYMAP_KEY, JSON.stringify(keyBinds));
    } catch (_) {}
  }

  function prettyKeyCode(code) {
    if (!code) return "—";
    if (code.startsWith("Key") && code.length === 4) return code.slice(3);
    if (code.startsWith("Arrow")) return code.replace("Arrow", "");
    if (code.startsWith("Digit")) return code.slice(5);
    return code;
  }

  function syncKeymapUi() {
    keymapRows.forEach((row) => {
      const action = row.getAttribute("data-action");
      const span = row.querySelector(".keymap-key");
      if (!span || !action) return;
      span.textContent = prettyKeyCode(keyBinds[action]);
      row.classList.toggle("listening", remappingAction === action);
    });
    if (remapHint) {
      if (remappingAction) {
        remapHint.classList.remove("hidden");
        remapHint.textContent = "Press a key…";
      } else {
        remapHint.classList.add("hidden");
      }
    }
  }

  function startRemap(action) {
    remappingAction = action;
    syncKeymapUi();
  }

  function cancelRemap() {
    remappingAction = null;
    syncKeymapUi();
  }

  function applyRemap(code) {
    if (!remappingAction) return;
    const action = remappingAction;
    // Avoid duplicate codes: clear other actions that used this code
    Object.keys(keyBinds).forEach((a) => {
      if (a !== action && keyBinds[a] === code) keyBinds[a] = "";
    });
    keyBinds[action] = code;
    remappingAction = null;
    rebuildKeyMap();
    saveKeyBinds();
    syncKeymapUi();
    AudioFX.uiClick();
  }

  function resetControls() {
    keyBinds = Object.assign({}, DEFAULT_KEY_BINDS);
    remappingAction = null;
    rebuildKeyMap();
    saveKeyBinds();
    syncKeymapUi();
  }

  // ─── Three.js scene ───────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(COLORS.sky, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.skyFog, 14, 38);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);

  const hemi = new THREE.HemisphereLight(0xffb088, 0x5a3d6e, 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a5c, 1.05);
  sun.position.set(10, 10, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xffc9a8, 0.32);
  scene.add(ambient);
  const rim = new THREE.DirectionalLight(0xb56bff, 0.28);
  rim.position.set(-6, 6, -4);
  scene.add(rim);

  // ─── Sky cycle palettes & soft sky props (v1.17) ───────────
  const SKY_PALETTES = [
    {
      id: "day",
      sky: "#87CEEB",
      fog: "#b8d4e8",
      hemiSky: "#fff1c8",
      hemiGround: "#6a9e70",
      hemiInt: 0.88,
      sunColor: "#fff0b0",
      sunInt: 1.2,
      ambientColor: "#e8f4ff",
      ambientInt: 0.48,
      rimColor: "#9ec9ff",
      rimInt: 0.22,
      cloudTint: "#ffffff",
      cloudOp: 0.45,
      lampGlow: 0,
      sunMeshY: 14,
      sunMeshScale: 1,
      sunVisible: 1,
      moonVisible: 0,
      birdsVisible: 1,
      starsVisible: 0,
      skylineVisible: 0.32,
    },
    {
      id: "sunset",
      sky: "#ff8c5a",
      fog: "#c97b9a",
      hemiSky: "#ffb088",
      hemiGround: "#5a3d6e",
      hemiInt: 0.72,
      sunColor: "#ff9a5c",
      sunInt: 1.05,
      ambientColor: "#ffc9a8",
      ambientInt: 0.32,
      rimColor: "#b56bff",
      rimInt: 0.3,
      cloudTint: "#ffd0b8",
      cloudOp: 0.5,
      lampGlow: 0.28,
      sunMeshY: 3.2,
      sunMeshScale: 1.35,
      sunVisible: 1,
      moonVisible: 0,
      birdsVisible: 1,
      starsVisible: 0.15,
      skylineVisible: 0.55,
    },
    {
      id: "night",
      sky: "#1e3260",
      fog: "#2a3f70",
      hemiSky: "#6a82c0",
      hemiGround: "#243048",
      hemiInt: 0.62,
      sunColor: "#c8d4ff",
      sunInt: 0.48,
      ambientColor: "#4a5e90",
      ambientInt: 0.4,
      rimColor: "#8b7cff",
      rimInt: 0.38,
      cloudTint: "#d8e0f5",
      cloudOp: 0.1,
      lampGlow: 1,
      sunMeshY: -2,
      sunMeshScale: 0.6,
      sunVisible: 0,
      moonVisible: 1,
      birdsVisible: 0,
      starsVisible: 1,
      skylineVisible: 1,
    },
  ];

  const _tmpColA = new THREE.Color();
  const _tmpColB = new THREE.Color();
  const _tmpColC = new THREE.Color();

  function lerpHex(a, b, t, out) {
    _tmpColA.set(a);
    _tmpColB.set(b);
    out.copy(_tmpColA).lerp(_tmpColB, t);
    return out;
  }

  function lerpNum(a, b, t) {
    return a + (b - a) * t;
  }

  function sampleSkyPalette(fromIdx, toIdx, t) {
    const A = SKY_PALETTES[fromIdx];
    const B = SKY_PALETTES[toIdx];
    const out = {};
    const colorKeys = [
      "sky", "fog", "hemiSky", "hemiGround", "sunColor",
      "ambientColor", "rimColor", "cloudTint",
    ];
    for (const k of colorKeys) {
      out[k] = "#" + lerpHex(A[k], B[k], t, _tmpColC).getHexString();
    }
    const numKeys = [
      "hemiInt", "sunInt", "ambientInt", "rimInt", "cloudOp", "lampGlow",
      "sunMeshY", "sunMeshScale", "sunVisible", "moonVisible",
      "birdsVisible", "starsVisible", "skylineVisible",
    ];
    for (const k of numKeys) out[k] = lerpNum(A[k], B[k], t);
    return out;
  }

  const skyRoot = new THREE.Group();
  scene.add(skyRoot);
  let sunMeshGroup = null;
  let moonMeshGroup = null;
  let birdsGroup = null;
  let starsGroup = null;
  let skylineGroup = null;
  const birdFlocks = [];
  const starTwinkle = [];
  // Street lamps (row props + pooled PointLights near player)
  const streetLamps = []; // { bulb, glass, row, sideX }
  const LAMP_POINT_POOL = 5;
  const lampPointLights = [];
  let lastLampGlow = 0;

  function blockMat(hex, opts) {
    const o = opts || {};
    if (o.emissive) {
      return new THREE.MeshLambertMaterial({
        color: new THREE.Color(hex),
        emissive: new THREE.Color(o.emissive),
        emissiveIntensity: o.emissiveIntensity != null ? o.emissiveIntensity : 0.6,
        flatShading: true,
        transparent: !!o.transparent,
        opacity: o.opacity != null ? o.opacity : 1,
        depthWrite: !o.transparent,
      });
    }
    if (o.basic) {
      return new THREE.MeshBasicMaterial({
        color: new THREE.Color(hex),
        transparent: !!o.transparent,
        opacity: o.opacity != null ? o.opacity : 1,
        depthWrite: !o.transparent,
      });
    }
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color(hex),
      flatShading: true,
      transparent: !!o.transparent,
      opacity: o.opacity != null ? o.opacity : 1,
      depthWrite: !o.transparent,
    });
  }

  function addBox(parent, w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function buildSunMesh() {
    const g = new THREE.Group();
    const core = blockMat("#ffd166", { emissive: "#ff9a3c", emissiveIntensity: 0.85 });
    const glow = blockMat("#ffb347", { emissive: "#ff7a1a", emissiveIntensity: 0.55, transparent: true, opacity: 0.55 });
    addBox(g, 1.6, 1.6, 1.6, 0, 0, 0, core);
    addBox(g, 1.1, 1.1, 1.1, 1.2, 0.2, 0, core);
    addBox(g, 1.0, 1.0, 1.0, -1.1, -0.15, 0.1, core);
    addBox(g, 0.9, 0.9, 0.9, 0.15, 1.15, -0.1, core);
    addBox(g, 0.85, 0.85, 0.85, -0.2, -1.1, 0.05, core);
    addBox(g, 2.8, 2.8, 0.6, 0, 0, -0.4, glow);
    return g;
  }

  function buildMoonMesh() {
    const g = new THREE.Group();
    const pale = blockMat("#f2f6ff", { emissive: "#d0dcff", emissiveIntensity: 1.15, basic: false });
    const glow = blockMat("#c4d0ff", { emissive: "#9aabff", emissiveIntensity: 0.95, transparent: true, opacity: 0.62 });
    addBox(g, 1.75, 1.75, 1.75, 0, 0, 0, pale);
    addBox(g, 1.1, 1.1, 1.1, 1.15, 0.3, 0, pale);
    addBox(g, 1.05, 1.05, 1.05, -1.1, -0.2, 0.1, pale);
    addBox(g, 0.85, 0.85, 0.85, 0.12, 1.2, -0.05, pale);
    addBox(g, 3.1, 3.1, 0.55, 0, 0, -0.4, glow);
    return g;
  }

  function buildBird() {
    const g = new THREE.Group();
    const body = blockMat("#2b2d42");
    const wing = blockMat("#1b1d2e");
    addBox(g, 0.22, 0.14, 0.35, 0, 0, 0, body);
    const left = addBox(g, 0.45, 0.08, 0.12, 0.28, 0.02, 0, wing);
    const right = addBox(g, 0.45, 0.08, 0.12, -0.28, 0.02, 0, wing);
    g.userData.leftWing = left;
    g.userData.rightWing = right;
    return g;
  }

  function buildSkyline() {
    // Wider, denser blocky city silhouette (far +Z). Visible faintly by day;
    // windows glow with night / lampGlow.
    const g = new THREE.Group();
    const bldgFront = blockMat("#0c0e18");
    const bldgMid = blockMat("#121628");
    const bldgBack = blockMat("#0a0c14");
    const winMats = [];
    function makeWinMat(tint) {
      const m = blockMat(tint, { emissive: tint, emissiveIntensity: 0 });
      winMats.push(m);
      return m;
    }
    const winWarm = makeWinMat("#ffd166");
    const winCool = makeWinMat("#9ad0ff");
    const winAmber = makeWinMat("#ffaa33");

    function addBuilding(x, z, w, h, d, bodyMat, dens) {
      addBox(g, w, h, d, x + w * 0.5, h * 0.5, z, bodyMat);
      // Occasional rooftop step / antenna for silhouette variety
      if (Math.random() < 0.35) {
        const rw = w * (0.35 + Math.random() * 0.4);
        const rh = 0.4 + Math.random() * 1.4;
        addBox(g, rw, rh, d * 0.55, x + w * 0.5, h + rh * 0.5, z, bodyMat);
      }
      if (Math.random() < 0.2) {
        addBox(g, 0.08, 0.6 + Math.random() * 1.2, 0.08, x + w * 0.5, h + 0.7, z, bodyMat);
      }
      const floors = Math.max(1, Math.floor(h / 0.95));
      const cols = Math.max(1, Math.floor(w / 0.55));
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > dens) continue;
          const tint = Math.random() < 0.2 ? winCool : Math.random() < 0.5 ? winWarm : winAmber;
          const wx = x + 0.22 + c * (w / cols) + Math.random() * 0.08;
          const wy = 0.35 + f * 0.95 + Math.random() * 0.08;
          addBox(g, 0.16, 0.2, 0.1, wx, wy, z + d * 0.52, tint);
        }
      }
    }

    // Back layer (farther, slightly smaller / darker)
    let x = -28;
    while (x < 28) {
      const w = 1.0 + Math.random() * 2.8;
      const h = 3.5 + Math.random() * 9;
      const d = 0.9 + Math.random() * 1.2;
      addBuilding(x, 4.5 + Math.random() * 2, w, h, d, bldgBack, 0.28);
      x += w + 0.15 + Math.random() * 0.55;
    }
    // Mid layer
    x = -26;
    while (x < 26) {
      const w = 1.1 + Math.random() * 2.4;
      const h = 2.8 + Math.random() * 8;
      const d = 1.0 + Math.random() * 1.5;
      addBuilding(x, 1.5 + Math.random() * 1.5, w, h, d, bldgMid, 0.38);
      x += w + 0.2 + Math.random() * 0.6;
    }
    // Front layer (closest to playfield)
    x = -24;
    while (x < 24) {
      const w = 1.15 + Math.random() * 2.2;
      const h = 2.2 + Math.random() * 7.5;
      const d = 1.1 + Math.random() * 1.6;
      addBuilding(x, Math.random() * 0.8, w, h, d, bldgFront, 0.5);
      x += w + 0.18 + Math.random() * 0.5;
    }

    g.userData.winMats = winMats;
    return g;
  }

  function initSkyProps() {
    sunMeshGroup = buildSunMesh();
    sunMeshGroup.position.set(10, 14, 20);
    skyRoot.add(sunMeshGroup);

    moonMeshGroup = buildMoonMesh();
    moonMeshGroup.position.set(-8, 13, 18);
    moonMeshGroup.visible = false;
    skyRoot.add(moonMeshGroup);

    birdsGroup = new THREE.Group();
    skyRoot.add(birdsGroup);
    for (let f = 0; f < 3; f++) {
      const flock = new THREE.Group();
      const birds = [];
      for (let b = 0; b < 4; b++) {
        const bird = buildBird();
        bird.position.set((b - 1.5) * 0.7, Math.sin(b) * 0.35, (b % 2) * 0.4);
        flock.add(bird);
        birds.push(bird);
      }
      flock.position.set(-16 + f * 10, 9 + f * 1.2, 14 + f * 4);
      birdsGroup.add(flock);
      birdFlocks.push({
        group: flock,
        birds,
        speed: 2.2 + f * 0.4,
        baseY: flock.position.y,
        phase: f * 1.7,
      });
    }

    starsGroup = new THREE.Group();
    skyRoot.add(starsGroup);
    for (let i = 0; i < 48; i++) {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.18),
        blockMat("#eef2ff", { emissive: "#ffffff", emissiveIntensity: 1.0, basic: false })
      );
      const ang = (i / 48) * Math.PI * 2;
      const rad = 8 + (i % 7) * 2.2;
      s.position.set(
        Math.cos(ang) * rad + ((i * 13) % 5) - 2,
        6 + (i % 11) * 1.1,
        10 + Math.sin(ang * 1.3) * 8 + (i % 5)
      );
      starsGroup.add(s);
      starTwinkle.push({ mesh: s, phase: i * 0.37, speed: 1.5 + (i % 5) * 0.35 });
    }
    starsGroup.visible = false;

    skylineGroup = buildSkyline();
    skylineGroup.position.set(0, 0, 36);
    skylineGroup.visible = false;
    skyRoot.add(skylineGroup);
  }

  initSkyProps();

  function applySkySample(p) {
    const skyCol = new THREE.Color(p.sky);
    const fogCol = new THREE.Color(p.fog);
    scene.background.copy(skyCol);
    scene.fog.color.copy(fogCol);
    renderer.setClearColor(skyCol, 1);
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    hemi.intensity = p.hemiInt;
    sun.color.set(p.sunColor);
    sun.intensity = p.sunInt;
    ambient.color.set(p.ambientColor);
    ambient.intensity = p.ambientInt;
    rim.color.set(p.rimColor);
    rim.intensity = p.rimInt;

    if (sunMeshGroup) {
      sunMeshGroup.visible = p.sunVisible > 0.05;
      sunMeshGroup.position.set(10, p.sunMeshY, 20);
      sunMeshGroup.scale.setScalar(p.sunMeshScale);
      sunMeshGroup.traverse((ch) => {
        if (ch.material && ch.material.opacity != null && ch.material.transparent) {
          ch.material.opacity = Math.min(0.65, 0.35 + p.sunVisible * 0.3);
        }
      });
    }
    if (moonMeshGroup) {
      moonMeshGroup.visible = p.moonVisible > 0.05;
      const mo = Math.max(0, Math.min(1, p.moonVisible));
      moonMeshGroup.traverse((ch) => {
        if (ch.material) {
          if (ch.material.transparent) ch.material.opacity = 0.35 + mo * 0.45;
          if (ch.material.emissiveIntensity != null) {
            ch.material.emissiveIntensity = 0.7 + mo * 0.7;
          }
        }
      });
    }
    if (birdsGroup) birdsGroup.visible = p.birdsVisible > 0.05;
    const lampG = p.lampGlow != null ? p.lampGlow : 0;
    applyStreetLampGlow(lampG);
    applyVehicleHeadlights(lampG);
    if (starsGroup) {
      starsGroup.visible = p.starsVisible > 0.05;
      starsGroup.traverse((ch) => {
        if (ch.isMesh && ch.material) {
          if (ch.material.opacity != null) ch.material.opacity = Math.max(0.15, p.starsVisible);
        }
      });
    }
    if (skylineGroup) {
      const sv = p.skylineVisible != null ? p.skylineVisible : 0;
      skylineGroup.visible = sv > 0.05;
      // Day/sunset: dark silhouette; night: windows follow lampGlow
      const winGlow = lampG * Math.max(0, Math.min(1, sv));
      const wins = skylineGroup.userData && skylineGroup.userData.winMats;
      if (wins) {
        for (const m of wins) {
          m.emissiveIntensity = winGlow * 1.35;
          if (winGlow < 0.08) {
            m.color.set("#1a1e2a");
          } else {
            // restore warm/cool from emissive tint already on mat
            m.color.copy(m.emissive);
          }
        }
      }
      // Soften overall building visibility in day by darkening slightly via scale not needed
      skylineGroup.traverse((ch) => {
        if (!ch.isMesh || !ch.material) return;
        if (ch.material.emissiveIntensity != null && wins && wins.indexOf(ch.material) >= 0) return;
        // body mats stay dark; optional slight lighten at dusk for readability
        if (ch.material.color && sv > 0.05 && sv < 0.9 && lampG < 0.4) {
          // keep dark silhouette
        }
      });
    }
  }

  function snapSkyPhase(idx) {
    skyPhaseIndex = ((idx % 3) + 3) % 3;
    skyBlendFrom = skyPhaseIndex;
    skyBlendTo = skyPhaseIndex;
    skyBlend = 1;
    skyPhaseAge = 0;
    applySkySample(SKY_PALETTES[skyPhaseIndex]);
  }

  function beginSkyTransition(nextIdx) {
    skyBlendFrom = skyPhaseIndex;
    skyBlendTo = ((nextIdx % 3) + 3) % 3;
    skyPhaseIndex = skyBlendTo;
    skyBlend = 0;
    skyPhaseAge = 0;
  }

  function updateSkyCycle(dt) {
    if (!skyClockRunning || paused || countdownActive || gameOver || !playing) {
      // Still animate props gently when visible during countdown/menu
    } else {
      skyPhaseAge += dt;
      if (skyBlend < 1) {
        skyBlend = Math.min(1, skyBlend + dt / SKY_LERP_SEC);
        applySkySample(sampleSkyPalette(skyBlendFrom, skyBlendTo, skyBlend));
      } else if (skyPhaseAge >= SKY_PHASE_SEC) {
        beginSkyTransition((skyPhaseIndex + 1) % 3);
        applySkySample(sampleSkyPalette(skyBlendFrom, skyBlendTo, 0));
      }
    }

    // Prop motion (birds / stars) — runs whenever not paused
    if (!paused) {
      const t = performance.now() * 0.001;
      for (const f of birdFlocks) {
        f.group.position.x += f.speed * dt;
        if (f.group.position.x > 22) f.group.position.x = -22;
        f.group.position.y = f.baseY + Math.sin(t * 1.6 + f.phase) * 0.45;
        for (let i = 0; i < f.birds.length; i++) {
          const bird = f.birds[i];
          const flap = Math.sin(t * 10 + f.phase + i) * 0.55;
          if (bird.userData.leftWing) bird.userData.leftWing.rotation.z = flap;
          if (bird.userData.rightWing) bird.userData.rightWing.rotation.z = -flap;
          bird.position.y = Math.sin(t * 3 + i + f.phase) * 0.12;
        }
      }
      for (const s of starTwinkle) {
        const pulse = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        s.mesh.scale.setScalar(0.7 + pulse * 0.55);
        if (s.mesh.material && s.mesh.material.emissiveIntensity != null) {
          s.mesh.material.emissiveIntensity = 0.5 + pulse * 0.9;
        }
      }
    }

    // Follow chase cam so props stay framed
    skyRoot.position.x = cameraX;
    skyRoot.position.z = cameraZ;
  }

  function formatRunTimer(sec) {
    const totalMs = Math.max(0, Math.floor((sec || 0) * 1000));
    const m = Math.floor(totalMs / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return m + ":" + String(s).padStart(2, "0") + "." + String(ms).padStart(3, "0");
  }

  function syncRunTimerHud() {
    if (!runTimerEl) return;
    runTimerEl.textContent = formatRunTimer(runTimeSec);
  }

  function showRunTimer(show) {
    if (!runTimerEl) return;
    runTimerEl.classList.toggle("hidden", !show);
  }

  function hideCountdown() {
    if (countdownEl) {
      countdownEl.classList.add("hidden");
      countdownEl.setAttribute("aria-hidden", "true");
    }
    if (countdownText) {
      countdownText.textContent = "";
      countdownText.classList.remove("is-start");
    }
  }

  function showCountdownLabel(label, isStart) {
    if (!countdownEl || !countdownText) return;
    countdownText.textContent = label;
    countdownText.classList.toggle("is-start", !!isStart);
    // retrigger CSS animation
    countdownText.style.animation = "none";
    void countdownText.offsetWidth;
    countdownText.style.animation = "";
    countdownEl.classList.remove("hidden");
    countdownEl.setAttribute("aria-hidden", "false");
    try { AudioFX.uiClick(); } catch (_) {}
  }

  function startCountdownSequence() {
    countdownActive = true;
    canControl = false;
    skyClockRunning = false;
    runTimeSec = 0;
    runTimerFrozen = false;
    syncRunTimerHud();
    showRunTimer(true);
    snapSkyPhase(0); // Day ready; clock starts on START
    countdownQueue = ["3", "2", "1", "START!"];
    countdownStepTimer = 0;
    const first = countdownQueue.shift();
    showCountdownLabel(first, first === "START!");
  }

  function finishCountdownStart() {
    hideCountdown();
    countdownActive = false;
    canControl = true;
    skyClockRunning = true;
    skyPhaseAge = 0;
    snapSkyPhase(0);
    runTimeSec = 0;
    runTimerFrozen = false;
    syncRunTimerHud();
    syncTouchPad();
    // Ensure BGM as on Play today
    if (!AudioFX.isMuted()) {
      try { AudioFX.startMusic(); } catch (_) {}
    }
  }

  function updateCountdown(dt) {
    if (!countdownActive || paused) return;
    countdownStepTimer += dt;
    if (countdownStepTimer < COUNTDOWN_STEP_SEC) return;
    countdownStepTimer = 0;
    if (!countdownQueue || countdownQueue.length === 0) {
      finishCountdownStart();
      return;
    }
    const next = countdownQueue.shift();
    showCountdownLabel(next, next === "START!");
    if (next === "START!") {
      // Hold START briefly then enable — next tick after STEP finishes
      // Keep one more empty wait via pushing sentinel handled next step
      countdownQueue = []; // next step calls finishCountdownStart
    }
  }

  // Shared materials
  const matCache = new Map();
  function mat(hex, opts) {
    const key = hex + (opts && opts.flat ? "|f" : "");
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(hex),
      flatShading: !!(opts && opts.flat),
    });
    matCache.set(key, m);
    return m;
  }

  // Unique transparent mats for Cap Kid so death fade doesn't touch shared world mats
  function playerMat(hex, opts) {
    const m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(hex),
      flatShading: !!(opts && opts.flat),
      transparent: true,
      opacity: 1,
      depthWrite: true,
    });
    m.userData.playerOwned = true;
    return m;
  }

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);

  const rowMeshes = new Map();
  let playerMesh = null;
  let playerCharId = null;
  let playerIdleRoot = null; // bob/sway child group
  let eyeMeshes = [];

  // col ↑ → world +X. With camera looking +Z, +X is screen-left (verified; no colToX flip needed after v1.04 input invert).
  function colToX(col) {
    return (col - (COLS - 1) / 2) * CELL;
  }

  function rowToZ(row) {
    return row * CELL;
  }

  // ─── Mesh builders ────────────────────────────────────────
  function makeGroundStrip(type, shade, isSafe) {
    const g = new THREE.Group();
    const w = COLS * CELL + 4;
    const d = CELL * 0.98;
    let color;
    if (type === "road") color = COLORS.road;
    else if (isSafe) color = COLORS.sidewalk;
    else color = shade ? COLORS.grassA : COLORS.grassB;

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.18, d),
      mat(color)
    );
    slab.position.y = -0.09;
    slab.receiveShadow = true;
    g.add(slab);

    const shoulderMat = mat(COLORS.ground);
    const left = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, d), shoulderMat);
    left.position.set(-(COLS * CELL) / 2 - 2.5, -0.12, 0);
    left.receiveShadow = true;
    g.add(left);
    const right = left.clone();
    right.position.x = (COLS * CELL) / 2 + 2.5;
    g.add(right);

    if (type === "road") {
      const lineMat = mat(COLORS.roadLine);
      for (let i = -3; i <= 3; i++) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.12), lineMat);
        dash.position.set(i * 1.15, 0.01, 0);
        g.add(dash);
      }
      const curbMat = mat("#3d405b");
      [-1, 1].forEach((side) => {
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(COLS * CELL + 0.4, 0.12, 0.08),
          curbMat
        );
        curb.position.set(0, 0.02, side * (CELL * 0.46));
        g.add(curb);
      });
    }
    return g;
  }

  function makeTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.55, 6),
      mat(COLORS.trunk, { flat: true })
    );
    trunk.position.y = 0.28;
    trunk.castShadow = true;
    g.add(trunk);
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 7, 6),
      mat(COLORS.treeTop, { flat: true })
    );
    foliage.position.y = 0.72;
    foliage.castShadow = true;
    g.add(foliage);
    const foliage2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 6, 5),
      mat(COLORS.tree, { flat: true })
    );
    foliage2.position.set(0.12, 0.58, 0.05);
    foliage2.castShadow = true;
    g.add(foliage2);
    return g;
  }

  function makeCar(colorHex, width, dir) {
    const g = new THREE.Group();
    const bodyW = width * CELL * 0.92;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW, 0.32, 0.55),
      mat(colorHex, { flat: true })
    );
    body.position.y = 0.28;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.45, 0.22, 0.42),
      mat(shadeHex(colorHex, -25), { flat: true })
    );
    // Always build facing +X; lane direction is mesh.rotation.y only (v1.16)
    cabin.position.set(bodyW * 0.08, 0.5, 0);
    cabin.castShadow = true;
    g.add(cabin);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.12, 0.14, 0.36),
      mat("#a8d8ea", { flat: true })
    );
    glass.position.set(bodyW * 0.28, 0.48, 0);
    g.add(glass);
    const wheelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8);
    const wheelMat = mat("#171725", { flat: true });
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(sx * bodyW * 0.32, 0.1, sz * 0.28);
      g.add(wh);
    });
    const hlMats = [];
    [[0.18], [-0.18]].forEach(([z]) => {
      const hlMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color("#3a3a40"),
        emissive: new THREE.Color("#fff6c8"),
        emissiveIntensity: 0,
        flatShading: true,
      });
      hlMats.push(hlMat);
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.12), hlMat);
      hl.position.set(bodyW * 0.48, 0.28, z);
      g.add(hl);
    });
    g.userData.bodyW = bodyW;
    g.userData.kind = "car";
    g.userData.headlights = hlMats;
    return g;
  }

  function makeTruck(colorHex, width, dir) {
    const g = new THREE.Group();
    const bodyW = width * CELL * 0.94;
    const cabW = Math.min(0.85, bodyW * 0.32);
    const cargoW = bodyW - cabW - 0.06;
    // Always +X forward (cab leads +X); orient via rotation.y (v1.16)
    const cabX = bodyW * 0.5 - cabW * 0.5;
    const cargoX = -bodyW * 0.5 + cargoW * 0.5;
    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(cargoW, 0.72, 0.7),
      mat(shadeHex(colorHex, -15), { flat: true })
    );
    cargo.position.set(cargoX, 0.5, 0);
    cargo.castShadow = true;
    g.add(cargo);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(cabW, 0.55, 0.62),
      mat(colorHex, { flat: true })
    );
    cab.position.set(cabX, 0.42, 0);
    cab.castShadow = true;
    g.add(cab);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(cabW * 0.28, 0.22, 0.48),
      mat("#a8d8ea", { flat: true })
    );
    glass.position.set(cabX + cabW * 0.28, 0.5, 0);
    g.add(glass);
    const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8);
    const wheelMat = mat("#171725", { flat: true });
    const axles = [-bodyW * 0.38, -bodyW * 0.12, bodyW * 0.34];
    axles.forEach((ax) => {
      [-1, 1].forEach((sz) => {
        const wh = new THREE.Mesh(wheelGeo, wheelMat);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(ax, 0.12, sz * 0.32);
        g.add(wh);
      });
    });
    const hlMats = [];
    [[0.2], [-0.2]].forEach(([z]) => {
      const hlMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color("#3a3a40"),
        emissive: new THREE.Color("#fff6c8"),
        emissiveIntensity: 0,
        flatShading: true,
      });
      hlMats.push(hlMat);
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.12), hlMat);
      hl.position.set(bodyW * 0.48, 0.32, z);
      g.add(hl);
    });
    g.userData.bodyW = bodyW;
    g.userData.kind = "truck";
    g.userData.headlights = hlMats;
    return g;
  }

  function makeMotorcycle(colorHex, width, dir) {
    const g = new THREE.Group();
    const bodyW = Math.max(0.45, width * CELL * 0.95);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.7, 0.14, 0.22),
      mat(colorHex, { flat: true })
    );
    frame.position.y = 0.28;
    frame.castShadow = true;
    g.add(frame);
    const tank = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.35, 0.16, 0.2),
      mat(shadeHex(colorHex, 20), { flat: true })
    );
    tank.position.set(-0.02, 0.38, 0);
    g.add(tank);
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.28, 0.1, 0.2),
      mat("#2b2d42", { flat: true })
    );
    seat.position.set(-bodyW * 0.12, 0.36, 0);
    g.add(seat);
    const wheelGeo = new THREE.BoxGeometry(0.16, 0.16, 0.08);
    const wheelMat = mat("#171725", { flat: true });
    const front = new THREE.Mesh(wheelGeo, wheelMat);
    front.position.set(bodyW * 0.32, 0.14, 0);
    g.add(front);
    const rear = new THREE.Mesh(wheelGeo, wheelMat);
    rear.position.set(-bodyW * 0.28, 0.14, 0);
    g.add(rear);
    // rider cube (chibi)
    const rider = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.28, 0.18),
      mat("#ffb4a2", { flat: true })
    );
    rider.position.set(-bodyW * 0.06, 0.55, 0);
    rider.castShadow = true;
    g.add(rider);
    const helmet = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.14, 0.16),
      mat("#3a86ff", { flat: true })
    );
    helmet.position.set(rider.position.x, 0.74, 0);
    g.add(helmet);
    const hlMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color("#3a3a40"),
      emissive: new THREE.Color("#fff6c8"),
      emissiveIntensity: 0,
      flatShading: true,
    });
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.08), hlMat);
    hl.position.set(bodyW * 0.38, 0.3, 0);
    g.add(hl);
    g.userData.bodyW = bodyW;
    g.userData.kind = "moto";
    g.userData.headlights = [hlMat];
    return g;
  }

  function makeVehicle(car, dir) {
    // Mesh parts always face +X; caller sets rotation.y from lane dir (v1.16)
    void dir;
    const kind = car.kind || "car";
    let mesh;
    if (kind === "truck") mesh = makeTruck(car.color, car.w, 1);
    else if (kind === "moto") mesh = makeMotorcycle(car.color, car.w, 1);
    else mesh = makeCar(car.color, car.w, 1);
    mesh.userData.kind = kind;
    mesh.userData.w = car.w;
    return mesh;
  }

  function pickRoadVehicleKind() {
    // Per-road dedication: cars most common, trucks/motos less — mix across world, not within a lane
    const r = Math.random();
    if (r < 0.62) return "car";
    if (r < 0.84) return "truck";
    return "moto";
  }

  function makeVehicleData(kind) {
    const k = kind || "car";
    let w, speedMul, hitH, color;
    if (k === "truck") {
      w = 2.05 + Math.random() * 0.55;
      speedMul = 0.7 + Math.random() * 0.12;
      hitH = 0.88;
      const truckPalette = ["#6c757d", "#495057", "#8d6e63", "#ef476f", "#118ab2", "#f77f00"];
      color = truckPalette[Math.floor(Math.random() * truckPalette.length)];
    } else if (k === "moto") {
      w = 0.52 + Math.random() * 0.22;
      speedMul = 1.28 + Math.random() * 0.22;
      hitH = 0.52;
      color = COLORS.carPalette[Math.floor(Math.random() * COLORS.carPalette.length)];
    } else {
      w = 1.15 + Math.random() * 0.45;
      speedMul = 0.95 + Math.random() * 0.1;
      hitH = 0.72;
      color = COLORS.carPalette[Math.floor(Math.random() * COLORS.carPalette.length)];
    }
    return { kind: k, w, speedMul, hitH, color };
  }

  // ─── Street light-posts (v1.14) ────────────────────────────
  function makeLightPostMesh() {
    const g = new THREE.Group();
    const poleMat = mat("#4a4e69", { flat: true });
    const baseMat = mat("#2b2d42", { flat: true });
    const headMat = mat("#3d405b", { flat: true });
    const glassMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color("#2a2a32"),
      emissive: new THREE.Color("#000000"),
      emissiveIntensity: 0,
      flatShading: true,
    });
    const bulbMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color("#3a3a40"),
      emissive: new THREE.Color("#ffd166"),
      emissiveIntensity: 0,
      flatShading: true,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.22), baseMat);
    base.position.y = 0.04;
    g.add(base);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.55, 0.1), poleMat);
    pole.position.y = 0.85;
    pole.castShadow = true;
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.08), poleMat);
    arm.position.set(0.18, 1.58, 0);
    g.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.22), headMat);
    head.position.set(0.36, 1.52, 0);
    g.add(head);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.16), glassMat);
    glass.position.set(0.36, 1.44, 0);
    g.add(glass);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.1), bulbMat);
    bulb.position.set(0.36, 1.44, 0);
    g.add(bulb);
    g.userData.bulbMat = bulbMat;
    g.userData.glassMat = glassMat;
    return g;
  }

  function ensureLampPointLights() {
    if (lampPointLights.length) return;
    for (let i = 0; i < LAMP_POINT_POOL; i++) {
      const pl = new THREE.PointLight(0xffd28a, 0, 6.5, 2);
      pl.visible = false;
      scene.add(pl);
      lampPointLights.push(pl);
    }
  }

  function clearStreetLamps() {
    streetLamps.length = 0;
    for (const pl of lampPointLights) {
      pl.intensity = 0;
      pl.visible = false;
    }
  }

  function registerStreetLamp(mesh, rowIndex, sideX) {
    streetLamps.push({
      mesh,
      bulb: mesh.userData.bulbMat,
      glass: mesh.userData.glassMat,
      row: rowIndex,
      sideX,
    });
  }

  function applyStreetLampGlow(glow) {
    lastLampGlow = glow;
    const g = Math.max(0, Math.min(1, glow || 0));
    for (const lamp of streetLamps) {
      if (lamp.bulb) {
        lamp.bulb.emissiveIntensity = g * 1.35;
        lamp.bulb.color.set(g > 0.05 ? "#fff3c4" : "#3a3a40");
        lamp.bulb.emissive.set(g > 0.05 ? "#ffd166" : "#000000");
      }
      if (lamp.glass) {
        lamp.glass.emissiveIntensity = g * 0.55;
        lamp.glass.color.set(g > 0.15 ? "#ffe8a3" : "#2a2a32");
        lamp.glass.emissive.set(g > 0.15 ? "#ffcc66" : "#000000");
      }
    }
    // Real PointLights: only the nearest few to the player (perf)
    ensureLampPointLights();
    if (!player || g < 0.05) {
      for (const pl of lampPointLights) {
        pl.intensity = 0;
        pl.visible = false;
      }
      return;
    }
    const pz = rowToZ(playerVisualRow());
    const ranked = streetLamps
      .map((lamp) => ({
        lamp,
        d: Math.abs(rowToZ(lamp.row) - pz),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, lampPointLights.length);
    for (let i = 0; i < lampPointLights.length; i++) {
      const pl = lampPointLights[i];
      const hit = ranked[i];
      if (!hit) {
        pl.intensity = 0;
        pl.visible = false;
        continue;
      }
      const lamp = hit.lamp;
      pl.visible = true;
      pl.intensity = 0.15 + g * 0.85;
      pl.distance = 5.5 + g * 2;
      pl.position.set(lamp.sideX, 1.5, rowToZ(lamp.row));
    }
  }

  function updateStreetLampLights() {
    if (lastLampGlow > 0.05) {
      applyStreetLampGlow(lastLampGlow);
      applyVehicleHeadlights(lastLampGlow);
    } else {
      applyVehicleHeadlights(0);
    }
  }

  // Optional pooled SpotLights for nearest vehicles (cheap night pools)
  const vehicleHeadSpotPool = [];
  const VEHICLE_SPOT_POOL = 3;
  function ensureVehicleHeadSpots() {
    if (vehicleHeadSpotPool.length) return;
    for (let i = 0; i < VEHICLE_SPOT_POOL; i++) {
      const sl = new THREE.SpotLight(0xfff6c8, 0, 7, 0.45, 0.45, 1.4);
      sl.visible = false;
      sl.castShadow = false;
      scene.add(sl);
      scene.add(sl.target);
      vehicleHeadSpotPool.push(sl);
    }
  }

  function applyVehicleHeadlights(glow) {
    const g = Math.max(0, Math.min(1, glow || 0));
    // Emissive intensity: day 0, sunset warm low, night bright
    const intensity = g < 0.05 ? 0 : (g < 0.5 ? g * 0.85 : 0.55 + g * 0.95);
    rowMeshes.forEach((entry) => {
      if (!entry || entry.type !== "road" || !entry.cars) return;
      for (const mesh of entry.cars) {
        if (!mesh || !mesh.visible || !mesh.userData || !mesh.userData.headlights) continue;
        for (const m of mesh.userData.headlights) {
          m.emissiveIntensity = intensity;
          if (intensity > 0.05) {
            m.color.set("#fff6c8");
            m.emissive.set("#fff6c8");
          } else {
            m.color.set("#3a3a40");
            m.emissive.set("#000000");
          }
        }
      }
    });
    // Small SpotLight pools only near the player when night is bright enough
    ensureVehicleHeadSpots();
    if (!player || g < 0.35) {
      for (const sl of vehicleHeadSpotPool) {
        sl.intensity = 0;
        sl.visible = false;
      }
      return;
    }
    const pz = rowToZ(playerVisualRow());
    const px = playerMesh ? playerMesh.position.x : colToX(player.col);
    const candidates = [];
    rowMeshes.forEach((entry, rowIdx) => {
      if (!entry || entry.type !== "road" || !entry.cars) return;
      const rz = rowToZ(rowIdx);
      if (Math.abs(rz - pz) > 6) return;
      for (const mesh of entry.cars) {
        if (!mesh || !mesh.visible) continue;
        const wx = mesh.parent ? mesh.parent.position.x + mesh.position.x : mesh.position.x;
        // mesh is child of row group at z=row; world x = mesh.position.x
        const dx = mesh.position.x - px;
        const dz = rz - pz;
        const d2 = dx * dx + dz * dz;
        candidates.push({ mesh, d2, rz });
      }
    });
    candidates.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < vehicleHeadSpotPool.length; i++) {
      const sl = vehicleHeadSpotPool[i];
      const hit = candidates[i];
      if (!hit) {
        sl.intensity = 0;
        sl.visible = false;
        continue;
      }
      const mesh = hit.mesh;
      // Headlights face local +X; world forward depends on mesh.rotation.y
      const yaw = mesh.rotation.y || 0;
      const fx = Math.cos(yaw); // +X local → world
      const fz = -Math.sin(yaw);
      const hx = mesh.position.x;
      const hy = 0.35;
      const hz = hit.rz;
      sl.visible = true;
      sl.intensity = 0.25 + g * 0.55;
      sl.distance = 5 + g * 2;
      sl.position.set(hx + fx * 0.35, hy, hz + fz * 0.35);
      sl.target.position.set(hx + fx * 3.5, 0.1, hz + fz * 3.5);
      sl.target.updateMatrixWorld();
    }
  }

  function shadeHex(hex, amt) {
    const n = hex.replace("#", "");
    const num = parseInt(
      n.length === 3 ? n.split("").map((c) => c + c).join("") : n,
      16
    );
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function makePlayerMesh(ch) {
    const root = new THREE.Group();
    const idle = new THREE.Group();
    root.add(idle);
    // Draft A / Sunset-hop: blocky Crossy-Road chibi (v1.23)
    // Big rectangular head, flat cap + white button, cyan sleeves, dark pants.

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.28, 0.22),
      playerMat(ch.shirt || ch.body, { flat: true })
    );
    torso.position.y = 0.30;
    torso.castShadow = true;
    idle.add(torso);
    // subtle lighter shirt panel (not a round belly)
    const belly = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.14, 0.04),
      playerMat(ch.belly || ch.shirt || ch.body, { flat: true })
    );
    belly.position.set(0, 0.28, 0.125);
    idle.add(belly);

    const legL = new THREE.Group();
    const legR = new THREE.Group();
    [[-1, legL], [1, legR]].forEach(([side, grp]) => {
      grp.position.set(side * 0.09, 0.18, 0);
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.14),
        playerMat(ch.pants || ch.accent, { flat: true })
      );
      leg.position.set(0, -0.07, 0);
      leg.castShadow = true;
      grp.add(leg);
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.06, 0.18),
        playerMat(ch.shoes || "#333333", { flat: true })
      );
      shoe.position.set(0, -0.16, 0.02);
      shoe.castShadow = true;
      grp.add(shoe);
      idle.add(grp);
    });

    const armL = new THREE.Group();
    const armR = new THREE.Group();
    [[-1, armL], [1, armR]].forEach(([side, grp]) => {
      grp.position.set(side * 0.22, 0.38, 0);
      // short sleeve (shirt color)
      const sleeve = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.10, 0.12),
        playerMat(ch.shirt || ch.body, { flat: true })
      );
      sleeve.position.set(side * 0.01, -0.02, 0);
      sleeve.castShadow = true;
      grp.add(sleeve);
      // lower arm / hand (skin)
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.14, 0.09),
        playerMat(ch.body, { flat: true })
      );
      arm.position.set(side * 0.01, -0.14, 0);
      arm.castShadow = true;
      grp.add(arm);
      idle.add(grp);
    });

    const headG = new THREE.Group();
    headG.position.y = 0.62;
    idle.add(headG);

    // Big blocky head (wider than torso — readable from behind/above cam)
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.40, 0.40),
      playerMat(ch.body, { flat: true })
    );
    head.position.y = 0.02;
    head.castShadow = true;
    headG.add(head);

    // Blocky brown hair under / around cap brim
    const hairFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.10, 0.10),
      playerMat(ch.hair, { flat: true })
    );
    hairFront.position.set(0, 0.10, 0.18);
    headG.add(hairFront);
    const hairL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.28),
      playerMat(ch.hair, { flat: true })
    );
    hairL.position.set(-0.20, 0.10, 0.02);
    headG.add(hairL);
    const hairR = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.28),
      playerMat(ch.hair, { flat: true })
    );
    hairR.position.set(0.20, 0.10, 0.02);
    headG.add(hairR);
    const hairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.12, 0.08),
      playerMat(ch.hair, { flat: true })
    );
    hairBack.position.set(0, 0.12, -0.18);
    headG.add(hairBack);

    // Cap crown (flat-top box, slightly tapered feel via width)
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.16, 0.42),
      playerMat(ch.cap || ch.accent, { flat: true })
    );
    cap.position.set(0, 0.26, -0.01);
    cap.castShadow = true;
    headG.add(cap);
    // Cap bill (flat rectangle sticking forward)
    const bill = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.045, 0.20),
      playerMat(ch.capBill || ch.detail, { flat: true })
    );
    bill.position.set(0, 0.18, 0.28);
    bill.castShadow = true;
    headG.add(bill);
    // White top button
    const button = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.05, 0.07),
      playerMat("#ffffff", { flat: true })
    );
    button.position.set(0, 0.36, -0.01);
    headG.add(button);

    // Large cute vertical eyes (dark) + white glints — Draft A look
    const eyes = [];
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.16, 0.04),
        playerMat(ch.pupil || "#1a1a1a", { flat: true })
      );
      eye.position.set(side * 0.11, 0.02, 0.21);
      headG.add(eye);
      eyes.push(eye);
      const glint = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.04, 0.03),
        playerMat(ch.eye || "#ffffff", { flat: true })
      );
      glint.position.set(side * 0.11 - 0.015, 0.06, 0.235);
      headG.add(glint);
    });
    // Simple smile line
    const smile = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.025, 0.03),
      playerMat("#2b2d42", { flat: true })
    );
    smile.position.set(0, -0.10, 0.22);
    smile.rotation.z = 0.08;
    headG.add(smile);
    const smileTipL = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.025, 0.03),
      playerMat("#2b2d42", { flat: true })
    );
    smileTipL.position.set(-0.07, -0.085, 0.22);
    headG.add(smileTipL);
    const smileTipR = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.025, 0.03),
      playerMat("#2b2d42", { flat: true })
    );
    smileTipR.position.set(0.07, -0.085, 0.22);
    headG.add(smileTipR);

    root.userData.charId = ch.id;
    root.userData.idle = idle;
    root.userData.eyes = eyes;
    root.userData.armL = armL;
    root.userData.armR = armR;
    root.userData.legL = legL;
    root.userData.legR = legR;
    root.userData.headG = headG;
    return root;
  }

  function disposeObject(obj) {
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material && child.material.userData && child.material.userData.playerOwned) {
        child.material.dispose();
      }
    });
  }

  function resetPlayerFade() {
    deathFade = 0;
    playerFadeMats = [];
    if (deathOverlayTimer) {
      window.clearTimeout(deathOverlayTimer);
      deathOverlayTimer = 0;
    }
    if (!playerMesh) return;
    playerMesh.traverse((child) => {
      if (child.isMesh && child.material && child.material.userData && child.material.userData.playerOwned) {
        child.material.opacity = 1;
        child.material.transparent = true;
        child.material.depthWrite = true;
      }
    });
  }

  function startPlayerDeathFade() {
    deathFade = 0.0001;
    playerFadeMats = [];
    if (!playerMesh) return;
    playerMesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      let mats = Array.isArray(child.material) ? child.material : [child.material];
      mats = mats.map((m) => {
        if (!m.userData || !m.userData.playerOwned) {
          m = m.clone();
          m.transparent = true;
          m.userData = Object.assign({}, m.userData || {}, { playerOwned: true });
        }
        m.transparent = true;
        m.opacity = 1;
        m.depthWrite = true;
        return m;
      });
      child.material = mats.length === 1 ? mats[0] : mats;
      mats.forEach((m) => playerFadeMats.push(m));
    });
  }

  function updatePlayerDeathFade(dt) {
    if (deathFade <= 0) return;
    deathFade += dt;
    const t = Math.min(1, deathFade / DEATH_FADE_SEC);
    const opacity = 1 - t;
    for (const m of playerFadeMats) {
      m.opacity = opacity;
      m.transparent = true;
      m.depthWrite = opacity > 0.2;
    }
  }

  function clearWorldMeshes() {
    rowMeshes.forEach((entry) => {
      worldRoot.remove(entry.group);
      disposeObject(entry.group);
    });
    rowMeshes.clear();
    clearStreetLamps();
    if (playerMesh) {
      worldRoot.remove(playerMesh);
      disposeObject(playerMesh);
      playerMesh = null;
      playerCharId = null;
      playerIdleRoot = null;
      eyeMeshes = [];
    }
    resetPlayerFade();
  }

  function ensurePlayerMesh() {
    const ch = CHARACTERS[selectedChar] || CHARACTERS.capkid;
    if (playerMesh && playerCharId === ch.id) return;
    if (playerMesh) {
      worldRoot.remove(playerMesh);
      disposeObject(playerMesh);
    }
    playerMesh = makePlayerMesh(ch);
    playerCharId = ch.id;
    playerIdleRoot = playerMesh.userData.idle;
    eyeMeshes = playerMesh.userData.eyes || [];
    worldRoot.add(playerMesh);
  }

  function syncRowMesh(row) {
    let entry = rowMeshes.get(row.index);
    if (entry && entry.type === row.type) {
      if (row.type === "road") {
        for (let i = 0; i < row.cars.length; i++) {
          const car = row.cars[i];
          let mesh = entry.cars[i];
          const needNew = !mesh || mesh.userData.kind !== (car.kind || "car") || mesh.userData.w !== car.w;
          if (needNew) {
            if (mesh) {
              entry.group.remove(mesh);
              disposeObject(mesh);
            }
            mesh = makeVehicle(car, row.dir);
            entry.group.add(mesh);
            entry.cars[i] = mesh;
          }
          mesh.position.x = colToX(car.x + car.w / 2 - 0.5);
          mesh.position.y = 0;
          mesh.position.z = 0;
          // +X travel → yaw 0; −X → PI (mesh built +X-forward)
          mesh.rotation.y = row.dir > 0 ? 0 : Math.PI;
          mesh.visible = true;
        }
        for (let i = row.cars.length; i < entry.cars.length; i++) {
          if (entry.cars[i]) entry.cars[i].visible = false;
        }
      }
      return;
    }
    if (entry) {
      worldRoot.remove(entry.group);
      disposeObject(entry.group);
      rowMeshes.delete(row.index);
      for (let i = streetLamps.length - 1; i >= 0; i--) {
        if (streetLamps[i].row === row.index) streetLamps.splice(i, 1);
      }
    }
    const group = new THREE.Group();
    group.position.set(0, 0, rowToZ(row.index));
    const ground = makeGroundStrip(
      row.type,
      row.shade,
      row.index < SAFE_START_ROWS
    );
    group.add(ground);

    const carMeshes = [];
    const treeMeshes = [];
    if (row.type === "grass") {
      for (const tc of row.trees) {
        const t = makeTree();
        t.position.set(colToX(tc), 0, 0);
        group.add(t);
        treeMeshes.push(t);
      }
    } else {
      for (const car of row.cars) {
        const m = makeVehicle(car, row.dir);
        m.position.x = colToX(car.x + car.w / 2 - 0.5);
        m.rotation.y = row.dir > 0 ? 0 : Math.PI;
        group.add(m);
        carMeshes.push(m);
      }
    }

    // Street light-posts on shoulders every few rows (not every row)
    if (row.index >= SAFE_START_ROWS && row.index % 3 === 0) {
      const shoulder = (COLS * CELL) / 2 + 0.55;
      [-1, 1].forEach((side) => {
        const post = makeLightPostMesh();
        const sideX = side * shoulder;
        post.position.set(sideX, 0, 0);
        // Arm is built toward local +X; flip so arms point INWARD toward road (X=0)
        // Left shoulder (sideX < 0): keep +X; right shoulder: mirror to −X
        post.scale.x = side < 0 ? 1 : -1;
        group.add(post);
        registerStreetLamp(post, row.index, sideX);
      });
    }

    worldRoot.add(group);
    rowMeshes.set(row.index, {
      group,
      type: row.type,
      cars: carMeshes,
      trees: treeMeshes,
    });
  }

  function pruneFarRows(keepMin, keepMax) {
    const toRemove = [];
    rowMeshes.forEach((entry, idx) => {
      if (idx < keepMin || idx > keepMax) toRemove.push(idx);
    });
    for (const idx of toRemove) {
      const entry = rowMeshes.get(idx);
      worldRoot.remove(entry.group);
      disposeObject(entry.group);
      rowMeshes.delete(idx);
    }
    if (toRemove.length) {
      // Drop lamp registry entries for pruned rows
      for (let i = streetLamps.length - 1; i >= 0; i--) {
        if (streetLamps[i].row < keepMin || streetLamps[i].row > keepMax) {
          streetLamps.splice(i, 1);
        }
      }
    }
  }

  function applyIdlePose(dt) {
    if (!playerIdleRoot) return;
    idleTime += dt;
    const ud = playerMesh ? playerMesh.userData : {};
    const armL = ud.armL, armR = ud.armR, legL = ud.legL, legR = ud.legR;
    const hopping = player && player.hopT < 1;
    if (hopping) {
      // Squash / stretch / tuck driven from hopT in updatePlayerVisual
      return;
    }
    // Richer idle: breathe, weight shift, arm sway, blink (v1.17)
    const bob = Math.sin(idleTime * 2.4) * 0.042;
    const breathePhase = Math.sin(idleTime * 1.55);
    const breathe = 1 + breathePhase * 0.032;
    const weight = Math.sin(idleTime * 0.85) * 0.055;
    const sway = Math.sin(idleTime * 1.05) * 0.035;
    playerIdleRoot.position.y = bob;
    playerIdleRoot.position.x = weight * 0.08;
    playerIdleRoot.rotation.z = sway + weight * 0.35;
    playerIdleRoot.rotation.x = breathePhase * 0.02;
    // Scale: taller inhale, slight squash on exhale
    playerIdleRoot.scale.set(
      1 + (breathe - 1) * 0.55 - Math.abs(weight) * 0.08,
      breathe,
      1 + (breathe - 1) * 0.45
    );
    if (armL && armR) {
      const armSwing = Math.sin(idleTime * 1.35) * 0.18;
      armL.rotation.x = armSwing;
      armR.rotation.x = -armSwing * 0.85;
      armL.rotation.z = 0.12 + Math.sin(idleTime * 0.9) * 0.06;
      armR.rotation.z = -0.12 - Math.sin(idleTime * 0.9 + 0.4) * 0.06;
    }
    if (legL && legR) {
      legL.rotation.x = weight * 0.25;
      legR.rotation.x = -weight * 0.25;
      legL.position.y = 0.18 - Math.max(0, weight) * 0.02;
      legR.position.y = 0.18 - Math.max(0, -weight) * 0.02;
    }
    // Occasional blink
    const blinkCycle = idleTime % 3.2;
    const blink = blinkCycle > 3.0 && blinkCycle < 3.12 ? 0.12 : 1;
    eyeMeshes.forEach((e) => { e.scale.set(1, blink, 1); });
  }

  function updatePlayerVisual() {
    if (!player || !playerMesh) return;
    const t = Math.min(1, player.hopT);
    const et = easeOutBack(t);
    const col = player.fromCol + (player.toCol - player.fromCol) * et;
    const row = player.fromRow + (player.toRow - player.fromRow) * et;
    const hopY = Math.sin(t * Math.PI) * 0.55;
    playerMesh.position.set(colToX(col), hopY, rowToZ(row));
    let yaw = 0;
    if (player.toRow !== player.fromRow) {
      yaw = player.toRow > player.fromRow ? 0 : Math.PI;
    } else if (player.toCol !== player.fromCol) {
      // Face travel direction in world X (+col = +X → +PI/2)
      yaw = player.toCol > player.fromCol ? Math.PI / 2 : -Math.PI / 2;
    } else if (player.facing < 0) {
      yaw = Math.PI;
    }
    playerMesh.rotation.y = yaw;

    const ud = playerMesh.userData;
    const idle = playerIdleRoot;
    if (t < 1 && idle) {
      // Squash on takeoff → stretch in air → squash on land
      let sx = 1, sy = 1, sz = 1;
      if (t < 0.18) {
        const k = t / 0.18;
        sx = 1.18 - k * 0.1;
        sy = 0.78 + k * 0.22;
        sz = sx;
      } else if (t < 0.72) {
        const k = (t - 0.18) / 0.54;
        const stretch = Math.sin(k * Math.PI);
        sx = 0.88 - stretch * 0.06;
        sy = 1.12 + stretch * 0.18;
        sz = sx;
      } else {
        const k = (t - 0.72) / 0.28;
        sx = 1.0 + Math.sin(k * Math.PI) * 0.16;
        sy = 1.0 - Math.sin(k * Math.PI) * 0.18;
        sz = sx;
      }
      idle.scale.set(sx, sy, sz);
      idle.position.y = 0;
      idle.position.x = 0;
      idle.rotation.z = 0;
      idle.rotation.x = -Math.sin(t * Math.PI) * 0.12;
      // Tuck knees / swing arms
      if (ud.legL && ud.legR) {
        const tuck = Math.sin(t * Math.PI) * 0.55;
        ud.legL.rotation.x = -tuck;
        ud.legR.rotation.x = -tuck * 0.9;
      }
      if (ud.armL && ud.armR) {
        const lift = Math.sin(t * Math.PI) * 0.7;
        ud.armL.rotation.x = -lift;
        ud.armR.rotation.x = -lift * 0.95;
        ud.armL.rotation.z = 0.25;
        ud.armR.rotation.z = -0.25;
      }
      playerMesh.scale.set(1, 1, 1);
    } else {
      playerMesh.scale.set(1, 1, 1);
    }
  }

  function updateCamera(dt) {
    if (!player) return;
    const t = easeOutBack(Math.min(1, player.hopT));
    const pCol = player.fromCol + (player.toCol - player.fromCol) * t;
    const pRow = player.fromRow + (player.toRow - player.fromRow) * t;
    const targetX = colToX(pCol);
    const targetZ = rowToZ(pRow);
    const lerp = 1 - Math.exp(-CAM_LERP * dt);
    cameraX += (targetX - cameraX) * lerp;
    cameraZ += (targetZ - cameraZ) * lerp;

    let ox = 0, oy = 0, oz = 0;
    if (shake > 0) {
      ox = (Math.random() - 0.5) * shake * 0.04;
      oy = (Math.random() - 0.5) * shake * 0.04;
      oz = (Math.random() - 0.5) * shake * 0.04;
    }

    camera.position.set(
      cameraX + ox,
      CAM_HEIGHT + oy,
      cameraZ - CAM_BACK + oz
    );
    camera.lookAt(cameraX, CAM_LOOK_Y, cameraZ + CAM_LOOK_AHEAD);
    const sunY = sunMeshGroup ? sunMeshGroup.position.y : 10;
    const lightY = Math.max(2.5, sunY * 0.85 + 2);
    sun.position.set(cameraX + 10, lightY, cameraZ + 2);
    rim.position.set(cameraX - 6, 6, cameraZ - 4);
    if (typeof updateSkyCycle === "function") {
      // position follow only; dt handled in update/render
      skyRoot.position.x = cameraX;
      skyRoot.position.z = cameraZ;
    }
  }

  function syncVisibleWorld() {
    if (!player) return;
    const center = Math.floor(playerVisualRow());
    const lo = Math.max(0, center - 4);
    const hi = Math.min(rows.length - 1, center + VIEW_ROWS);
    for (let i = lo; i <= hi; i++) {
      if (rows[i]) syncRowMesh(rows[i]);
    }
    pruneFarRows(lo - 2, hi + 2);
  }

  // ─── Audio (SFX + chiptune BGM via Web Audio; Custom Track = MP3) ──
  const AudioFX = (() => {
    let ctx = null;
    let master = null;
    let sfxGain = null;
    let musicGain = null;
    let muted = false;
    let musicVol = musicVolume / 100;
    let sfxVol = sfxVolume / 100;
    let audioStarted = false;
    let lastScoreTick = 0;
    let musicTimer = 0;
    let musicPlaying = false;
    let musicPaused = false;
    let musicNextTime = 0;
    let musicStep = 0;
    const musicSources = new Set();

    // v1.09 — multi-track BGM (Eurobeat + 4 original sky-castle tracks; Ivory Keep remix)
    // Inspiration only: NES / Dn-FamiTracker VRC6+MMC5 palette (pulse, triangle,
    // noise, saw-like lead). Original compositions — not copies of any specific piece.

    const TRACK_IDS = ["eurobeat", "skyspire", "dungeongate", "cloudthrone", "ivorykeep", "custom"];
    const TRACK_LABELS = {
      eurobeat: "Eurobeat",
      skyspire: "Sky Spire",
      dungeongate: "Dungeon Gate",
      cloudthrone: "Cloud Throne",
      ivorykeep: "Ivory Keep",
      custom: "Custom Track",
    };
    const CUSTOM_BGM_SRC = "assets/bgm-custom.mp3";

    let currentTrackId = TRACK_IDS.includes(bgmTrack) ? bgmTrack : "eurobeat";
    let customAudio = null; // HTMLAudioElement for Custom Track MP3
    let customPausedAt = 0;

    function isCustomTrack() {
      return currentTrackId === "custom";
    }

    function ensureCustomAudio() {
      if (customAudio) return customAudio;
      try {
        customAudio = new Audio(CUSTOM_BGM_SRC);
        customAudio.loop = true;
        customAudio.preload = "auto";
        customAudio.volume = Math.max(0, Math.min(1, BGM_VOLUME * musicVol * (muted ? 0 : 1)));
      } catch (_) {
        customAudio = null;
      }
      return customAudio;
    }

    function syncCustomVolume() {
      if (!customAudio) return;
      // Mute is also on master for synth; for HTMLAudio apply mute + musicVol directly
      customAudio.volume = muted ? 0 : Math.max(0, Math.min(1, BGM_VOLUME * musicVol));
    }

    function stopCustomAudio(hard) {
      if (!customAudio) return;
      try {
        customAudio.pause();
        if (hard) {
          customAudio.currentTime = 0;
          customPausedAt = 0;
        } else {
          customPausedAt = customAudio.currentTime || 0;
        }
      } catch (_) {}
    }

    function playCustomAudio(fromPause) {
      const a = ensureCustomAudio();
      if (!a || muted) return;
      syncCustomVolume();
      try {
        if (!fromPause) {
          a.currentTime = 0;
          customPausedAt = 0;
        } else if (customPausedAt > 0) {
          a.currentTime = customPausedAt;
        }
        const p = a.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (_) {}
    }

    // ── Song: Eurobeat (v1.06, ~60s @ 168 BPM) ───────────────
    const EURO_PROG_A = [45, 41, 36, 43];
    const EURO_PROG_B = [45, 48, 41, 43];
    const EURO_PROG_C = [45, 41, 48, 43];
    const EURO_MOTIF_INTRO = [0, -1, 0, -1, 7, -1, 0, -1, 0, -1, 7, -1, 12, -1, 7, -1];
    const EURO_MOTIF_A = [0, 3, 7, 3, 0, 3, 7, 10, 7, 3, 0, 3, 7, 3, 0, 3];
    const EURO_MOTIF_A2 = [0, 3, 7, 12, 7, 3, 0, 3, 7, 10, 7, 12, 10, 7, 3, 0];
    const EURO_MOTIF_B = [0, 4, 7, 4, 0, 4, 7, 12, 7, 4, 0, 4, 7, 11, 7, 4];
    const EURO_MOTIF_CHORUS = [0, 3, 7, 12, 15, 12, 7, 3, 0, 3, 7, 12, 19, 12, 7, 3];
    const EURO_MOTIF_CHORUS2 = [12, 7, 3, 0, 3, 7, 12, 15, 12, 10, 7, 3, 7, 10, 12, 15];
    const EURO_MOTIF_OUTRO = [0, 3, 7, 3, 0, -1, 7, -1, 0, 3, -1, 3, 0, -1, -1, -1];

    function euroSection(bar) {
      if (bar < 4) return "intro";
      if (bar < 12) return "A";
      if (bar < 20) return "B";
      if (bar < 28) return "chorus";
      if (bar < 36) return "bridge";
      return "outro";
    }

    function scheduleEurobeat(s) {
      const { bar, stepInBar, when, STEP, tone, noise, midi } = s;
      const sec = euroSection(bar);
      const i = bar % 4;
      let root = EURO_PROG_A[i];
      if (sec === "B" || sec === "bridge") root = EURO_PROG_B[i];
      else if (sec === "chorus" || sec === "outro") root = EURO_PROG_C[i];

      let energy = 0.85;
      if (sec === "intro") energy = 0.45 + (bar / 4) * 0.35;
      else if (sec === "B") energy = 0.95;
      else if (sec === "chorus") energy = 1.15;
      else if (sec === "bridge") energy = 0.9;
      else if (sec === "outro") energy = 1.05 - (bar - 36) * 0.1;

      const local = bar % 8;
      let motif = EURO_MOTIF_A;
      if (sec === "intro") motif = EURO_MOTIF_INTRO;
      else if (sec === "A") motif = local < 4 ? EURO_MOTIF_A : EURO_MOTIF_A2;
      else if (sec === "B") motif = EURO_MOTIF_B;
      else if (sec === "chorus") motif = local < 4 ? EURO_MOTIF_CHORUS : EURO_MOTIF_CHORUS2;
      else if (sec === "bridge") motif = local < 4 ? EURO_MOTIF_A2 : EURO_MOTIF_B;
      else motif = EURO_MOTIF_OUTRO;

      const deg = motif[stepInBar];
      if (deg != null && deg >= 0) {
        const accent = stepInBar % 4 === 0 ? 1.15 : stepInBar % 2 === 0 ? 1.0 : 0.78;
        const leadVol = 0.12 * energy * accent;
        tone(midi(root + deg), when, STEP * 0.7, "square", leadVol);
        if (sec === "chorus" && stepInBar % 4 === 0) {
          tone(midi(root + deg + 12), when, STEP * 0.35, "square", leadVol * 0.35);
        }
      }
      if (stepInBar % 2 === 0) {
        const bassNote = stepInBar % 8 === 6 ? root + 12 : root;
        tone(midi(bassNote), when, STEP * 1.5, "triangle", 0.18 * Math.min(1.1, energy));
        if (stepInBar === 0 && energy > 0.6) {
          tone(midi(root + 12), when, STEP * 0.38, "square", 0.06 * energy);
        }
      }
      if (stepInBar % 2 === 1) noise(when, STEP * 0.42, 0.04 * energy, 2600);
      if (stepInBar % 4 === 2) noise(when, STEP * 0.55, 0.065 * energy, 1800);
      if (sec === "chorus" && stepInBar % 8 === 4) noise(when, STEP * 0.7, 0.08, 1400);
      if (stepInBar % 4 === 0 && energy > 0.5) {
        tone(midi(root - 12), when, STEP * 0.28, "sine", 0.09 * energy);
      }
    }

    // ── Song: Sky Spire — soaring ascending arps, hope under tension ──
    // Dorian/Aeolian drama, rising patterns. ~126 BPM, 32 bars ≈ 60.95s
    const SKY_PROG = [
      50, 50, 45, 45,
      48, 48, 53, 53,
      50, 50, 48, 43,
      45, 45, 50, 50,
      53, 48, 50, 45,
      50, 53, 55, 57,
      50, 48, 45, 43,
      50, 50, 45, 50,
    ];
    const SKY_ARP_A = [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 15, 12, 7, 3];
    const SKY_ARP_B = [0, 2, 7, 9, 12, 9, 7, 2, 0, 5, 7, 12, 14, 12, 7, 5];
    const SKY_ARP_C = [0, 3, 7, 12, 15, 19, 15, 12, 7, 3, 0, 7, 12, 15, 12, 7];
    const SKY_LEAD = [0, -1, 7, -1, 12, -1, 7, 3, 0, -1, 10, -1, 12, 15, 12, -1];
    const SKY_LEAD2 = [12, 10, 7, 3, 0, 3, 7, 10, 12, -1, 15, -1, 12, 7, 3, 0];

    function scheduleSkySpire(s) {
      const { bar, stepInBar, when, STEP, tone, noise, midi } = s;
      const root = SKY_PROG[bar % SKY_PROG.length];
      const phase = Math.floor(bar / 8);
      let energy = 0.7 + phase * 0.12;
      if (bar >= 28) energy = 0.95 - (bar - 28) * 0.04;

      const arp = phase === 0 ? SKY_ARP_A : phase === 1 ? SKY_ARP_B : phase === 2 ? SKY_ARP_C : SKY_ARP_A;
      const lead = (bar % 8) < 4 ? SKY_LEAD : SKY_LEAD2;

      const adeg = arp[stepInBar];
      if (adeg != null && adeg >= 0) {
        const av = 0.055 * energy * (stepInBar % 4 === 0 ? 1.2 : 0.85);
        tone(midi(root + adeg + 12), when, STEP * 0.55, "sawtooth", av);
      }

      const ldeg = lead[stepInBar];
      if (ldeg != null && ldeg >= 0 && phase >= 1) {
        const lv = 0.11 * energy * (stepInBar % 4 === 0 ? 1.15 : 0.9);
        tone(midi(root + ldeg + 12), when, STEP * 0.65, "square", lv);
        if (phase >= 2 && stepInBar % 8 === 0) {
          tone(midi(root + ldeg + 24), when, STEP * 0.3, "square", lv * 0.28);
        }
      }

      if (stepInBar % 4 === 0) {
        tone(midi(root + 7), when, STEP * 1.8, "square", 0.045 * energy);
      }

      if (stepInBar % 2 === 0) {
        const walk = [0, 0, 3, 7, 0, -2, 0, 5][(stepInBar / 2) | 0];
        tone(midi(root + walk), when, STEP * 1.4, "triangle", 0.16 * energy);
      }

      if (stepInBar % 2 === 1) noise(when, STEP * 0.35, 0.028 * energy, 3200);
      if (stepInBar % 8 === 4) noise(when, STEP * 0.5, 0.04 * energy, 2000);
      if (stepInBar % 4 === 0) {
        tone(midi(root - 12), when, STEP * 0.22, "sine", 0.07 * energy);
      }
    }

    // ── Song: Dungeon Gate — darker, heavier, final-boss foyer ──
    // Slow ominous pulse. ~96 BPM, 24 bars ≈ 60.0s
    const GATE_PROG = [
      36, 36, 34, 34,
      31, 31, 36, 36,
      29, 29, 34, 34,
      36, 38, 39, 36,
      34, 31, 29, 31,
      36, 36, 31, 36,
    ];
    const GATE_MOTIF = [0, -1, -1, -1, 3, -1, -1, 7, 0, -1, 5, -1, 7, -1, 3, -1];
    const GATE_MOTIF2 = [0, -1, 7, -1, 12, -1, 7, -1, 5, -1, 3, -1, 0, -1, -5, -1];
    const GATE_MOTIF3 = [0, 3, -1, 7, -1, 12, -1, 10, 7, -1, 5, -1, 3, 0, -1, -1];

    function scheduleDungeonGate(s) {
      const { bar, stepInBar, when, STEP, tone, noise, midi } = s;
      const root = GATE_PROG[bar % GATE_PROG.length];
      const phase = Math.floor(bar / 8);
      let energy = 0.75 + phase * 0.1;
      if (bar >= 20) energy = 0.85;

      if (stepInBar % 4 === 0) {
        tone(midi(root), when, STEP * 3.2, "triangle", 0.22 * energy);
        tone(midi(root - 12), when, STEP * 2.6, "sine", 0.1 * energy);
      }
      if (stepInBar === 8) {
        tone(midi(root + 7), when, STEP * 2.0, "square", 0.06 * energy);
      }

      const motif = phase === 0 ? GATE_MOTIF : phase === 1 ? GATE_MOTIF2 : GATE_MOTIF3;
      const deg = motif[stepInBar];
      if (deg != null && deg >= 0) {
        const lv = 0.1 * energy;
        tone(midi(root + deg + 12), when, STEP * 0.9, "square", lv);
        if (stepInBar % 8 === 0) {
          tone(midi(root + deg + 19), when, STEP * 0.7, "sawtooth", lv * 0.35);
        }
      }

      if (stepInBar % 4 === 2) noise(when, STEP * 0.6, 0.05 * energy, 1400);
      if (stepInBar % 8 === 0) noise(when, STEP * 0.35, 0.06 * energy, 900);
      if (stepInBar === 12) noise(when, STEP * 0.8, 0.045 * energy, 700);
      if (stepInBar === 4 || stepInBar === 12) {
        tone(midi(root - 5), when, STEP * 0.4, "triangle", 0.08 * energy);
      }
    }

    // ── Song: Cloud Throne — mid-tempo march / eurobeat×dungeon hybrid ──
    // ~140 BPM, 36 bars ≈ 61.7s
    const THRONE_PROG_A = [48, 45, 41, 43];
    const THRONE_PROG_B = [48, 50, 45, 43];
    const THRONE_PROG_C = [53, 50, 48, 43];
    const THRONE_MARCH = [0, -1, 0, -1, 7, -1, 0, 3, 0, -1, 5, -1, 7, -1, 12, -1];
    const THRONE_DRIVE = [0, 3, 7, 3, 0, 3, 7, 10, 12, 10, 7, 3, 7, 10, 12, 15];
    const THRONE_LIFT = [12, 7, 3, 0, 3, 7, 12, 15, 19, 15, 12, 7, 10, 12, 15, 19];

    function throneSection(bar) {
      if (bar < 4) return "intro";
      if (bar < 12) return "march";
      if (bar < 20) return "drive";
      if (bar < 28) return "lift";
      return "seam";
    }

    function scheduleCloudThrone(s) {
      const { bar, stepInBar, when, STEP, tone, noise, midi } = s;
      const sec = throneSection(bar);
      const i = bar % 4;
      let root = THRONE_PROG_A[i];
      if (sec === "drive" || sec === "seam") root = THRONE_PROG_B[i];
      if (sec === "lift") root = THRONE_PROG_C[i];

      let energy = 0.85;
      if (sec === "intro") energy = 0.55 + bar * 0.08;
      else if (sec === "march") energy = 0.9;
      else if (sec === "drive") energy = 1.05;
      else if (sec === "lift") energy = 1.2;
      else energy = 0.95 - (bar - 28) * 0.05;

      let motif = THRONE_MARCH;
      if (sec === "drive") motif = THRONE_DRIVE;
      else if (sec === "lift") motif = THRONE_LIFT;
      else if (sec === "seam") motif = THRONE_MARCH;

      const deg = motif[stepInBar];
      if (deg != null && deg >= 0) {
        const accent = stepInBar % 4 === 0 ? 1.2 : stepInBar % 2 === 0 ? 1.0 : 0.8;
        const lv = 0.115 * energy * accent;
        tone(midi(root + deg + 12), when, STEP * 0.62, "square", lv);
        if ((sec === "lift" || sec === "drive") && stepInBar % 4 === 0) {
          tone(midi(root + deg + 12), when, STEP * 0.4, "sawtooth", lv * 0.4);
        }
      }

      if (stepInBar % 2 === 0) {
        const bassOct = stepInBar % 8 === 4 ? 12 : 0;
        tone(midi(root + bassOct), when, STEP * 1.45, "triangle", 0.19 * Math.min(1.15, energy));
      }
      if (stepInBar % 4 === 2 && energy > 0.7) {
        tone(midi(root + 7), when, STEP * 0.35, "square", 0.05 * energy);
      }

      if (stepInBar % 2 === 1) noise(when, STEP * 0.38, 0.035 * energy, 2800);
      if (stepInBar % 4 === 2) noise(when, STEP * 0.55, 0.07 * energy, 1600);
      if (stepInBar % 8 === 4 && (sec === "drive" || sec === "lift")) {
        noise(when, STEP * 0.65, 0.085, 1200);
      }
      if (stepInBar % 4 === 0) {
        tone(midi(root - 12), when, STEP * 0.25, "sine", 0.095 * energy);
      }
    }


    // ── Song: Ivory Keep — haunted majestic castle ascent (v1.09) ──
    // Soft Aeolian / soft Dorian drama. Fuller non-chip mix: sine pads,
    // long triangle sustains, warm saw leads, delayed octave/fifth echoes,
    // rounded sine kicks + soft noise hats. Pace matched to Tower of Dreams
    // feel (~152 BPM). 38 bars × 16 steps ≈ 60.0s. Original melody.
    const KEEP_PROG_A = [45, 41, 38, 43]; // Am F Dm G
    const KEEP_PROG_B = [45, 48, 41, 43]; // Am C F G
    const KEEP_PROG_C = [48, 50, 45, 43]; // C D Am G
    const KEEP_PROG_D = [45, 41, 43, 45]; // Am F G Am
    // Soaring lead motifs (fewer rests than v1.08; longer phrase feel)
    const KEEP_LEAD = [0, -1, 3, 7, 12, -1, 10, 7, 5, -1, 7, 3, 0, 5, 7, -1];
    const KEEP_LEAD2 = [12, 10, 7, -1, 3, 7, 12, 15, 12, -1, 10, 7, 5, 3, 0, -1];
    const KEEP_LEAD3 = [0, 3, 7, 12, -1, 15, 12, 10, 7, 10, 12, -1, 7, 5, 3, 0];
    const KEEP_ECHO = [0, -1, -1, 7, -1, -1, 12, -1, 7, -1, 3, -1, 5, 7, -1, -1];
    const KEEP_ARP = [0, 3, 7, 12, 7, 3, 0, 7, 3, 7, 12, 15, 12, 7, 3, 0];
    const KEEP_ARP2 = [0, 5, 7, 12, 10, 7, 5, 0, 3, 7, 10, 14, 12, 10, 7, 3];
    const KEEP_SEAM = [0, -1, 7, -1, 3, -1, 5, -1, 0, -1, 7, -1, 12, -1, -1, -1];

    function keepSection(bar) {
      if (bar < 6) return "intro";
      if (bar < 16) return "build";
      if (bar < 28) return "peak";
      if (bar < 34) return "soft";
      return "seam";
    }

    function scheduleIvoryKeep(s) {
      const { bar, stepInBar, when, STEP, tone, noise, midi } = s;
      const sec = keepSection(bar);
      const i = bar % 4;
      let root = KEEP_PROG_A[i];
      if (sec === "build") root = KEEP_PROG_B[i];
      else if (sec === "peak") root = KEEP_PROG_C[i];
      else if (sec === "soft" || sec === "seam") root = KEEP_PROG_D[i];

      let energy = 0.85;
      if (sec === "intro") energy = 0.38 + bar * 0.07;
      else if (sec === "build") energy = 0.72 + (bar - 6) * 0.028;
      else if (sec === "peak") energy = 1.12;
      else if (sec === "soft") energy = 0.82;
      else energy = 0.68 - (bar - 34) * 0.05;

      // Soft sine pad / long triangle sustain (holds chord tones)
      if (stepInBar === 0) {
        const padVol = 0.055 * energy;
        const hold = STEP * 14.5;
        tone(midi(root), when, hold, "sine", padVol * 0.9);
        tone(midi(root + 7), when, hold, "sine", padVol * 0.55);
        tone(midi(root + 12), when, hold * 0.95, "triangle", padVol * 0.7);
        if (sec === "peak" || sec === "build") {
          tone(midi(root + 3), when, hold * 0.9, "sine", padVol * 0.35);
        }
      }
      // Gentle mid-bar pad refresh (fifth) so sustain breathes
      if (stepInBar === 8 && (sec === "build" || sec === "peak" || sec === "soft")) {
        tone(midi(root + 7), when, STEP * 7.2, "sine", 0.03 * energy);
        tone(midi(root + 12), when, STEP * 6.5, "triangle", 0.028 * energy);
      }

      // Soft rising arp bed (warmer saw, lower harshness than v1.08)
      let arp = null;
      if (sec === "build") arp = (bar % 8) < 4 ? KEEP_ARP : KEEP_ARP2;
      else if (sec === "peak") arp = (bar % 8) < 4 ? KEEP_ARP2 : KEEP_ARP;
      else if (sec === "soft") arp = KEEP_ARP;
      if (arp && stepInBar % 2 === 0) {
        const adeg = arp[stepInBar];
        if (adeg != null && adeg >= 0) {
          const av = 0.038 * energy * (stepInBar % 4 === 0 ? 1.1 : 0.75);
          tone(midi(root + adeg + 12), when, STEP * 0.95, "sawtooth", av);
          // quiet octave shimmer
          tone(midi(root + adeg + 24), when, STEP * 0.7, "sine", av * 0.35);
        }
      }

      // Warm saw / soft triangle lead (less square blip)
      let motif = KEEP_ECHO;
      if (sec === "intro") motif = (bar % 2 === 0) ? KEEP_ECHO : KEEP_LEAD;
      else if (sec === "build") motif = (bar % 8) < 4 ? KEEP_LEAD : KEEP_LEAD2;
      else if (sec === "peak") motif = (bar % 8) < 4 ? KEEP_LEAD2 : KEEP_LEAD3;
      else if (sec === "soft") motif = KEEP_LEAD;
      else motif = KEEP_SEAM;

      const deg = motif[stepInBar];
      if (deg != null && deg >= 0) {
        const accent = stepInBar % 8 === 0 ? 1.18 : stepInBar % 4 === 0 ? 1.05 : 0.9;
        const lv = 0.095 * energy * accent;
        // Main warm saw lead
        tone(midi(root + deg + 12), when, STEP * 1.15, "sawtooth", lv);
        // Soft triangle body under it
        tone(midi(root + deg + 12), when, STEP * 1.35, "triangle", lv * 0.45);
        // Fake reverb / delayed echo: quieter tone octave or fifth above, delayed
        const echoDelay = STEP * 2.05;
        const echoDeg = (stepInBar % 8 < 4) ? 12 : 7;
        tone(midi(root + deg + 12 + echoDeg), when + echoDelay, STEP * 1.0, "sine", lv * 0.28);
        if (sec === "peak" && stepInBar % 8 === 0) {
          tone(midi(root + deg + 24), when, STEP * 0.55, "sine", lv * 0.32);
          tone(midi(root + deg + 19), when + STEP * 1.1, STEP * 0.8, "sine", lv * 0.22);
        } else if ((sec === "build" || sec === "soft") && stepInBar % 8 === 0) {
          tone(midi(root + deg + 19), when + STEP * 1.5, STEP * 0.9, "sine", lv * 0.24);
        }
      }

      // Deep triangle bass + rounded sine kick on downbeats
      if (stepInBar % 4 === 0) {
        tone(midi(root), when, STEP * 2.8, "triangle", 0.185 * Math.min(1.1, energy));
        // Rounded kick: short low sine thump
        tone(midi(root - 12), when, STEP * 0.42, "sine", 0.11 * energy);
        tone(midi(Math.max(24, root - 24)), when, STEP * 0.22, "sine", 0.07 * energy);
      } else if (stepInBar % 2 === 0 && (sec === "build" || sec === "peak")) {
        const walk = [0, 0, 3, 7, 0, -2, 0, 5][(stepInBar / 2) | 0];
        tone(midi(root + walk), when, STEP * 1.35, "triangle", 0.12 * energy);
      }
      // Soft fifth pedal mid-bar
      if (stepInBar === 8 && energy > 0.5) {
        tone(midi(root + 7), when, STEP * 1.8, "triangle", 0.035 * energy);
      }

      // Soft noise hats (less dense / lower than v1.08 chip blips)
      if (stepInBar % 4 === 2 && energy > 0.45) noise(when, STEP * 0.28, 0.022 * energy, 4200);
      if (stepInBar % 8 === 0) noise(when, STEP * 0.35, 0.04 * energy, 900);
      if (stepInBar % 8 === 4 && (sec === "build" || sec === "peak")) {
        noise(when, STEP * 0.4, 0.032 * energy, 2200);
      }
      if (sec === "peak" && stepInBar === 12) noise(when, STEP * 0.55, 0.045, 1400);
      // Gentle open-hat shimmer on intro/seam (very soft)
      if ((sec === "intro" || sec === "seam") && stepInBar === 14) {
        noise(when, STEP * 0.5, 0.018 * energy, 5000);
      }
    }

    const SONGS = {
      eurobeat: {
        id: "eurobeat",
        label: TRACK_LABELS.eurobeat,
        bpm: 168,
        stepsPerBar: 16,
        loopBars: 42,
        schedule: scheduleEurobeat,
      },
      skyspire: {
        id: "skyspire",
        label: TRACK_LABELS.skyspire,
        bpm: 126,
        stepsPerBar: 16,
        loopBars: 32,
        schedule: scheduleSkySpire,
      },
      dungeongate: {
        id: "dungeongate",
        label: TRACK_LABELS.dungeongate,
        bpm: 96,
        stepsPerBar: 16,
        loopBars: 24,
        schedule: scheduleDungeonGate,
      },
      cloudthrone: {
        id: "cloudthrone",
        label: TRACK_LABELS.cloudthrone,
        bpm: 140,
        stepsPerBar: 16,
        loopBars: 36,
        schedule: scheduleCloudThrone,
      },
      ivorykeep: {
        id: "ivorykeep",
        label: TRACK_LABELS.ivorykeep,
        bpm: 152,
        stepsPerBar: 16,
        loopBars: 38,
        schedule: scheduleIvoryKeep,
      },
      custom: {
        id: "custom",
        label: TRACK_LABELS.custom,
        bpm: 120,
        stepsPerBar: 16,
        loopBars: 41, // ~82s @ 120 BPM meta only; actual is HTMLAudio loop
        schedule: null, // MP3 path — do not run chiptune scheduler
        mp3: true,
      },
    };

    function getSong() {
      return SONGS[currentTrackId] || SONGS.eurobeat;
    }

    function songMeta(song) {
      const step = 60 / song.bpm / 4;
      const loopSteps = song.loopBars * song.stepsPerBar;
      return { step, loopSteps, loopSeconds: loopSteps * step };
    }

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
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = SFX_GAIN_BASE * sfxVol;
      sfxGain.connect(master);

      musicGain = ctx.createGain();
      musicGain.gain.value = BGM_VOLUME * musicVol;
      musicGain.connect(master);

      applyMuteGain();
      applyMusicGain();
      applySfxGain();
      return ctx;
    }

    function applyMuteGain() {
      if (master && ctx) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(muted ? 0 : 1, now);
      }
      syncCustomVolume();
    }

    function applyMusicGain() {
      if (musicGain && ctx) {
        const now = ctx.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        // Mute is handled by master. While paused/stopped, force music bus silent.
        musicGain.gain.setValueAtTime(musicPlaying ? BGM_VOLUME * musicVol : 0, now);
      }
    }

    function applySfxGain() {
      if (sfxGain && ctx) {
        const now = ctx.currentTime;
        sfxGain.gain.cancelScheduledValues(now);
        sfxGain.gain.setValueAtTime(SFX_GAIN_BASE * sfxVol, now);
      }
    }

    function resume() {
      const c = ensureCtx();
      if (!c) return;
      if (c.state === "suspended") c.resume();
    }

    function unlock() {
      resume();
      audioStarted = true;
      if (!muted && !musicPaused) startMusic();
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

    function musicTone(freq, when, dur, type, vol) {
      if (!ctx || !musicGain) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, when);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol, when + 0.008);
      g.gain.setValueAtTime(vol * 0.72, when + Math.max(0.012, dur * 0.48));
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(g);
      g.connect(musicGain);
      musicSources.add(osc);
      osc.onended = () => musicSources.delete(osc);
      osc.start(when);
      osc.stop(when + dur + 0.025);
    }

    function musicNoise(when, dur, vol, freq) {
      if (!ctx || !musicGain) return;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(freq || 2200, when);
      filter.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol, when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(musicGain);
      musicSources.add(src);
      src.onended = () => musicSources.delete(src);
      src.start(when);
      src.stop(when + dur + 0.02);
    }

    function midiToHz(note) {
      return 440 * Math.pow(2, (note - 69) / 12);
    }

    function killMusicSources() {
      musicSources.forEach((osc) => {
        try { osc.stop(0); } catch (_) {}
      });
      musicSources.clear();
    }

    function scheduleMusic() {
      if (!musicPlaying || !ctx || muted) return;
      const song = getSong();
      if (!song || !song.schedule || song.mp3) return; // Custom Track uses HTMLAudio
      const meta = songMeta(song);
      const STEP = meta.step;
      const LOOP_STEPS = meta.loopSteps;
      const STEPS_PER_BAR = song.stepsPerBar;
      const horizon = ctx.currentTime + 0.25;
      const stepCtx = {
        STEP,
        tone: musicTone,
        noise: musicNoise,
        midi: midiToHz,
      };
      while (musicNextTime < horizon) {
        const step = musicStep % LOOP_STEPS;
        const bar = Math.floor(step / STEPS_PER_BAR);
        const stepInBar = step % STEPS_PER_BAR;
        stepCtx.step = step;
        stepCtx.bar = bar;
        stepCtx.stepInBar = stepInBar;
        stepCtx.when = musicNextTime;
        song.schedule(stepCtx);
        musicStep = (musicStep + 1) % LOOP_STEPS;
        musicNextTime += STEP;
      }
      musicTimer = window.setTimeout(scheduleMusic, 40);
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
      if (slideDown) filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
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

    /** Brief BGM duck (non-fatal hit). Does not stop music. */
    function duckMusic(sec) {
      if (!audioStarted || muted || !musicPlaying || musicPaused) return;
      const dur = Math.max(0.2, Math.min(2.5, sec == null ? 0.45 : sec));
      if (isCustomTrack() && customAudio) {
        const base = Math.max(0, Math.min(1, BGM_VOLUME * musicVol));
        try {
          customAudio.volume = base * 0.18;
          window.setTimeout(() => {
            if (customAudio && isCustomTrack() && musicPlaying && !muted) {
              customAudio.volume = base;
            }
          }, Math.floor(dur * 1000));
        } catch (_) {}
        return;
      }
      const c = ensureCtx();
      if (!c || !musicGain) return;
      const now = c.currentTime;
      const base = BGM_VOLUME * musicVol;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(base, now);
      musicGain.gain.linearRampToValueAtTime(base * 0.18, now + 0.05);
      musicGain.gain.linearRampToValueAtTime(base, now + dur);
    }

    function uiClick() {
      if (muted) return;
      resume();
      tone(660, 0.05, "triangle", sfxGain, 0.14);
      tone(880, 0.06, "triangle", sfxGain, 0.1);
    }

    function scoreTick(sc) {
      if (!audioStarted || muted) return;
      if (sc <= 0 || sc % 5 !== 0) return;
      if (sc === lastScoreTick) return;
      lastScoreTick = sc;
      resume();
      tone(440 + Math.min(sc, 40) * 4, 0.06, "square", sfxGain, 0.1);
      tone(660 + Math.min(sc, 40) * 3, 0.08, "triangle", sfxGain, 0.08);
    }

    function combo() {
      if (!audioStarted || muted) return;
      resume();
      tone(523.25, 0.08, "square", sfxGain, 0.18);
      tone(659.25, 0.1, "square", sfxGain, 0.16);
      tone(783.99, 0.14, "triangle", sfxGain, 0.2);
      tone(1046.5, 0.18, "triangle", sfxGain, 0.12);
    }

    function startMusic() {
      if (!audioStarted || muted) return;
      if (musicPlaying) return;
      const c = ensureCtx();
      if (!c && !isCustomTrack()) return;
      resume();
      musicPaused = false;
      musicPlaying = true;
      musicStep = 0;
      if (isCustomTrack()) {
        // Stop any leftover synth voices; drive HTMLAudio MP3
        if (musicTimer) { window.clearTimeout(musicTimer); musicTimer = 0; }
        killMusicSources();
        if (musicGain && c) {
          musicGain.gain.cancelScheduledValues(c.currentTime);
          musicGain.gain.setValueAtTime(0, c.currentTime);
        }
        playCustomAudio(false);
        return;
      }
      stopCustomAudio(true);
      if (musicGain && c) {
        musicGain.gain.cancelScheduledValues(c.currentTime);
        musicGain.gain.setValueAtTime(BGM_VOLUME * musicVol, c.currentTime);
      }
      musicNextTime = c.currentTime + 0.04;
      scheduleMusic();
    }

    function pauseMusic() {
      // Soft pause — keep musicStep / customPausedAt so resume continues mid-song
      if (!musicPlaying && musicPaused) return;
      musicPlaying = false;
      musicPaused = true;
      if (musicTimer) {
        window.clearTimeout(musicTimer);
        musicTimer = 0;
      }
      if (isCustomTrack() || (customAudio && !customAudio.paused)) {
        stopCustomAudio(false);
      }
      if (musicGain && ctx) {
        const now = ctx.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setValueAtTime(0, now);
      }
      killMusicSources();
    }

    function resumeMusic() {
      if (!audioStarted || muted) return;
      if (musicPlaying) return;
      const c = ensureCtx();
      if (!c && !isCustomTrack()) return;
      resume();
      musicPaused = false;
      musicPlaying = true;
      if (isCustomTrack()) {
        if (musicGain && c) {
          musicGain.gain.cancelScheduledValues(c.currentTime);
          musicGain.gain.setValueAtTime(0, c.currentTime);
        }
        playCustomAudio(true);
        return;
      }
      stopCustomAudio(true);
      if (musicGain && c) {
        musicGain.gain.cancelScheduledValues(c.currentTime);
        musicGain.gain.setValueAtTime(BGM_VOLUME * musicVol, c.currentTime);
      }
      musicNextTime = c.currentTime + 0.04;
      scheduleMusic();
    }

    function stopMusic() {
      // Hard cut — no BGM fade-out (death / mute / quit)
      musicPlaying = false;
      musicPaused = false;
      musicStep = 0;
      if (musicTimer) {
        window.clearTimeout(musicTimer);
        musicTimer = 0;
      }
      stopCustomAudio(true);
      if (musicGain && ctx) {
        const now = ctx.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setValueAtTime(0, now);
      }
      killMusicSources();
    }

    function setMuted(next) {
      muted = !!next;
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch (_) {}
      ensureCtx();
      applyMuteGain();
      syncMuteUi();
      if (muted) {
        const keepPaused = musicPaused || musicPlaying;
        stopMusic();
        if (keepPaused && typeof paused !== "undefined" && paused) {
          musicPaused = true;
        }
      } else if (audioStarted) {
        if (typeof paused !== "undefined" && paused) {
          musicPaused = true;
        } else {
          startMusic();
        }
      }
    }

    function toggleMute() {
      setMuted(!muted);
    }

    function setMusicVolume(pct) {
      musicVol = Math.max(0, Math.min(1, pct / 100));
      try {
        localStorage.setItem(VOLUME_KEY, String(Math.round(pct)));
      } catch (_) {}
      ensureCtx();
      syncCustomVolume();
      if (musicPlaying && !isCustomTrack() && musicGain && ctx) {
        const now = ctx.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setValueAtTime(BGM_VOLUME * musicVol, now);
      }
    }

    function setSfxVolume(pct) {
      sfxVol = Math.max(0, Math.min(1, pct / 100));
      try {
        localStorage.setItem(SFX_VOLUME_KEY, String(Math.round(pct)));
      } catch (_) {}
      ensureCtx();
      applySfxGain();
    }

    // Back-compat alias used by older call sites
    function setVolume(pct) {
      setMusicVolume(pct);
    }

    function resetScoreTick() {
      lastScoreTick = 0;
    }

    function setTrack(id, opts) {
      opts = opts || {};
      if (!SONGS[id]) return false;
      const changed = id !== currentTrackId;
      currentTrackId = id;
      bgmTrack = id;
      try {
        localStorage.setItem(BGM_TRACK_KEY, id);
      } catch (_) {}

      // If game is paused, remember pause and reset step for new song on resume.
      if (musicPaused && !opts.preview) {
        musicStep = 0;
        return true;
      }

      const wasPlaying = musicPlaying;
      if (wasPlaying || opts.forceRestart || opts.preview) {
        stopMusic();
        if (!muted) {
          if (opts.preview) audioStarted = true;
          startMusic();
        }
      } else if (changed) {
        musicStep = 0;
      }
      return true;
    }

    function previewTrack() {
      resume();
      audioStarted = true;
      if (muted) return false;
      musicPaused = false;
      stopMusic();
      startMusic();
      return true;
    }

    function getTrack() {
      return currentTrackId;
    }

    function listTracks() {
      return TRACK_IDS.map((id) => {
        const song = SONGS[id];
        let loopSeconds = songMeta(song).loopSeconds;
        if (song && song.mp3) loopSeconds = 82; // assets/bgm-custom.mp3 ≈ 82s
        return { id, label: TRACK_LABELS[id], loopSeconds };
      });
    }

    syncMuteUi();

    return {

      unlock,
      hop,
      crash,
      duckMusic,
      uiClick,
      scoreTick,
      combo,
      resetScoreTick,
      toggleMute,
      setMuted,
      isMuted: () => muted,
      setVolume,
      setMusicVolume,
      setSfxVolume,
      getVolume: () => Math.round(musicVol * 100),
      getMusicVolume: () => Math.round(musicVol * 100),
      getSfxVolume: () => Math.round(sfxVol * 100),
      startMusic,
      stopMusic,
      pauseMusic,
      resumeMusic,
      isMusicPaused: () => musicPaused,
      isMusicPlaying: () => musicPlaying,
      setTrack,
      getTrack,
      previewTrack,
      listTracks,
      trackIds: TRACK_IDS,
      trackLabels: TRACK_LABELS,
      get loopSeconds() { return songMeta(getSong()).loopSeconds; },
      get loopSteps() { return songMeta(getSong()).loopSteps; },
    };
  })();

  // ─── Character select carousel (v1.16) ────────────────────
  function syncCharSelectUi() {
    const ch = CHARACTERS[selectedChar] || CHARACTERS.capkid;
    if (charSelectEl) charSelectEl.setAttribute("data-char", ch.id);
    if (charNameLabel) charNameLabel.textContent = ch.label || ch.id;
    if (charPreviewCanvas) charPreviewCanvas.setAttribute("data-preview", ch.id);
    charDots.forEach((dot) => {
      const id = dot.getAttribute("data-char");
      const on = id === selectedChar;
      dot.classList.toggle("selected", on);
      dot.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function charIndexOf(id) {
    const i = CHAR_ORDER.indexOf(id);
    return i >= 0 ? i : 0;
  }

  function cycleCharacter(delta) {
    const i = charIndexOf(selectedChar);
    const next = CHAR_ORDER[(i + delta + CHAR_ORDER.length) % CHAR_ORDER.length];
    setCharacter(next);
  }

  function setCharacter(id) {
    if (!CHARACTERS[id]) return;
    selectedChar = id;
    try {
      localStorage.setItem(CHAR_KEY, id);
    } catch (_) {}
    syncCharSelectUi();
    if (player) {
      ensurePlayerMesh();
      updatePlayerVisual();
    }
  }

  function drawCharPreviews(tSec) {
    const t = tSec == null ? idleTime : tSec;
    const canvases = [];
    if (charPreviewCanvas) canvases.push(charPreviewCanvas);
    else document.querySelectorAll("canvas.char-preview").forEach((c) => canvases.push(c));
    canvases.forEach((c) => {
      const id = c.getAttribute("data-preview") || selectedChar;
      const ch = CHARACTERS[id];
      if (!ch) return;
      const pctx = c.getContext("2d");
      const s = c.width;
      pctx.clearRect(0, 0, s, s);
      pctx.fillStyle = "rgba(255,255,255,0.08)";
      pctx.beginPath();
      pctx.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2);
      pctx.fill();
      const bob = Math.sin(t * 2.4) * s * 0.022;
      const breathe = 1 + Math.sin(t * 1.55) * 0.038;
      const sway = Math.sin(t * 1.05) * 0.055;
      const weight = Math.sin(t * 0.85) * 0.03;
      pctx.save();
      pctx.translate(s / 2 + weight * s * 0.04, s / 2 + s * 0.04 + bob);
      pctx.rotate(sway + weight * 0.4);
      pctx.scale(breathe * 0.98, breathe);
      const blinkCycle = t % 3.2;
      const eyeScaleY = blinkCycle > 3.0 && blinkCycle < 3.12 ? 0.15 : 1;
      drawCharacterAt(pctx, 0, 0, s * 0.34, ch, 1, eyeScaleY);
      pctx.restore();
    });
  }

  function drawCharacterAt(c, x, y, radius, ch, facing, eyeScaleY) {
    const esy = eyeScaleY == null ? 1 : eyeScaleY;
    c.save();
    c.translate(x, y);
    // Blocky Crossy-Road chibi (matches THREE mesh / Draft A)
    // shirt torso
    c.fillStyle = ch.shirt || ch.accent;
    c.fillRect(-radius * 0.40, radius * 0.02, radius * 0.80, radius * 0.62);
    // short sleeves
    c.fillRect(-radius * 0.58, radius * 0.06, radius * 0.18, radius * 0.22);
    c.fillRect(radius * 0.40, radius * 0.06, radius * 0.18, radius * 0.22);
    // hands
    c.fillStyle = ch.body;
    c.fillRect(-radius * 0.56, radius * 0.26, radius * 0.14, radius * 0.18);
    c.fillRect(radius * 0.42, radius * 0.26, radius * 0.14, radius * 0.18);
    // pants
    c.fillStyle = ch.pants || ch.accent;
    c.fillRect(-radius * 0.34, radius * 0.62, radius * 0.28, radius * 0.30);
    c.fillRect(radius * 0.06, radius * 0.62, radius * 0.28, radius * 0.30);
    // shoes
    c.fillStyle = ch.shoes || "#333333";
    c.fillRect(-radius * 0.36, radius * 0.88, radius * 0.32, radius * 0.14);
    c.fillRect(radius * 0.04, radius * 0.88, radius * 0.32, radius * 0.14);
    // big blocky head
    c.fillStyle = ch.body;
    c.fillRect(-radius * 0.52, -radius * 0.72, radius * 1.04, radius * 0.82);
    // hair under / sides of cap
    c.fillStyle = ch.hair;
    c.fillRect(-radius * 0.48, -radius * 0.42, radius * 0.96, radius * 0.18);
    c.fillRect(-radius * 0.54, -radius * 0.48, radius * 0.12, radius * 0.30);
    c.fillRect(radius * 0.42, -radius * 0.48, radius * 0.12, radius * 0.30);
    // cap crown
    c.fillStyle = ch.cap || ch.accent;
    c.fillRect(-radius * 0.56, -radius * 0.92, radius * 1.12, radius * 0.38);
    // bill
    c.fillStyle = ch.capBill || ch.detail;
    c.fillRect(-radius * 0.42, -radius * 0.58, radius * 0.84, radius * 0.14);
    // white button
    c.fillStyle = "#ffffff";
    c.fillRect(-radius * 0.08, -radius * 0.98, radius * 0.16, radius * 0.12);
    // tall dark eyes + white glints
    const eyeY = -radius * 0.18;
    const eyeX = radius * 0.26;
    c.fillStyle = ch.pupil || "#1a1a1a";
    c.save();
    c.translate(-eyeX, eyeY);
    c.scale(1, esy);
    c.fillRect(-radius * 0.12, -radius * 0.18, radius * 0.24, radius * 0.36);
    c.restore();
    c.save();
    c.translate(eyeX, eyeY);
    c.scale(1, esy);
    c.fillRect(-radius * 0.12, -radius * 0.18, radius * 0.24, radius * 0.36);
    c.restore();
    if (esy > 0.4) {
      c.fillStyle = ch.eye || "#ffffff";
      c.fillRect(-eyeX - radius * 0.06, eyeY - radius * 0.10, radius * 0.10, radius * 0.10);
      c.fillRect(eyeX - radius * 0.06, eyeY - radius * 0.10, radius * 0.10, radius * 0.10);
    }
    // simple smile
    c.strokeStyle = "#2b2d42";
    c.lineWidth = Math.max(1.5, radius * 0.07);
    c.lineCap = "round";
    c.beginPath();
    c.arc(0, radius * 0.05, radius * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
    c.restore();
  }

  // ─── Combo ────────────────────────────────────────────────
  function resetCombo() {
    comboLevel = 0;
    lastComboMilestone = 0;
    comboFlashTimer = 0;
    comboHud.classList.add("hidden");
    comboFlash.classList.add("hidden");
    comboFlashText.style.animation = "none";
  }

  function checkComboMilestones() {
    if (score < COMBO_STEP) return;
    const level = Math.floor(score / COMBO_STEP);
    if (level <= lastComboMilestone) return;
    for (let lv = lastComboMilestone + 1; lv <= level; lv++) {
      triggerCombo(lv);
    }
    lastComboMilestone = level;
    comboLevel = level;
  }

  function triggerCombo(level) {
    comboLevel = level;
    comboHud.textContent = `COMBO x${level}`;
    comboHud.classList.remove("hidden");
    comboFlashText.textContent = `COMBO x${level}`;
    comboFlash.classList.remove("hidden");
    comboFlashText.style.animation = "none";
    void comboFlashText.offsetWidth;
    comboFlashText.style.animation = "";
    comboFlashTimer = 0.95;
    AudioFX.combo();
  }

  // ─── Resize ───────────────────────────────────────────────
  function resize() {
    const app = document.getElementById("app");
    const rect = app.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width));
    H = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", () => {
    resize();
  });
  resize();

  // ─── Row / traffic generation ─────────────────────────────
  function difficulty() {
    return Math.min(1, score / 120);
  }

  function makeGrassRow(index) {
    const trees = [];
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
    return { type: "grass", index, trees, blocks: [], shade: index % 2 };
  }

  function makeRoadRow(index) {
    const d = difficulty();
    const dir = Math.random() < 0.5 ? 1 : -1;
    const vehicleKind = pickRoadVehicleKind();
    let speedMag = 0.65 + d * 1.1 + Math.random() * 0.35;
    if (Math.random() < 0.25) {
      speedMag *= 1.15 + Math.random() * 0.15;
    }
    const speed = speedMag * dir;
    const baseGap = 5.2 - d * 1.0 + Math.random() * 1.0;
    const cars = [];
    const edgePad = 1.2;

    function pushVehicle(x) {
      const spec = makeVehicleData(vehicleKind);
      cars.push({
        x,
        w: spec.w,
        color: spec.color,
        kind: spec.kind,
        speedMul: spec.speedMul,
        hitH: spec.hitH,
      });
      const gapExtra = spec.kind === "truck" ? 1.1 : spec.kind === "moto" ? -0.35 : 0;
      return spec.w + baseGap + gapExtra;
    }

    if (dir > 0) {
      let x = -1.4 - edgePad - Math.random() * baseGap;
      const leftmost = -COLS - 10;
      while (x > leftmost) {
        const step = pushVehicle(x);
        x -= step;
      }
    } else {
      let x = COLS + edgePad + Math.random() * baseGap;
      const rightmost = COLS + 10;
      while (x < rightmost) {
        const step = pushVehicle(x);
        x += step;
      }
    }
    const carW = cars.length ? cars[0].w : 1.3;
    return { type: "road", index, dir, speed, cars, carW, vehicleKind };
  }

  function ensureRowsAhead() {
    const needUntil = player.row + VIEW_ROWS + 8;
    while (rows.length <= needUntil) {
      const i = rows.length;
      let row;
      if (i < SAFE_START_ROWS) {
        row = makeGrassRow(i);
        row.trees = [];
      } else {
        const prev = rows[i - 1];
        if (prev.type === "road") {
          row = Math.random() < 0.35 ? makeRoadRow(i) : makeGrassRow(i);
        } else {
          row = Math.random() < 0.45 ? makeRoadRow(i) : makeGrassRow(i);
        }
      }
      rows.push(row);
    }
  }

  // ─── Player / game flow ───────────────────────────────────
  function resetGame() {
    clearWorldMeshes();
    rows = [];
    score = 0;
    scoreEl.textContent = "0";
    cameraZ = 0;
    cameraX = colToX(PLAYER_COL_START);
    shake = 0;
    hearts = MAX_HEARTS;
    invulnTimer = 0;
    hitFlashTimer = 0;
    if (hitFlashEl) {
      hitFlashEl.classList.remove("show");
      hitFlashEl.classList.add("hidden");
    }
    syncHeartsHud();
    resetPlayerFade();
    hopQueue = [];
    gameOver = false;
    playing = true;
    paused = false;
    optionsReturnMode = "menu";
    idleTime = 0;
    resetCombo();
    canControl = false;
    countdownActive = true;
    skyClockRunning = false;
    runTimeSec = 0;
    runTimerFrozen = false;
    syncRunTimerHud();
    showRunTimer(true);
    syncPauseBtn();

    player = {
      col: PLAYER_COL_START,
      row: 1,
      fromCol: PLAYER_COL_START,
      fromRow: 1,
      toCol: PLAYER_COL_START,
      toRow: 1,
      hopT: 1,
      facing: 1,
      maxRow: 1,
    };

    for (let i = 0; i < VIEW_ROWS + 10; i++) {
      if (i < SAFE_START_ROWS) {
        const g = makeGrassRow(i);
        g.trees = [];
        rows.push(g);
      } else {
        rows.push(Math.random() < 0.4 ? makeRoadRow(i) : makeGrassRow(i));
      }
    }

    ensurePlayerMesh();
    ensureLampPointLights();
    syncVisibleWorld();
    updatePlayerVisual();
    updateCamera(1);
    snapSkyPhase(0);

    hideOverlay();
    startCountdownSequence();
    lastTs = performance.now();
    cancelAnimationFrame(animId);
    loop(lastTs);
  }

  function tryHop(dx, dy) {
    if (!playing || gameOver || paused || !canControl || countdownActive) return;
    if (player.hopT < 1) {
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
    if (target && target.type === "grass") {
      if (target.trees && target.trees.includes(nc)) return;
      if (target.blocks && target.blocks.includes(nc)) return;
    }

    player.fromCol = player.col;
    player.fromRow = player.row;
    player.toCol = nc;
    player.toRow = nr;
    player.hopT = 0;
    if (dy !== 0) player.facing = dy;
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
      checkComboMilestones();
    }
    ensureRowsAhead();
    if (hopQueue.length) {
      const next = hopQueue.shift();
      doHop(next.dx, next.dy);
    }
  }

  // ─── Collision ────────────────────────────────────────────
  function playerWorldBox() {
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
    if (invulnTimer > 0) return false;
    const pb = playerWorldBox();
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
        const ch = car.hitH != null ? car.hitH : 0.72;
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

  function syncHeartsHud() {
    if (!heartsEl) return;
    const nodes = heartsEl.querySelectorAll(".heart");
    nodes.forEach((el, i) => {
      const filled = i < hearts;
      el.classList.toggle("filled", filled);
      el.classList.toggle("empty", !filled);
      el.textContent = filled ? "❤" : "♡";
    });
  }

  function flashHitOverlay() {
    if (!hitFlashEl) return;
    hitFlashEl.classList.remove("hidden");
    hitFlashEl.classList.add("show");
    hitFlashTimer = 0.22;
  }

  function updateHitFlash(dt) {
    if (hitFlashTimer <= 0) return;
    hitFlashTimer -= dt;
    if (hitFlashTimer <= 0) {
      hitFlashTimer = 0;
      if (hitFlashEl) {
        hitFlashEl.classList.remove("show");
        hitFlashEl.classList.add("hidden");
      }
    }
  }

  /** Vehicle hit: lose 1 heart + invuln; at 0 hearts run full game-over. */
  function onPlayerHit() {
    if (gameOver || invulnTimer > 0) return;
    hearts = Math.max(0, hearts - 1);
    syncHeartsHud();
    shake = Math.max(shake, 14);
    flashHitOverlay();
    if (hearts <= 0) {
      // Full cut: triggerGameOver stops BGM + plays crash once
      triggerGameOver();
      return;
    }
    AudioFX.crash();
    if (typeof AudioFX.duckMusic === "function") AudioFX.duckMusic(0.5);
    invulnTimer = HIT_INVULN_SEC;
  }


  // ─── Leaderboard / player name ────────────────────────────
  function sanitizePlayerName(raw) {
    let s = String(raw == null ? "" : raw).trim();
    // Strip control chars / collapse internal whitespace
    s = s.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
    if (s.length > PLAYER_NAME_MAX) s = s.slice(0, PLAYER_NAME_MAX).trim();
    return s || "Player";
  }

  function getPlayerNameFromInput() {
    if (!playerNameInput) return sanitizePlayerName(playerName);
    return sanitizePlayerName(playerNameInput.value);
  }

  function persistPlayerName(name) {
    playerName = sanitizePlayerName(name);
    if (playerNameInput && playerNameInput.value !== playerName) {
      playerNameInput.value = playerName;
    }
    try { localStorage.setItem(PLAYER_NAME_KEY, playerName); } catch (_) {}
    return playerName;
  }

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const out = [];
      for (const e of parsed) {
        if (!e || typeof e !== "object") continue;
        const name = sanitizePlayerName(e.name);
        const score = parseInt(e.score, 10);
        const updatedAt = Number(e.updatedAt) || 0;
        if (!Number.isFinite(score) || score < 0) continue;
        out.push({ name, score, updatedAt });
      }
      return sortLeaderboard(out);
    } catch (_) {
      return [];
    }
  }

  function saveLeaderboard(list) {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function sortLeaderboard(list) {
    return list.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.updatedAt !== b.updatedAt) return a.updatedAt - b.updatedAt; // earlier wins
      return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" });
    });
  }

  function findEntryIndex(list, name) {
    const key = sanitizePlayerName(name).toLowerCase();
    for (let i = 0; i < list.length; i++) {
      if (String(list[i].name).toLowerCase() === key) return i;
    }
    return -1;
  }

  function getPlayerBest(name) {
    const list = loadLeaderboard();
    const idx = findEntryIndex(list, name);
    return idx >= 0 ? list[idx].score : 0;
  }

  function getPlayerRank(name) {
    const list = loadLeaderboard();
    const idx = findEntryIndex(list, name);
    return idx >= 0 ? idx + 1 : 0;
  }

  function boardMaxScore(list) {
    let m = 0;
    for (const e of list) if (e.score > m) m = e.score;
    return m;
  }

  /** Sync HUD `best` + BEST_KEY from current player's board entry (fallback: max of board / stored). */
  function syncBestFromBoard() {
    const list = loadLeaderboard();
    const personal = getPlayerBest(playerName);
    const boardMax = boardMaxScore(list);
    let deviceBest = 0;
    try {
      deviceBest = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
    } catch (_) {
      deviceBest = 0;
    }
    // Prefer current player's best for HUD; keep BEST_KEY as max so older device best isn't lost
    best = personal > 0 ? personal : Math.max(deviceBest, boardMax);
    const storeVal = Math.max(best, deviceBest, boardMax, personal);
    try { localStorage.setItem(BEST_KEY, String(storeVal)); } catch (_) {}
    updateBestHud();
  }

  /**
   * Fire-and-forget POST to online HighScore API. Never blocks UI.
   * Only called when local personal best improved.
   */
  function postOnlineScore(name, scoreVal) {
    const cleanName = sanitizePlayerName(name);
    const sc = parseInt(scoreVal, 10) || 0;
    if (sc <= 0) return;
    try {
      fetch(ONLINE_LB_BASE + "/api/v1/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": ONLINE_LB_API_KEY,
        },
        body: JSON.stringify({ player_name: cleanName, score: sc }),
      }).catch(function () { /* offline / network */ });
    } catch (_) { /* ignore */ }
  }

  /** Optional player stats (encode name for URL path). */
  function fetchOnlinePlayerStats(name) {
    const cleanName = sanitizePlayerName(name);
    const path = ONLINE_LB_BASE + "/api/v1/players/" + encodeURIComponent(cleanName) + "/stats";
    return fetch(path, {
      headers: { "X-API-Key": ONLINE_LB_API_KEY },
    }).then(function (res) {
      if (!res.ok) throw new Error("stats " + res.status);
      return res.json();
    });
  }

  function mapOnlineEntries(entries) {
    const out = [];
    if (!Array.isArray(entries)) return out;
    for (const e of entries) {
      if (!e || typeof e !== "object") continue;
      const name = sanitizePlayerName(e.player_name != null ? e.player_name : e.name);
      const score = parseInt(e.score, 10);
      if (!Number.isFinite(score) || score < 0) continue;
      let updatedAt = 0;
      if (e.created_at) {
        const t = Date.parse(e.created_at);
        updatedAt = Number.isFinite(t) ? t : 0;
      } else if (e.updatedAt) {
        updatedAt = Number(e.updatedAt) || 0;
      }
      const rank = parseInt(e.rank, 10) || 0;
      out.push({ name: name, score: score, updatedAt: updatedAt, rank: rank });
    }
    return out;
  }

  function fetchOnlineLeaderboard(limit) {
    const lim = limit || LEADERBOARD_CAP;
    return fetch(ONLINE_LB_BASE + "/api/v1/leaderboard?limit=" + lim, {
      headers: { "X-API-Key": ONLINE_LB_API_KEY },
    }).then(function (res) {
      if (!res.ok) throw new Error("leaderboard " + res.status);
      return res.json();
    }).then(function (data) {
      return mapOnlineEntries(data && data.entries);
    });
  }

  function setLeaderboardStatus(text, kind) {
    if (!leaderboardStatus) return;
    leaderboardStatus.textContent = text || "";
    leaderboardStatus.className = "lb-status" + (kind ? " " + kind : "");
  }

  /**
   * Submit a score for a name. Only writes when score beats that name's previous best.
   * On improve, also POSTs to the online board (fire-and-forget).
   * Returns { improved, rank, best, entry } or null on no-op invalid.
   */
  function submitScore(name, scoreVal) {
    const cleanName = sanitizePlayerName(name);
    const sc = parseInt(scoreVal, 10) || 0;
    if (sc <= 0) {
      return { improved: false, rank: getPlayerRank(cleanName), best: getPlayerBest(cleanName), entry: null };
    }
    let list = loadLeaderboard();
    const idx = findEntryIndex(list, cleanName);
    const now = Date.now();
    let improved = false;
    if (idx >= 0) {
      if (sc > list[idx].score) {
        // Keep latest casing on improved ranking
        list[idx] = { name: cleanName, score: sc, updatedAt: now };
        improved = true;
      }
    } else {
      list.push({ name: cleanName, score: sc, updatedAt: now });
      improved = true;
    }
    if (improved) {
      list = sortLeaderboard(list);
      // Cap at ~20 names: drop lowest (end of sorted list)
      if (list.length > LEADERBOARD_CAP) {
        list = list.slice(0, LEADERBOARD_CAP);
        // If our new entry was dropped (shouldn't happen for a high score), re-check
        if (findEntryIndex(list, cleanName) < 0) {
          // Replace the last (lowest) with this entry
          list[list.length - 1] = { name: cleanName, score: sc, updatedAt: now };
          list = sortLeaderboard(list).slice(0, LEADERBOARD_CAP);
        }
      }
      saveLeaderboard(list);
      // Online sync only when local personal best improved (reduces spam)
      postOnlineScore(cleanName, sc);
    } else {
      list = sortLeaderboard(list);
    }
    const rank = findEntryIndex(list, cleanName) + 1;
    const personal = rank > 0 ? list[rank - 1].score : 0;
    // Sync device BEST_KEY / HUD with this player's best when it is the active name
    if (cleanName.toLowerCase() === String(playerName).toLowerCase()) {
      best = Math.max(best, personal);
      try {
        const prev = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
        localStorage.setItem(BEST_KEY, String(Math.max(prev, personal)));
      } catch (_) {}
      updateBestHud();
    }
    return {
      improved,
      rank: rank > 0 ? rank : 0,
      best: personal,
      entry: rank > 0 ? list[rank - 1] : null,
    };
  }

  function renderLeaderboard(listOpt) {
    const list = Array.isArray(listOpt) ? listOpt : loadLeaderboard();
    if (leaderboardList) leaderboardList.innerHTML = "";
    if (!list.length) {
      if (leaderboardEmpty) leaderboardEmpty.classList.remove("hidden");
      if (leaderboardList) leaderboardList.classList.add("hidden");
      return;
    }
    if (leaderboardEmpty) leaderboardEmpty.classList.add("hidden");
    if (leaderboardList) leaderboardList.classList.remove("hidden");
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    list.forEach((entry, i) => {
      const rank = (entry.rank > 0 ? entry.rank : i + 1);
      const li = document.createElement("li");
      const medalRank = rank <= 3 ? rank : 0;
      li.className = "lb-row" + (medalRank ? ` rank-${medalRank}` : "");
      const badge = medals[medalRank] || "";
      li.innerHTML =
        `<span class="lb-rank">#${rank}</span>` +
        `<span class="lb-badge" aria-hidden="true">${badge}</span>` +
        `<span class="lb-name"></span>` +
        `<span class="lb-score"></span>`;
      li.querySelector(".lb-name").textContent = entry.name;
      li.querySelector(".lb-score").textContent = String(entry.score);
      leaderboardList.appendChild(li);
    });
  }

  function showLeaderboard(from) {
    cancelRemap();
    leaderboardReturnMode = from || leaderboardReturnMode || "menu";
    hideAllPanels();
    overlay.dataset.mode = "leaderboard";
    if (leaderboardPanel) leaderboardPanel.classList.remove("hidden");
    overlay.classList.add("visible");
    syncTouchPad();
    // Show local cache immediately, then try online
    renderLeaderboard(loadLeaderboard());
    setLeaderboardStatus("Syncing…", "syncing");
    const gen = (showLeaderboard._gen = (showLeaderboard._gen || 0) + 1);
    fetchOnlineLeaderboard(LEADERBOARD_CAP)
      .then(function (onlineList) {
        if (gen !== showLeaderboard._gen) return;
        // Write online list into local cache (offline fallback)
        const toStore = onlineList.map(function (e) {
          return { name: e.name, score: e.score, updatedAt: e.updatedAt || Date.now() };
        });
        saveLeaderboard(sortLeaderboard(toStore).slice(0, LEADERBOARD_CAP));
        renderLeaderboard(onlineList.length ? onlineList : sortLeaderboard(toStore));
        setLeaderboardStatus("Online · synced", "online");
      })
      .catch(function () {
        if (gen !== showLeaderboard._gen) return;
        renderLeaderboard(loadLeaderboard());
        const offline = (typeof navigator !== "undefined" && navigator.onLine === false);
        if (offline) {
          setLeaderboardStatus("Offline · local only", "offline");
        } else {
          setLeaderboardStatus("Couldn't reach online board", "error");
        }
      });
  }

  function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    playing = false;
    paused = false;
    canControl = false;
    countdownActive = false;
    skyClockRunning = false;
    runTimerFrozen = true;
    hideCountdown();
    syncPauseBtn();
    // Hard-cut BGM immediately; hit SFX still plays
    AudioFX.stopMusic();
    AudioFX.crash();
    shake = 24; // intensified death shake (was 10)
    startPlayerDeathFade();

    const name = persistPlayerName(playerName);
    const result = submitScore(name, score);
    // Keep device BEST_KEY / HUD in sync with this player's best
    if (result && result.best > best) {
      best = result.best;
    }
    if (score > best) best = score;
    try { localStorage.setItem(BEST_KEY, String(Math.max(best, result ? result.best : 0))); } catch (_) {}
    updateBestHud();

    goTitle.textContent = "Ouch!";
    goTagline.textContent = "You got hit.";
    if (newBestFlash) {
      if (result && result.improved) {
        newBestFlash.textContent = `New best! Rank #${result.rank}`;
        newBestFlash.classList.remove("hidden");
      } else {
        newBestFlash.textContent = "";
        newBestFlash.classList.add("hidden");
      }
    }
    let line = `Score ${score}`;
    if (comboLevel > 0) line += ` · Combo x${comboLevel}`;
    finalScoreEl.textContent = line;
    if (goRankLine) {
      const pb = result ? result.best : getPlayerBest(name);
      const rk = result && result.rank ? result.rank : getPlayerRank(name);
      if (pb > 0 && rk > 0) {
        goRankLine.textContent = `${name}'s best ${pb} · Rank #${rk}`;
      } else if (pb > 0) {
        goRankLine.textContent = `${name}'s best ${pb}`;
      } else {
        goRankLine.textContent = "";
      }
    }
    // Brief delay so fade + shake read before the overlay
    if (deathOverlayTimer) window.clearTimeout(deathOverlayTimer);
    deathOverlayTimer = window.setTimeout(() => {
      deathOverlayTimer = 0;
      if (gameOver) showGameOver();
    }, 520);
  }

  function updateBestHud() {
    bestEl.textContent = best > 0 ? `Best ${best}` : "";
  }

  function syncPauseBtn() {
    if (pauseBtn) {
      const show = playing && !gameOver;
      pauseBtn.classList.toggle("hidden", !show);
    }
    syncTouchPad();
  }

  function hideAllPanels() {
    menuPanel.classList.add("hidden");
    if (optionsPanel) optionsPanel.classList.add("hidden");
    if (leaderboardPanel) leaderboardPanel.classList.add("hidden");
    if (pausePanel) pausePanel.classList.add("hidden");
    gameOverPanel.classList.add("hidden");
  }

  function showMenu() {
    cancelRemap();
    paused = false;
    playing = false;
    gameOver = false;
    canControl = false;
    countdownActive = false;
    skyClockRunning = false;
    runTimerFrozen = true;
    hideCountdown();
    showRunTimer(false);
    optionsReturnMode = "menu";
    AudioFX.stopMusic();
    hideAllPanels();
    overlay.dataset.mode = "menu";
    menuPanel.classList.remove("hidden");
    overlay.classList.add("visible");
    syncPauseBtn();
    setupPreview();
    snapSkyPhase(1); // sunset mood on menu
  }

  function showOptions(from) {
    cancelRemap();
    optionsReturnMode = from || optionsReturnMode || "menu";
    hideAllPanels();
    overlay.dataset.mode = "options";
    if (optionsPanel) optionsPanel.classList.remove("hidden");
    overlay.classList.add("visible");
    syncVolumeUi();
    syncTrackUi();
    syncKeymapUi();
    syncTouchPad();
  }

  function showPause() {
    cancelRemap();
    if (!playing || gameOver) return;
    paused = true;
    optionsReturnMode = "pause";
    AudioFX.pauseMusic();
    hideAllPanels();
    overlay.dataset.mode = "pause";
    if (pausePanel) pausePanel.classList.remove("hidden");
    overlay.classList.add("visible");
    syncPauseBtn();
  }

  function resumePlay() {
    cancelRemap();
    if (!playing || gameOver) return;
    paused = false;
    optionsReturnMode = "menu";
    hideOverlay();
    if (!AudioFX.isMuted()) AudioFX.resumeMusic();
    syncPauseBtn();
  }

  function togglePause() {
    if (!playing || gameOver) return;
    if (paused) {
      if (overlay.dataset.mode === "options") {
        // Esc from options-during-pause → back to pause panel
        showPause();
        // already paused; music stays paused
        return;
      }
      resumePlay();
    } else {
      showPause();
    }
  }

  function quitToMenu() {
    paused = false;
    playing = false;
    gameOver = false;
    AudioFX.stopMusic();
    syncPauseBtn();
    showMenu();
  }

  function showGameOver() {
    cancelRemap();
    paused = false;
    hideAllPanels();
    overlay.dataset.mode = "gameover";
    gameOverPanel.classList.remove("hidden");
    overlay.classList.add("visible");
    syncPauseBtn();
  }

  function hideOverlay() {
    cancelRemap();
    overlay.classList.remove("visible");
    try { overlay.inert = true; } catch (_) { /* older browsers */ }
    syncTouchPad();
  }

  function syncVolumeUi() {
    if (volumeSlider) volumeSlider.value = String(musicVolume);
    if (volumeValue) volumeValue.textContent = String(musicVolume);
    if (sfxVolumeSlider) sfxVolumeSlider.value = String(sfxVolume);
    if (sfxVolumeValue) sfxVolumeValue.textContent = String(sfxVolume);
  }

  function syncTrackUi() {
    const id = AudioFX.getTrack();
    trackBtns.forEach((btn) => {
      const on = btn.getAttribute("data-track") === id;
      btn.classList.toggle("selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // ─── Update ───────────────────────────────────────────────
  function update(dt) {
    if (comboFlashTimer > 0) {
      comboFlashTimer -= dt;
      if (comboFlashTimer <= 0) {
        comboFlash.classList.add("hidden");
      }
    }

    if (paused) {
      updateSkyCycle(0);
      return;
    }

    if (!playing) {
      if (shake > 0) shake = Math.max(0, shake - dt * 22);
      updateHitFlash(dt);
      updatePlayerDeathFade(dt);
      updateSkyCycle(dt);
      return;
    }

    updateCountdown(dt);
    updateSkyCycle(dt);

    if (canControl && !countdownActive && !runTimerFrozen) {
      runTimeSec += dt;
      syncRunTimerHud();
    }

    // Freeze hops & traffic until countdown finishes
    if (countdownActive || !canControl) {
      if (shake > 0) shake = Math.max(0, shake - dt * 30);
      return;
    }

    if (player.hopT < 1) {
      player.hopT = Math.min(1, player.hopT + dt / (HOP_MS / 1000));
      if (player.hopT >= 1) finishHop();
    }

    const d = difficulty();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.type !== "road") continue;
      const boost = 1 + d * 0.15;
      for (const car of row.cars) {
        const mul = car.speedMul != null ? car.speedMul : 1;
        car.x += row.speed * boost * mul * dt;
      }
      const margin = 4;
      for (const car of row.cars) {
        if (row.dir > 0 && car.x > COLS + margin) {
          let minX = Infinity;
          for (const c of row.cars) {
            if (c !== car) minX = Math.min(minX, c.x);
          }
          const gapBack = 4.5 - d * 0.8 + Math.random() * 0.8;
          const offLeft = -car.w - 1.2;
          car.x = Math.min(offLeft, (Number.isFinite(minX) ? minX : offLeft) - car.w - gapBack);
        } else if (row.dir < 0 && car.x + car.w < -margin) {
          let maxX = -Infinity;
          for (const c of row.cars) {
            if (c !== car) maxX = Math.max(maxX, c.x + c.w);
          }
          const gapBack = 4.5 - d * 0.8 + Math.random() * 0.8;
          const offRight = COLS + 1.2;
          car.x = Math.max(offRight, (Number.isFinite(maxX) ? maxX : offRight) + gapBack);
        }
      }
    }

    if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
    updateHitFlash(dt);
    if (checkHit()) onPlayerHit();
    if (shake > 0) shake = Math.max(0, shake - dt * 30);
  }

  function playerVisualRow() {
    const t = easeOutBack(Math.min(1, player.hopT));
    return player.fromRow + (player.toRow - player.fromRow) * t;
  }

  function easeOutBack(t) {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function renderFrame(dt) {
    ensurePlayerMesh();
    syncVisibleWorld();
    updatePlayerVisual();
    applyIdlePose(dt || 0.016);
    updateCamera(dt || 0.016);
    updateStreetLampLights();
    renderer.render(scene, camera);
  }

  // ─── Loop ─────────────────────────────────────────────────
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0.016;
    lastTs = ts;
    try {
      if (paused) {
        update(0);
        renderFrame(0);
      } else {
        update(dt);
        renderFrame(dt);
      }
    } catch (err) {
      console.error("Tomo Crossroad frame error:", err);
    }
    animId = requestAnimationFrame(loop);
  }

  function setupPreview() {
    clearWorldMeshes();
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
    cameraZ = rowToZ(1);
    cameraX = colToX(PLAYER_COL_START);
    playing = false;
    idleTime = 0;
    ensurePlayerMesh();
    ensureLampPointLights();
    syncVisibleWorld();
    updatePlayerVisual();
    updateCamera(1);
    lastTs = performance.now();
    cancelAnimationFrame(animId);
    const previewLoop = (ts) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0.016;
      lastTs = ts;
      const mode = overlay.dataset.mode;
      if (!playing && (mode === "menu" || mode === "options")) {
        idleTime += dt;
        for (const row of rows) {
          if (row.type !== "road") continue;
          for (const car of row.cars) {
            const mul = car.speedMul != null ? car.speedMul : 1;
            car.x += row.speed * mul * dt;
            if (row.dir > 0 && car.x > COLS + 4) car.x = -car.w - 1.2;
            if (row.dir < 0 && car.x + car.w < -4) car.x = COLS + 1.2;
          }
        }
        renderFrame(dt);
        if (mode === "menu") drawCharPreviews(idleTime);
        animId = requestAnimationFrame(previewLoop);
      } else if (!playing && gameOver) {
        idleTime += dt;
        updatePlayerDeathFade(dt);
        renderFrame(dt);
        if (shake > 0) shake = Math.max(0, shake - dt * 22);
        animId = requestAnimationFrame(previewLoop);
      }
    };
    animId = requestAnimationFrame(previewLoop);
  }

  // ─── Input: keyboard ──────────────────────────────────────
  // Camera looks +Z → screen-left = world +X = higher col.
  // v1.04 inverted L/R per user report: Left/A/swipe-left → [1,0]; Right/D/swipe-right → [-1,0].
  // (v1.03 only fixed facing yaw; hop deltas stayed ArrowLeft:[-1,0].)

  window.addEventListener("keydown", (e) => {
    if (remappingAction) {
      e.preventDefault();
      if (e.code === "Escape") {
        cancelRemap();
        return;
      }
      // Ignore pure modifiers
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" ||
          e.code === "ControlLeft" || e.code === "ControlRight" ||
          e.code === "AltLeft" || e.code === "AltRight" ||
          e.code === "MetaLeft" || e.code === "MetaRight") {
        return;
      }
      applyRemap(e.code);
      return;
    }

    if (e.repeat) return;

    // Escape toggles pause while playing (also backs out of options→pause)
    if (e.code === "Escape") {
      if (playing && !gameOver) {
        e.preventDefault();
        togglePause();
        return;
      }
    }

    if (paused) {
      if (e.code === "Space" || e.code === "Enter") {
        if (overlay.dataset.mode === "pause") {
          e.preventDefault();
          resumePlay();
        }
      }
      return;
    }

    if (!playing) {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea") return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (overlay.dataset.mode === "gameover" || overlay.dataset.mode === "menu") {
          beginPlay();
        }
      }
      return;
    }
    const m = keyMap[e.code];
    if (!m) return;
    e.preventDefault();
    tryHop(m[0], m[1]);
  });

  // ─── Input: pointer + touch on #touchPad (v1.19) + mobile buttons (v1.21) ───
  // Root cause (v1.15–v1.18): preventDefault() on pointerdown during play
  // cancelled the pointer on many Android Chrome/WebViews (pointercancel),
  // cleared gestureStart, so pointerup never hopped. Touch fallback was
  // never registered when PointerEvent existed.
  // Fix: no preventDefault on pointerdown/touchstart; dedicated #touchPad;
  // register BOTH pointer and touch with a short dedupe window.
  const appEl = document.getElementById("app");
  const touchPad = document.getElementById("touchPad");
  let gestureStart = null;
  let gestureHandled = false; // suppress synthetic click after pointer/touch hop
  const SWIPE_THRESH = 20;
  const GESTURE_DEDUPE_MS = 100;
  let lastGestureStartAt = 0;
  let lastGestureEndAt = 0;
  const UI_GESTURE_IGNORE =
    "button, input, textarea, select, a, label, .hud-icon-btn, .panel, .char-select, .char-carousel, .char-stage, .char-nav, .char-dot, .track-btn, .keymap-row, #mobileControls, .mobile-ctrl-btn";

  function overlayIsVisible() {
    return !!(overlay && overlay.classList.contains("visible"));
  }

  function isInteractiveTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    return !!target.closest(UI_GESTURE_IGNORE);
  }

  function syncTouchPad() {
    const ovVisible = overlayIsVisible();
    // v1.21: inert while hidden so invisible menu UI cannot receive focus/hits
    if (overlay) {
      try { overlay.inert = !ovVisible; } catch (_) { /* older browsers */ }
    }
    const active = !!(playing && !paused && !gameOver && !ovVisible);
    if (touchPad) {
      touchPad.classList.toggle("active", active);
      touchPad.setAttribute("aria-hidden", active ? "false" : "true");
    }
    const mc = document.getElementById("mobileControls");
    if (mc) {
      mc.classList.toggle("active", active);
      mc.setAttribute("aria-hidden", active ? "false" : "true");
    }
  }

  function markGestureHandled() {
    gestureHandled = true;
    setTimeout(() => { gestureHandled = false; }, 450);
  }

  function applySwipeOrTap(dx, dy) {
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx < SWIPE_THRESH && ady < SWIPE_THRESH) {
      tryHop(0, 1);
      return;
    }
    if (adx > ady) {
      // v1.04: swipe left → tryHop(1,0); swipe right → tryHop(-1,0) (inverted vs v1.03)
      tryHop(dx > 0 ? -1 : 1, 0);
    } else {
      tryHop(0, dy < 0 ? 1 : -1);
    }
  }

  function onPlayGestureStart(clientX, clientY, target, ev, source) {
    if (isInteractiveTarget(target)) {
      gestureStart = null;
      return;
    }

    // Menu / options / pause: do not steal; let buttons work.
    // Game over: track tap on non-UI (e.g. backdrop) for play-again.
    if (overlayIsVisible()) {
      if (!paused && overlay.dataset.mode === "gameover") {
        const now = performance.now();
        if (gestureStart && now - lastGestureStartAt < GESTURE_DEDUPE_MS) return;
        gestureStart = { x: clientX, y: clientY, t: now, mode: "gameover", source: source || "unknown" };
        lastGestureStartAt = now;
      } else {
        gestureStart = null;
      }
      return;
    }

    if (!playing || paused || gameOver) {
      gestureStart = null;
      return;
    }

    // Dedupe pointer↔touch pair for the same physical contact
    const now = performance.now();
    if (gestureStart && now - lastGestureStartAt < GESTURE_DEDUPE_MS) return;

    gestureStart = { x: clientX, y: clientY, t: now, mode: "play", source: source || "unknown" };
    lastGestureStartAt = now;
    // Do NOT preventDefault on start — that cancels pointers on Android Chrome.
  }

  function onPlayGestureEnd(clientX, clientY, ev, source) {
    if (!gestureStart) return;
    // First end wins; sibling pointer/touch end within dedupe window is ignored
    const now = performance.now();
    if (lastGestureEndAt > 0 && now - lastGestureEndAt < GESTURE_DEDUPE_MS) {
      gestureStart = null;
      return;
    }

    const start = gestureStart;
    gestureStart = null;
    lastGestureEndAt = now;
    const dx = clientX - start.x;
    const dy = clientY - start.y;

    if (start.mode === "gameover") {
      if (Math.abs(dx) < SWIPE_THRESH && Math.abs(dy) < SWIPE_THRESH) {
        if (!paused && overlayIsVisible() && overlay.dataset.mode === "gameover") {
          beginPlay();
          markGestureHandled();
          if (ev && ev.cancelable) {
            try { ev.preventDefault(); } catch (_) { /* ignore */ }
          }
        }
      }
      return;
    }

    // Active play: hop only while overlay is hidden
    if (!playing || paused || gameOver || overlayIsVisible()) return;

    applySwipeOrTap(dx, dy);
    markGestureHandled();
    if (ev && ev.cancelable) {
      try { ev.preventDefault(); } catch (_) { /* ignore */ }
    }
  }

  function onPlayGestureCancel(source) {
    if (!gestureStart) return;
    // pointercancel on Android often follows a cancelled pointer after preventDefault
    // (or browser quirks). Keep the gesture so the parallel touchend can still hop.
    if (source === "pointer") return;
    if (source && gestureStart.source && source !== gestureStart.source) return;
    gestureStart = null;
  }

  function bindPlayGestures(el, opts) {
    if (!el) return;
    const playOnly = !!(opts && opts.playOnly);
    const stopBubble = !!(opts && opts.stopBubble);

    el.addEventListener("pointerdown", (e) => {
      if (e.isPrimary === false) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (playOnly && overlayIsVisible()) return;
      if (stopBubble) e.stopPropagation();
      onPlayGestureStart(e.clientX, e.clientY, e.target, e, "pointer");
    }, { passive: true });

    el.addEventListener("pointerup", (e) => {
      if (e.isPrimary === false) return;
      if (playOnly && overlayIsVisible()) return;
      if (stopBubble) e.stopPropagation();
      onPlayGestureEnd(e.clientX, e.clientY, e, "pointer");
    }, { passive: false });

    el.addEventListener("pointercancel", (e) => {
      if (stopBubble && e) e.stopPropagation();
      onPlayGestureCancel("pointer");
    }, { passive: true });

    // Always register touch as well (Android backup when pointer is cancelled)
    el.addEventListener("touchstart", (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (playOnly && overlayIsVisible()) return;
      if (stopBubble) e.stopPropagation();
      onPlayGestureStart(t.clientX, t.clientY, e.target, e, "touch");
    }, { passive: true });

    el.addEventListener("touchend", (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      if (playOnly && overlayIsVisible()) return;
      if (stopBubble) e.stopPropagation();
      onPlayGestureEnd(t.clientX, t.clientY, e, "touch");
    }, { passive: false });

    el.addEventListener("touchcancel", (e) => {
      if (stopBubble && e) e.stopPropagation();
      onPlayGestureCancel("touch");
    }, { passive: true });
  }

  // Primary: #touchPad (active only while playing with overlay hidden)
  bindPlayGestures(touchPad, { playOnly: true, stopBubble: true });
  // Backup: #app (also handles game-over backdrop taps via bubbling)
  bindPlayGestures(appEl, { playOnly: false });

  // Desktop click / mouse fallback; ignore if pointer/touch already hopped
  appEl.addEventListener("click", (e) => {
    if (gestureHandled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isInteractiveTarget(e.target)) return;
    if (overlayIsVisible()) return;
    if (!playing || gameOver || paused || !canControl || countdownActive) return;
    tryHop(0, 1);
  });

  // Block page scroll/zoom on the play surface during a run (not on overlays/UI)
  function onPlayTouchMove(e) {
    if (isInteractiveTarget(e.target)) return;
    if (overlayIsVisible()) return;
    if (playing && !paused) {
      e.preventDefault();
    }
  }
  appEl.addEventListener("touchmove", onPlayTouchMove, { passive: false });
  if (touchPad) {
    touchPad.addEventListener("touchmove", onPlayTouchMove, { passive: false });
  }

  // ─── Mobile on-screen hop buttons (v1.21) ─────────────────
  // Primary UX on touch/coarse devices; touchPad stays as backup above the bar.
  // Fire hop on pointerup/touchend inside button bounds (more reliable on Android
  // than pointerdown alone). preventDefault on the press that fires to avoid ghost clicks.
  function bindMobileHopBtn(el, dx, dy) {
    if (!el) return;
    let armed = false;
    let armedPointerId = null;
    let touchArmed = false;

    function canMobileHop() {
      return !!(playing && !gameOver && !paused && canControl && !countdownActive && !overlayIsVisible());
    }

    function pointInside(clientX, clientY) {
      const r = el.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    }

    function fire(ev) {
      if (!canMobileHop()) return;
      tryHop(dx, dy);
      markGestureHandled();
      if (ev && ev.cancelable) {
        try { ev.preventDefault(); } catch (_) { /* ignore */ }
      }
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
    }

    function pressVisual(on) {
      el.classList.toggle("pressed", !!on);
    }

    el.addEventListener("pointerdown", (e) => {
      if (e.isPrimary === false) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      armed = true;
      armedPointerId = e.pointerId;
      touchArmed = false;
      pressVisual(true);
      if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      e.stopPropagation();
    }, { passive: false });

    el.addEventListener("pointerup", (e) => {
      if (!armed) return;
      if (armedPointerId != null && e.pointerId !== armedPointerId) return;
      armed = false;
      armedPointerId = null;
      pressVisual(false);
      if (pointInside(e.clientX, e.clientY)) fire(e);
    }, { passive: false });

    el.addEventListener("pointercancel", () => {
      armed = false;
      armedPointerId = null;
      pressVisual(false);
    }, { passive: true });

    el.addEventListener("pointerleave", () => {
      pressVisual(false);
    }, { passive: true });

    el.addEventListener("touchstart", (e) => {
      // Backup when pointer events are flaky; if pointer already armed, ignore
      if (armed) {
        if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
        e.stopPropagation();
        return;
      }
      touchArmed = true;
      pressVisual(true);
      if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      e.stopPropagation();
    }, { passive: false });

    el.addEventListener("touchend", (e) => {
      if (armed) {
        // pointer path owns this contact
        touchArmed = false;
        pressVisual(false);
        return;
      }
      if (!touchArmed) return;
      touchArmed = false;
      pressVisual(false);
      const t = e.changedTouches && e.changedTouches[0];
      if (t && pointInside(t.clientX, t.clientY)) fire(e);
    }, { passive: false });

    el.addEventListener("touchcancel", () => {
      touchArmed = false;
      pressVisual(false);
    }, { passive: true });

    el.addEventListener("click", (e) => {
      // Fallback for environments that only synthesize click
      if (gestureHandled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      fire(e);
    });
  }

  bindMobileHopBtn(document.getElementById("btnHopLeft"), 1, 0);
  bindMobileHopBtn(document.getElementById("btnHopForward"), 0, 1);
  bindMobileHopBtn(document.getElementById("btnHopRight"), -1, 0);

  // ─── UI ───────────────────────────────────────────────────
  function beginPlay() {
    persistPlayerName(getPlayerNameFromInput());
    syncBestFromBoard();
    AudioFX.unlock();
    AudioFX.uiClick();
    AudioFX.resetScoreTick();
    resetGame();
  }


  // Debug / screenshot: #shot or #autostart skips menu (Play still required otherwise)
  if (/#(shot|autostart)\b/i.test(location.hash || "")) {
    window.setTimeout(() => {
      try { beginPlay(); } catch (_) {}
    }, 400);
  }

  if (charPrevBtn) {
    charPrevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleCharacter(-1);
      AudioFX.uiClick();
    });
  }
  if (charNextBtn) {
    charNextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleCharacter(1);
      AudioFX.uiClick();
    });
  }
  charDots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = dot.getAttribute("data-char");
      setCharacter(id);
      AudioFX.uiClick();
    });
  });

  // Swipe left/right on carousel stage only (menu overlay); don't fight play gestures
  (function bindCharCarouselSwipe() {
    const target = charStageEl || charCarouselEl || charSelectEl;
    if (!target) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const THRESH = 36;

    function onStart(x, y) {
      if (!overlayIsVisible() || !overlay || overlay.dataset.mode !== "menu") return;
      startX = x;
      startY = y;
      tracking = true;
    }
    function onEnd(x, y, ev) {
      if (!tracking) return;
      tracking = false;
      const dx = x - startX;
      const dy = y - startY;
      if (Math.abs(dx) < THRESH || Math.abs(dx) < Math.abs(dy)) return;
      cycleCharacter(dx < 0 ? 1 : -1);
      AudioFX.uiClick();
      if (ev && ev.cancelable) {
        try { ev.preventDefault(); } catch (_) {}
      }
    }

    target.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      onStart(e.clientX, e.clientY);
    });
    target.addEventListener("pointerup", (e) => {
      onEnd(e.clientX, e.clientY, e);
    });
    target.addEventListener("pointercancel", () => { tracking = false; });
    target.addEventListener("touchstart", (e) => {
      if (!e.touches || !e.touches[0]) return;
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    target.addEventListener("touchend", (e) => {
      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) return;
      onEnd(t.clientX, t.clientY, e);
    }, { passive: false });

    if (charStageEl) {
      charStageEl.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          cycleCharacter(-1);
          AudioFX.uiClick();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          cycleCharacter(1);
          AudioFX.uiClick();
        }
      });
    }
  })();

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    beginPlay();
  });

  if (optionsBtn) {
    optionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      showOptions("menu");
    });
  }

  if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      showLeaderboard("menu");
    });
  }

  if (leaderboardBackBtn) {
    leaderboardBackBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      if (leaderboardReturnMode === "gameover") {
        showGameOver();
      } else {
        showMenu();
      }
    });
  }

  if (goLeaderboardBtn) {
    goLeaderboardBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      showLeaderboard("gameover");
    });
  }

  if (playerNameInput) {
    playerNameInput.value = playerName;
    playerNameInput.addEventListener("change", () => {
      persistPlayerName(playerNameInput.value);
      syncBestFromBoard();
    });
    playerNameInput.addEventListener("blur", () => {
      persistPlayerName(playerNameInput.value);
      syncBestFromBoard();
    });
    playerNameInput.addEventListener("keydown", (e) => {
      if (e.code === "Enter") {
        e.preventDefault();
        persistPlayerName(playerNameInput.value);
        playerNameInput.blur();
      }
    });
  }

  if (optionsBackBtn) {
    optionsBackBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      if (optionsReturnMode === "pause" && playing && !gameOver) {
        showPause();
      } else {
        showMenu();
      }
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      AudioFX.uiClick();
      togglePause();
    });
  }

  if (resumeBtn) {
    resumeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      resumePlay();
    });
  }

  if (pauseOptionsBtn) {
    pauseOptionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      showOptions("pause");
    });
  }

  if (quitMenuBtn) {
    quitMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      AudioFX.uiClick();
      quitToMenu();
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener("input", () => {
      musicVolume = parseInt(volumeSlider.value, 10) || 0;
      if (volumeValue) volumeValue.textContent = String(musicVolume);
      AudioFX.setMusicVolume(musicVolume);
    });
  }

  if (sfxVolumeSlider) {
    sfxVolumeSlider.addEventListener("input", () => {
      sfxVolume = parseInt(sfxVolumeSlider.value, 10) || 0;
      if (sfxVolumeValue) sfxVolumeValue.textContent = String(sfxVolume);
      AudioFX.setSfxVolume(sfxVolume);
    });
  }

  trackBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-track");
      if (!id) return;
      AudioFX.uiClick();
      const playing = AudioFX.isMusicPlaying();
      AudioFX.setTrack(id, { preview: playing, forceRestart: playing });
      // If music already unlocked/playing (menu preview or in-run), switch immediately.
      if (playing) {
        /* setTrack already restarted */
      } else if (AudioFX.getTrack() === id) {
        /* preference saved; Preview starts it */
      }
      syncTrackUi();
    });
  });

  if (previewBgmBtn) {
    previewBgmBtn.addEventListener("click", (e) => {
      e.preventDefault();
      AudioFX.uiClick();
      AudioFX.previewTrack();
      syncTrackUi();
    });
  }

  keymapRows.forEach((row) => {
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = row.getAttribute("data-action");
      if (!action) return;
      if (remappingAction === action) {
        cancelRemap();
        return;
      }
      startRemap(action);
    });
  });

  if (resetControlsBtn) {
    resetControlsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetControls();
      AudioFX.uiClick();
    });
  }

  againBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    beginPlay();
  });

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    AudioFX.uiClick();
    showMenu();
  });

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    AudioFX.toggleMute();
  });

  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Init volumes into AudioFX
  AudioFX.setMusicVolume(musicVolume);
  AudioFX.setSfxVolume(sfxVolume);
  syncVolumeUi();
  syncTrackUi();
  syncKeymapUi();
  syncPauseBtn();
  if (playerNameInput) playerNameInput.value = playerName;
  syncBestFromBoard();
  updateBestHud();
  syncCharSelectUi();
  syncHeartsHud();
  drawCharPreviews(0);
  showMenu();
})();
