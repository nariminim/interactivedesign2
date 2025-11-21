const ASSET_BASE = "./assets/";
const BG_FILES = ["look4.jpg"];

const BG = { mode: "cover", alpha: 220, panSpeed: 0.02 };

const GRID = {
  cols: 6,
  rows: 10,
  pad: 24,
  spacing: 10,
  rectAR: 4 / 3,
  circleRatio: 0.25,
  triRatio: 0.25,
};

const PHY = {
  restitution: 0.02,
  friction: 0.45,
  air: 0.05,
  wall: 60,
};

const RENDER = {
  fillAlpha: 22,
  misregAlpha: 20,
  misregOffset: 3.0,
  misregRotateDeg: 2.0,
  invertEnabled: true,
  invertAlpha: 255,
};

const TOUCH_CTRL = {
  maxG: 1.3,
  smooth: 0.1,
  swipeMs: 110,
  swipeMinPx: 26,
  impulseScale: 0.018,
  dblTapMs: 260,
  dblTapPx: 28,
};

const GRAIN = {
  enabled: true,
  alpha: 16,
  density: 0.7,
  mode: "multiply",
};

let canvas;
let bgImgs = [],
  _bgLoaded = 0,
  bgPan = 0;

let engine, world;
let tiles = [];

let gVec = { x: 0, y: 1 },
  gLpf = { x: 0, y: 1 };
let lastTapAt = 0,
  lastTapPos = { x: 0, y: 0 };
const lastById = new Map();
let pinchPrev = null;

let gInv;
let gGrain;

function drawImageFit(img, mode = "cover", alpha255 = 150) {
  if (!img) return;
  const cw = width,
    ch = height,
    iw = img.width,
    ih = img.height;
  const canvasAR = cw / ch,
    imgAR = iw / ih;
  let w, h;
  if (mode === "cover") {
    if (imgAR > canvasAR) {
      h = ch * 1.02;
      w = h * imgAR;
    } else {
      w = cw * 1.02;
      h = w / imgAR;
    }
  } else {
    if (imgAR > canvasAR) {
      w = cw * 0.98;
      h = w / imgAR;
    } else {
      h = ch * 0.98;
      w = h * imgAR;
    }
  }
  push();
  imageMode(CENTER);
  tint(255, alpha255);
  image(img, cw / 2, ch / 2, w, h);
  pop();
}
function drawBackgroundCollage(imgs, pan, mode = "cover", alpha255 = 150) {
  if (!imgs || !imgs.length) return;
  for (let i = 0; i < imgs.length; i++) {
    push();
    const off = (i % 2 === 0 ? pan : -pan) * 0.25;
    translate(off, off * 0.6);
    drawImageFit(imgs[i], mode, alpha255);
    pop();
  }
}

