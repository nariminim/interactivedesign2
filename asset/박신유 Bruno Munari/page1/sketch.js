const { Engine, World, Bodies, Body, Composite } = Matter;

const EYE_RATIO = 0.36;
const ZONE_RADIUS_SCALE = 0.84;
const ZONE_GLOBAL_SHIFT = { x: 0, y: -120 };
const ZONE_PER_EYE_SHIFT = [
  { x: -6, y: 0 },
  { x: +6, y: 0 },
];
const PUPIL_OFFSET = {
  left: { x: +0.28, y: -0.18 },
  right: { x: -0.28, y: -0.18 },
};

let svgPaths = [],
  rawPathEls = [];
let vb = { x: 0, y: 0, w: 1, h: 1 };
let contentBB = null,
  ready = false;

const FIT_PADDING = 0.95;
const BASE_STROKE = 4;
let scaleToFit = 1,
  offX = 0,
  offY = 0,
  layout = { s: 1, dx: 0, dy: 0 };

let edgeBodies = [];
const EDGE_THICKNESS = 10;
const STEP_PX = 6;

let eyes = [];
let eyeZones = [null, null],
  eyeZonesRaw = [null, null];
let eyeR = 20;

const EYE_RESTITUTION = 0.6;
const EYE_FRICTION = 0.02;
const EYE_DENSITY = 0.002;
const EYE_AIR = 0.02;
let MAX_SPEED = 1800;

let walls = [];

let dragging = {
  active: false,
  id: null,
  idx: -1,
  lastPos: null,
  lastTime: 0,
  lastVel: null,
};
const PICK_DIST_BASE = 28;

let hitSnd,
  soundReady = false,
  audioUnlocked = false;
let lastMoveAt = [0, 0];
const HIT_COOLDOWN = 90;
const MIN_MOVE_SPEED = 60;
const SPEED_VOL_MIN = 80,
  SPEED_VOL_MAX = 1200;
const VOL_MIN = 0.06,
  VOL_MAX = 0.24;
const RATE_MIN = 0.92,
  RATE_MAX = 1.16;

let prevPos = [null, null];
let prevTS = [0, 0];

let engine, world;

function preload() {
  soundFormats("mp3", "wav", "aiff");
  hitSnd = loadSound(
    "eye.mp3",
    () => {
      soundReady = true;
      try {
        hitSnd.playMode("restart");
      } catch (_) {}
    },
    (err) => {
      console.log("eye.mp3 load failed:", err);
      soundReady = false;
    }
  );
}

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  noFill();
  stroke(0);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1.0;
  engine.positionIterations = 10;
  engine.velocityIterations = 10;

  const el = cnv.elt;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", onPointerDown, { passive: false });
  el.addEventListener("pointermove", onPointerMove, { passive: false });
  el.addEventListener("pointerup", onPointerUp, { passive: false });
  el.addEventListener("pointercancel", onPointerUp, { passive: false });
  el.addEventListener("pointerleave", onPointerUp, { passive: false });

  window.mousePressed = tryUnlockAudio;
  window.touchStarted = tryUnlockAudio;

  loadSVGPaths("face1.svg")
    .then(() => {
      rebuildEdges();
      buildWalls();
      detectEyeZonesRaw();
      finalizeEyeZones();
      createEyes();

      for (let i = 0; i < 2; i++) {
        prevPos[i] = eyes[i]?.position ? { ...eyes[i].position } : null;
        prevTS[i] = performance.now();
      }
      ready = true;
      loop();
    })
    .catch(console.error);

  noLoop();
}