function preload() {
  const files = BG_FILES.flatMap((s) => String(s).split(/[;,]+/))
    .map((s) => s.trim())
    .filter(Boolean);
  for (const fn of files) {
    const url = ASSET_BASE + fn;
    bgImgs.push(
      loadImage(
        url,
        () => {
          _bgLoaded++;
        },
        () => console.warn("❗BG not found:", url)
      )
    );
  }
}
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = "none";
  const opt = { passive: false };
  canvas.elt.addEventListener("touchstart", (e) => e.preventDefault(), opt);
  canvas.elt.addEventListener("touchmove", (e) => e.preventDefault(), opt);
  canvas.elt.addEventListener("touchend", (e) => e.preventDefault(), opt);
  canvas.elt.addEventListener("touchcancel", (e) => e.preventDefault(), opt);
  pixelDensity(1);
  frameRate(60);
  const { Engine } = Matter;
  engine = Engine.create();
  world = engine.world;
  world.gravity.x = 0;
  world.gravity.y = 1;

  makeWorldBounds();
  buildGrid();

  gInv = createGraphics(width, height);
  gGrain = createGraphics(width, height);
  gInv.pixelDensity(Math.min(2, pixelDensity()));
  gGrain.pixelDensity(1);
}
function draw() {
  background(255);

  bgPan += BG.panSpeed;
  drawBackgroundCollage(bgImgs, bgPan, BG.mode, BG.alpha);

  if (touches && touches.length > 0) updateGravityFromTouches();
  gLpf.x = lerp(gLpf.x, gVec.x, TOUCH_CTRL.smooth);
  gLpf.y = lerp(gLpf.y, gVec.y, TOUCH_CTRL.smooth);
  world.gravity.x = gLpf.x;
  world.gravity.y = gLpf.y;

  Matter.Engine.update(engine, 1000 / 60);

  if (RENDER.invertEnabled) {
    gInv.clear();
    gInv.push();
    gInv.noStroke();
    gInv.fill(255, RENDER.invertAlpha);
    for (const t of tiles) drawShape(gInv, t, true);
    gInv.pop();
    push();
    blendMode(DIFFERENCE);
    image(gInv, 0, 0);
    pop();
  }

  const misOff = RENDER.misregOffset;
  const rad = radians(RENDER.misregRotateDeg);
  const cosT = Math.cos(rad),
    sinT = Math.sin(rad);

  for (const t of tiles) {
    push();
    translate(t.body.position.x + misOff, t.body.position.y + misOff);
    rotate(t.body.angle + rad);
    noStroke();
    fill(0, RENDER.misregAlpha);
    drawShapeLocal(t);
    pop();

    push();
    translate(
      t.body.position.x - misOff * cosT,
      t.body.position.y + misOff * sinT
    );
    rotate(t.body.angle - rad);
    noStroke();
    fill(0, RENDER.misregAlpha);
    drawShapeLocal(t);
    pop();
  }

  for (const t of tiles) {
    push();
    translate(t.body.position.x, t.body.position.y);
    rotate(t.body.angle);
    noStroke();
    fill(0, RENDER.fillAlpha);
    drawShapeLocal(t);
    pop();
  }

  if (GRAIN.enabled) {
    drawGrain(gGrain, GRAIN);
    push();
    if (GRAIN.mode === "multiply") blendMode(MULTIPLY);
    else if (GRAIN.mode === "overlay") blendMode(OVERLAY);
    else if (GRAIN.mode === "soft-light") blendMode(SOFT_LIGHT);
    image(gGrain, 0, 0);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  clearWorldBounds();
  makeWorldBounds();
  rebuildGridPreserveKinds();
  gInv = createGraphics(width, height);
  gGrain = createGraphics(width, height);
  gInv.pixelDensity(Math.min(2, pixelDensity()));
  gGrain.pixelDensity(1);
}

function buildGrid() {
  clearGrid();

  const pad = GRID.pad;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const cols = GRID.cols,
    rows = GRID.rows;
  const baseW = (innerW - (cols - 1) * GRID.spacing) / cols;
  const baseH = (innerH - (rows - 1) * GRID.spacing) / rows;

  let cellW = baseW;
  let cellH = baseW / GRID.rectAR;
  if (cellH > baseH) {
    cellH = baseH;
    cellW = baseH * GRID.rectAR;
  }

  const startX =
    (width - (cellW * cols + GRID.spacing * (cols - 1))) / 2 + cellW / 2;
  const startY =
    (height - (cellH * rows + GRID.spacing * (rows - 1))) / 2 + cellH / 2;

  const { Bodies, Composite, Body } = Matter;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (cellW + GRID.spacing);
      const y = startY + r * (cellH + GRID.spacing);

      const rnd = Math.random();
      let kind = "rect";
      if (rnd < GRID.circleRatio) kind = "circle";
      else if (rnd < GRID.circleRatio + GRID.triRatio) kind = "tri";

      let w = cellW,
        h = cellH;
      const jitter = 0.06;
      w *= 1 + randRange(-jitter, jitter);
      h *= 1 + randRange(-jitter, jitter);
      const angle0 = radians(randRange(-3, 3));

      let body,
        meta = {};
      if (kind === "circle") {
        const d = Math.min(w, h);
        body = Bodies.circle(x, y, d * 0.5, phyOpts());
        meta = { w: d, h: d, r: d * 0.5 };
      } else if (kind === "tri") {
        const d = Math.min(w, h);
        body = Bodies.polygon(x, y, 3, d * 0.5, phyOpts());
        meta = { w: d, h: d, r: d * 0.5 };
      } else {
        body = Bodies.rectangle(x, y, w, h, phyOpts());
        meta = { w, h };
      }
      Body.setAngle(body, angle0);
      Composite.add(world, body);
      tiles.push({ body, kind, ...meta });
    }
  }
}
function rebuildGridPreserveKinds() {
  const pad = GRID.pad;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const cols = GRID.cols,
    rows = GRID.rows;
  const baseW = (innerW - (cols - 1) * GRID.spacing) / cols;
  const baseH = (innerH - (rows - 1) * GRID.spacing) / rows;

  let cellW = baseW;
  let cellH = baseW / GRID.rectAR;
  if (cellH > baseH) {
    cellH = baseH;
    cellW = baseH * GRID.rectAR;
  }

  const startX =
    (width - (cellW * cols + GRID.spacing * (cols - 1))) / 2 + cellW / 2;
  const startY =
    (height - (cellH * rows + GRID.spacing * (rows - 1))) / 2 + cellH / 2;

  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tiles[i++];
      if (!t) return;
      const x = startX + c * (cellW + GRID.spacing);
      const y = startY + r * (cellH + GRID.spacing);
      Matter.Body.setPosition(t.body, { x, y });
    }
  }
}
function phyOpts() {
  return {
    restitution: PHY.restitution,
    friction: PHY.friction,
    frictionAir: PHY.air,
  };
}
function clearGrid() {
  const { Composite } = Matter;
  for (const t of tiles) Composite.remove(world, t.body);
  tiles.length = 0;
}