function draw() {
  Engine.update(engine, deltaTime || 16.666);

  for (const b of eyes) {
    const s = Math.hypot(b.velocity.x, b.velocity.y);
    if (s > MAX_SPEED) {
      Body.setVelocity(b, {
        x: (b.velocity.x * MAX_SPEED) / s,
        y: (b.velocity.y * MAX_SPEED) / s,
      });
    }
  }

  containEyesInZones();

  for (let i = 0; i < eyes.length; i++) {
    const now = performance.now();
    const pos = eyes[i].position;
    if (prevPos[i]) {
      const dt = Math.max(1, now - prevTS[i]);
      const dist = Math.hypot(pos.x - prevPos[i].x, pos.y - prevPos[i].y);
      const speed = (dist / dt) * 1000;
      maybePlayMove(i, speed);
    }
    prevPos[i] = { x: pos.x, y: pos.y };
    prevTS[i] = now;
  }

  background("#f2f2ed");

  if (ready) {
    const bb = contentBB || vb;
    scaleToFit = Math.min(
      (width * FIT_PADDING) / bb.w,
      (height * FIT_PADDING) / bb.h
    );
    const cx = bb.x + bb.w / 2,
      cy = bb.y + bb.h / 2;
    offX = width / 2 - cx * scaleToFit;
    offY = height / 2 - cy * scaleToFit;

    const ctx = drawingContext;
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scaleToFit, scaleToFit);
    ctx.lineWidth = BASE_STROKE / scaleToFit;
    ctx.strokeStyle = "#000";
    for (const p of svgPaths) ctx.stroke(p);
    ctx.restore();
  }

  // 눈알
  noStroke();
  fill(20);
  for (const b of eyes) {
    circle(b.position.x, b.position.y, eyeR * 2);
    fill(255, 230);
    circle(b.position.x - eyeR * 0.35, b.position.y - eyeR * 0.35, eyeR * 0.45);
    fill(20);
  }
}

//Svg
async function loadSVGPaths(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const text = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) throw new Error("No <svg> root found");

  const vbAttr = svg.getAttribute("viewBox");
  if (vbAttr) {
    const [x, y, w, h] = vbAttr.trim().split(/\s+|,/).map(Number);
    vb = { x, y, w, h };
  } else {
    const w = parseFloat(svg.getAttribute("width")) || width;
    const h = parseFloat(svg.getAttribute("height")) || height;
    vb = { x: 0, y: 0, w, h };
  }

  rawPathEls = Array.from(doc.querySelectorAll("path"));
  svgPaths = rawPathEls
    .map((el) => el.getAttribute("d"))
    .filter(Boolean)
    .map((d) => new Path2D(d));
  contentBB = computeContentBBox(rawPathEls, svg);
}

function computeContentBBox(pathEls, svgEl) {
  const NS = "http://www.w3.org/2000/svg";
  const hidden = document.createElementNS(NS, "svg");
  hidden.setAttribute(
    "viewBox",
    svgEl.getAttribute("viewBox") || `0 0 ${vb.w} ${vb.h}`
  );
  Object.assign(hidden.style, {
    position: "absolute",
    width: "0",
    height: "0",
    left: "-99999px",
    top: "-99999px",
  });
  document.body.appendChild(hidden);

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const el of pathEls) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", el.getAttribute("d"));
    hidden.appendChild(p);
    const bb = p.getBBox();
    hidden.removeChild(p);
    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.width);
    maxY = Math.max(maxY, bb.y + bb.height);
  }
  document.body.removeChild(hidden);
  if (!isFinite(minX)) return { ...vb };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function rebuildEdges() {
  for (const b of edgeBodies) Composite.remove(world, b);
  edgeBodies.length = 0;

  const bb = contentBB || vb;
  const s = Math.min(
    (width * FIT_PADDING) / bb.w,
    (height * FIT_PADDING) / bb.h
  );
  const dx = width / 2 - (bb.x + bb.w / 2) * s;
  const dy = height / 2 - (bb.y + bb.h / 2) * s;
  layout = { s, dx, dy };

  const stepSvg = Math.max(0.4, STEP_PX / s);

  const NS = "http://www.w3.org/2000/svg";
  const hidden = document.createElementNS(NS, "svg");
  hidden.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  Object.assign(hidden.style, {
    position: "absolute",
    width: "0",
    height: "0",
    left: "-99999px",
    top: "-99999px",
  });
  document.body.appendChild(hidden);

  for (const src of rawPathEls) {
    const el = document.createElementNS(NS, "path");
    el.setAttribute("d", src.getAttribute("d") || "");
    hidden.appendChild(el);

    let total = 0;
    try {
      total = el.getTotalLength();
    } catch {
      hidden.removeChild(el);
      continue;
    }

    const pts = [];
    for (let d = 0; d <= total; d += stepSvg) {
      const p = el.getPointAtLength(d);
      pts.push({ x: p.x * s + dx, y: p.y * s + dy });
    }
    const pend = el.getPointAtLength(total);
    pts.push({ x: pend.x * s + dx, y: pend.y * s + dy });

    hidden.removeChild(el);

    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.5) continue;
      const midX = (a.x + b.x) / 2,
        midY = (a.y + b.y) / 2;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const seg = Bodies.rectangle(midX, midY, len, EDGE_THICKNESS, {
        isStatic: true,
        angle,
        friction: 0.3,
        restitution: 0.0,
        render: { visible: false },
      });
      edgeBodies.push(seg);
    }
  }

  document.body.removeChild(hidden);
  World.add(world, edgeBodies);
}