function makeWorldBounds() {
  const t = PHY.wall,
    w = width,
    h = height;
  const { Bodies, Composite } = Matter;
  const opts = { isStatic: true, restitution: 0.6 };
  const walls = [
    Bodies.rectangle(-t, h / 2, t * 2, h + t * 2, opts),
    Bodies.rectangle(w + t, h / 2, t * 2, h + t * 2, opts),
    Bodies.rectangle(w / 2, -t, w + t * 2, t * 2, opts),
    Bodies.rectangle(w / 2, h + t, w + t * 2, t * 2, opts),
  ];
  Composite.add(world, walls);
  world._boundsWalls = walls;
}
function clearWorldBounds() {
  if (!world || !world._boundsWalls) return;
  const { Composite } = Matter;
  for (const b of world._boundsWalls) Composite.remove(world, b);
  world._boundsWalls = null;
}

function updateGravityFromTouches() {
  if (!touches || touches.length === 0) return;
  let sx = 0,
    sy = 0;
  for (const t of touches) {
    sx += t.x;
    sy += t.y;
  }
  sx /= touches.length;
  sy /= touches.length;

  const nx = (sx - width / 2) / (width / 2);
  const ny = (sy - height / 2) / (height / 2);
  gVec.x = constrain(nx, -1, 1) * TOUCH_CTRL.maxG;
  gVec.y = constrain(ny, -1, 1) * TOUCH_CTRL.maxG;
}
function trySwipeImpulse(t, last) {
  if (!last) return;
  const dt = performance.now() - last.t;
  const dx = t.x - last.x,
    dy = t.y - last.y;
  const d = Math.hypot(dx, dy);
  if (dt <= TOUCH_CTRL.swipeMs && d >= TOUCH_CTRL.swipeMinPx) {
    const dir = { x: dx / d, y: dy / d };
    const { Body } = Matter;
    for (const tile of tiles) {
      const bp = tile.body.position;
      const dist = Math.hypot(bp.x - t.x, bp.y - t.y);
      if (dist < Math.max(tile.w || tile.r * 2, tile.h || tile.r * 2) * 1.0) {
        const f = TOUCH_CTRL.impulseScale * tile.body.mass;
        Body.applyForce(tile.body, bp, { x: dir.x * f, y: dir.y * f });
        Body.setAngularVelocity(
          tile.body,
          (tile.body.angularVelocity || 0) + randRange(-0.05, 0.05)
        );
      }
    }
  }
}
function shakeKick() {
  const { Body } = Matter;
  for (const t of tiles) {
    const b = t.body;
    const f = 0.02 * b.mass;
    Body.applyForce(b, b.position, {
      x: randRange(-f, f),
      y: randRange(-f, f),
    });
    Body.setAngularVelocity(
      b,
      (b.angularVelocity || 0) + randRange(-0.09, 0.09)
    );
  }
}