function detectEyeZonesRaw() {
  const pickBySelector = (sel) => {
    const el = rawPathEls.find((e) => {
      const id = (e.getAttribute("id") || "").toLowerCase();
      const cls = (e.getAttribute("class") || "").toLowerCase();
      const data = (e.getAttribute("data-eye") || "").toLowerCase();
      return id.includes(sel) || cls.includes(sel) || data.includes(sel);
    });
    return el || null;
  };

  const leftEl = pickBySelector("eye-left") || pickBySelector("left") || null;
  const rightEl =
    pickBySelector("eye-right") || pickBySelector("right") || null;

  let Lc, Rc, Lraw, Rraw;

  if (leftEl && rightEl) {
    const Lbb = getBBoxOfD(leftEl.getAttribute("d") || "");
    const Rbb = getBBoxOfD(rightEl.getAttribute("d") || "");
    if (Lbb && Rbb) {
      const LcSvg = { x: Lbb.x + Lbb.width / 2, y: Lbb.y + Lbb.height / 2 };
      const RcSvg = { x: Rbb.x + Rbb.width / 2, y: Rbb.y + Rbb.height / 2 };
      Lc = svgToCanvas(LcSvg);
      Rc = svgToCanvas(RcSvg);
      Lraw = Math.min(Lbb.width, Lbb.height) * layout.s * 0.5;
      Rraw = Math.min(Rbb.width, Rbb.height) * layout.s * 0.5;
    }
  }

  if (!Lc || !Rc) {
    const loops = rawPathEls
      .map((el) => {
        const bb = getBBoxOfD(el.getAttribute("d") || "");
        return bb ? { bb, d: el.getAttribute("d") } : null;
      })
      .filter(Boolean)
      .filter((o) => {
        const ar = o.bb.width / Math.max(1e-6, o.bb.height);
        return (
          ar > 0.7 &&
          ar < 1.3 &&
          Math.min(o.bb.width, o.bb.height) > contentBB.w * 0.15
        );
      });

    if (loops.length >= 2) {
      loops.sort((a, b) => a.bb.x + a.bb.width / 2 - (b.bb.x + b.bb.width / 2));
      const left = loops[0],
        right = loops[loops.length - 1];
      Lc = svgToCanvas({
        x: left.bb.x + left.bb.width / 2,
        y: left.bb.y + left.bb.height / 2,
      });
      Rc = svgToCanvas({
        x: right.bb.x + right.bb.width / 2,
        y: right.bb.y + right.bb.height / 2,
      });
      Lraw = Math.min(left.bb.width, left.bb.height) * layout.s * 0.5;
      Rraw = Math.min(right.bb.width, right.bb.height) * layout.s * 0.5;
    }
  }

  if (!Lc || !Rc) {
    const bb = contentBB || vb;
    const cx = bb.x + bb.w / 2,
      cy = bb.y + bb.h / 2;
    const dx = bb.w * 0.18,
      dy = bb.h * -0.02;
    Lc = svgToCanvas({ x: cx - dx, y: cy + dy });
    Rc = svgToCanvas({ x: cx + dx, y: cy + dy });
    const raw = Math.min(width, height) * 0.1 * 0.5;
    Lraw = raw;
    Rraw = raw;
  }

  eyeZonesRaw[0] = { cx: Lc.x, cy: Lc.y, rawR: Lraw };
  eyeZonesRaw[1] = { cx: Rc.x, cy: Rc.y, rawR: Rraw };

  eyeZonesRaw.forEach((z, i) => {
    z.cx += (ZONE_GLOBAL_SHIFT.x || 0) + (ZONE_PER_EYE_SHIFT[i]?.x || 0);
    z.cy += (ZONE_GLOBAL_SHIFT.y || 0) + (ZONE_PER_EYE_SHIFT[i]?.y || 0);
  });
}

/* ---------------- 최종 눈 영역 ---------------- */
function finalizeEyeZones() {
  const base = Math.min(eyeZonesRaw[0].rawR, eyeZonesRaw[1].rawR);
  const minPx = 8,
    maxPx = Math.max(18, Math.min(width, height) * 0.05);
  eyeR = clamp(base * EYE_RATIO, minPx, maxPx);

  const margin = 2;
  for (let i = 0; i < 2; i++) {
    const rawR = eyeZonesRaw[i].rawR * ZONE_RADIUS_SCALE;
    const r = Math.max(12, rawR - eyeR - margin);
    eyeZones[i] = { cx: eyeZonesRaw[i].cx, cy: eyeZonesRaw[i].cy, r };
  }

  MAX_SPEED = 1800 * clamp(Math.min(width, height) / 1080, 0.6, 1.6);
}

function createEyes() {
  for (const b of eyes) Composite.remove(world, b);
  eyes.length = 0;

  const opt = {
    restitution: EYE_RESTITUTION,
    friction: EYE_FRICTION,
    frictionAir: EYE_AIR,
    density: EYE_DENSITY,
  };

  const L = {
    x: eyeZones[0].cx + eyeZones[0].r * PUPIL_OFFSET.left.x,
    y: eyeZones[0].cy + eyeZones[0].r * PUPIL_OFFSET.left.y,
  };
  const R = {
    x: eyeZones[1].cx + eyeZones[1].r * PUPIL_OFFSET.right.x,
    y: eyeZones[1].cy + eyeZones[1].r * PUPIL_OFFSET.right.y,
  };

  const l = Bodies.circle(L.x, L.y, eyeR, opt);
  const r = Bodies.circle(R.x, R.y, eyeR, opt);
  eyes = [l, r];
  World.add(world, eyes);
}

function containEyesInZones() {
  for (let i = 0; i < eyes.length; i++) {
    const b = eyes[i],
      z = eyeZones[i] || eyeZones[0];
    if (!z) continue;
    const dx = b.position.x - z.cx,
      dy = b.position.y - z.cy;
    const dist = Math.hypot(dx, dy),
      limit = z.r;
    if (dist > limit) {
      const nx = dx / (dist || 1),
        ny = dy / (dist || 1);
      const px = z.cx + nx * limit,
        py = z.cy + ny * limit;
      Body.setPosition(b, { x: px, y: py });
      const v = b.velocity,
        vn = v.x * nx + v.y * ny;
      const vt = { x: v.x - vn * nx, y: v.y - vn * ny };
      const bounce = 0.7;
      Body.setVelocity(b, {
        x: vt.x - vn * nx * bounce,
        y: vt.y - vn * ny * bounce,
      });
    }
  }
}

function buildWalls() {
  for (const w of walls) Composite.remove(world, w);
  walls.length = 0;
  const pad = 120;
  walls.push(
    Bodies.rectangle(width / 2, -pad, width + pad * 2, pad * 2, {
      isStatic: true,
    })
  );
  walls.push(
    Bodies.rectangle(width / 2, height + pad, width + pad * 2, pad * 2, {
      isStatic: true,
    })
  );
  walls.push(
    Bodies.rectangle(-pad, height / 2, pad * 2, height + pad * 2, {
      isStatic: true,
    })
  );
  walls.push(
    Bodies.rectangle(width + pad, height / 2, pad * 2, height + pad * 2, {
      isStatic: true,
    })
  );
  World.add(world, walls);
}

function maybePlayMove(idx, speed) {
  if (!soundReady || !audioUnlocked) return;
  if (speed < MIN_MOVE_SPEED) return;
  const now = millis();
  if (now - lastMoveAt[idx] < HIT_COOLDOWN) return;

  const vol = constrain(
    map(speed, SPEED_VOL_MIN, SPEED_VOL_MAX, VOL_MIN, VOL_MAX),
    0.0,
    0.4
  );
  const rate = constrain(
    map(speed, SPEED_VOL_MIN, SPEED_VOL_MAX, RATE_MIN, RATE_MAX),
    0.8,
    1.4
  );

  hitSnd.setVolume(vol);
  hitSnd.rate(rate);
  hitSnd.play();

  lastMoveAt[idx] = now;
}