function touchStarted() {
  const now = performance.now();

  if (touches.length === 1) {
    const dx = touches[0].x - lastTapPos.x;
    const dy = touches[0].y - lastTapPos.y;
    if (
      now - lastTapAt < TOUCH_CTRL.dblTapMs &&
      Math.hypot(dx, dy) < TOUCH_CTRL.dblTapPx
    ) {
      shakeKick();
      lastTapAt = 0;
    } else {
      lastTapAt = now;
      lastTapPos = { x: touches[0].x, y: touches[0].y };
    }
  }

  for (const t of touches) {
    const id = getTid(t);
    lastById.set(id, { x: t.x, y: t.y, t: now });
  }

  if (touches.length >= 2)
    pinchPrev = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
  else pinchPrev = null;

  updateGravityFromTouches();
  return false;
}
function touchMoved() {
  if (touches.length >= 2) {
    const d = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
    if (pinchPrev != null) {
      const delta = d - pinchPrev;
      RENDER.misregOffset = constrain(
        RENDER.misregOffset + delta * 0.02,
        0,
        12
      );
      RENDER.misregRotateDeg = constrain(
        RENDER.misregRotateDeg + delta * 0.01,
        0,
        10
      );
    }
    pinchPrev = d;
  } else {
    pinchPrev = null;
  }

  updateGravityFromTouches();

  for (const t of touches) {
    const id = getTid(t);
    const last = lastById.get(id);
    trySwipeImpulse(t, last);
    lastById.set(id, { x: t.x, y: t.y, t: performance.now() });
  }
  return false;
}
function touchEnded() {
  const alive = new Set(touches.map(getTid));
  for (const [id] of lastById) if (!alive.has(id)) lastById.delete(id);
  if (touches.length === 0) pinchPrev = null;
  return false;
}

function drawGrain(g, cfg) {
  g.clear();
  g.noStroke();
  g.fill(0, cfg.alpha);
  const N = Math.floor(width * height * 0.00005 * (1 + cfg.density * 10));
  for (let i = 0; i < N; i++) {
    g.rect(Math.random() * width, Math.random() * height, 1, 1);
  }
}

function drawShape(g, t) {
  g.push();
  g.translate(t.body.position.x, t.body.position.y);
  g.rotate(t.body.angle);
  if (t.kind === "circle") {
    g.ellipse(0, 0, t.r * 2, t.r * 2);
  } else if (t.kind === "tri") {
    const R = t.r || Math.min(t.w, t.h) * 0.5;
    g.beginShape();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * ((2 * Math.PI) / 3);
      g.vertex(Math.cos(a) * R, Math.sin(a) * R);
    }
    g.endShape(CLOSE);
  } else {
    g.rectMode(CENTER);
    g.rect(0, 0, t.w, t.h);
  }
  g.pop();
}
function drawShapeLocal(t) {
  if (t.kind === "circle") ellipse(0, 0, t.r * 2, t.r * 2);
  else if (t.kind === "tri") {
    const R = t.r || Math.min(t.w, t.h) * 0.5;
    beginShape();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * ((2 * Math.PI) / 3);
      vertex(Math.cos(a) * R, Math.sin(a) * R);
    }
    endShape(CLOSE);
  } else {
    rectMode(CENTER);
    rect(0, 0, t.w, t.h);
  }
}

function randRange(a, b) {
  return a + Math.random() * (b - a);
}
function radians(deg) {
  return (deg * Math.PI) / 180;
}
function getTid(t) {
  return t.id ?? t.identifier ?? 0;
}