function tryUnlockAudio() {
  if (audioUnlocked) return;
  const ctx = getAudioContext?.();
  if (ctx && ctx.state !== "running") {
    ctx.resume?.().then(() => {
      audioUnlocked = true;

      if (soundReady) {
        hitSnd.setVolume(0.05);
        hitSnd.rate(1.0);
        hitSnd.play();
      }
    });
  } else {
    audioUnlocked = true;
    if (soundReady) {
      hitSnd.setVolume(0.05);
      hitSnd.rate(1.0);
      hitSnd.play();
    }
  }
}

function svgToCanvas(p) {
  return { x: p.x * layout.s + layout.dx, y: p.y * layout.s + layout.dy };
}
function getBBoxOfD(dStr) {
  if (!dStr) return null;
  const NS = "http://www.w3.org/2000/svg";
  const hidden = document.createElementNS(NS, "svg");
  hidden.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  Object.assign(hidden.style, {
    position: "absolute",
    width: "0",
    height: "0",
    left: "-99999px",
    top: "-99999px",
  });
  document.body.appendChild(hidden);
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", dStr);
  hidden.appendChild(p);
  const bb = p.getBBox();
  document.body.removeChild(hidden);
  return bb;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function onPointerDown(e) {
  e.preventDefault();
  tryUnlockAudio();
  const { x, y } = pointerToCanvas(e);
  const idx = pickEye(x, y, Math.max(PICK_DIST_BASE, eyeR + 8));
  if (idx >= 0) {
    dragging = {
      active: true,
      id: e.pointerId,
      idx,
      lastPos: { x, y },
      lastTime: performance.now(),
      lastVel: null,
    };
  }
}
function onPointerMove(e) {
  if (!dragging.active || e.pointerId !== dragging.id) return;
  e.preventDefault();
  let { x, y } = pointerToCanvas(e);

  const z = eyeZones[dragging.idx] || eyeZones[0];
  if (z) {
    const dx = x - z.cx,
      dy = y - z.cy;
    const dist = Math.hypot(dx, dy),
      limit = z.r - 0.5;
    if (dist > limit) {
      const k = limit / (dist || 1);
      x = z.cx + dx * k;
      y = z.cy + dy * k;
    }
  }

  const now = performance.now();
  const dt = Math.max(1, now - dragging.lastTime);
  Body.setPosition(eyes[dragging.idx], { x, y });
  dragging.lastVel = {
    vx: ((x - dragging.lastPos.x) / dt) * 1000,
    vy: ((y - dragging.lastPos.y) / dt) * 1000,
  };
  dragging.lastPos = { x, y };
  dragging.lastTime = now;
}
function onPointerUp(e) {
  if (!dragging.active || e.pointerId !== dragging.id) return;
  e.preventDefault();
  if (dragging.lastVel) {
    const v = dragging.lastVel;
    const s = Math.hypot(v.vx, v.vy);
    const k = s > MAX_SPEED ? MAX_SPEED / s : 1;
    Body.setVelocity(eyes[dragging.idx], { x: v.vx * k, y: v.vy * k });
  }
  dragging = {
    active: false,
    id: null,
    idx: -1,
    lastPos: null,
    lastTime: 0,
    lastVel: null,
  };
}

function pickEye(x, y, distPx) {
  const d2 = distPx * distPx;
  for (let i = 0; i < eyes.length; i++) {
    const b = eyes[i];
    const dx = x - b.position.x,
      dy = y - b.position.y;
    if (dx * dx + dy * dy <= d2) return i;
  }
  return -1;
}
function pointerToCanvas(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (width / rect.width),
    y: (e.clientY - rect.top) * (height / rect.height),
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (!ready) return;

  rebuildEdges();
  buildWalls();
  detectEyeZonesRaw();
  finalizeEyeZones();
  createEyes();

  for (let i = 0; i < 2; i++) {
    prevPos[i] = eyes[i]?.position ? { ...eyes[i].position } : null;
    prevTS[i] = performance.now();
  }
  containEyesInZones();
}
