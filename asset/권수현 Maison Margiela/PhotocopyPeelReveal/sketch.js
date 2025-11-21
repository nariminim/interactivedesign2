const ASSET_BASE = "./assets/";
const BG_BASE_FILES = ["look6.jpg"];
const BG_SKIN_FILES = ["look5.jpg"];

const BG = { mode: "cover", alpha: 255, panSpeed: 0.01 };

const TEAR = {
  radius: 46,
  aspect: 2.6,
  verts: 14,
  jitter: 0.35,
  emitMs: 60,
  minMove: 6,
};

const PHY = { restitution: 0.18, friction: 0.65, air: 0.02 };
const THROW = { velScale: 0.024, radial: 0.006, spin: 0.09 };

const STITCH = {
  enabled: true,
  step: 120,
  len: 8,
  alpha: 200,
};

const BOUNDS = { enabled: false };
const CULL = { margin: 240 };
const CONTROL = { maxPieces: 120 };

let canvas,
  baseImgs = [],
  skinImgs = [],
  _baseLoaded = 0,
  _skinLoaded = 0,
  bgPan = 0;
let engine, world;
let pieces = [];
let gSkin, gStitch;
let lastTapAt = 0,
  lastTapPos = { x: 0, y: 0 };
const DOUBLE_TAP_MS = 260,
  DOUBLE_TAP_PX = 28;
let lastEmitT = 0,
  lastEmitPos = { x: 0, y: 0 },
  lastDrag = { x: 0, y: 0, t: 0 };
let lastAngle = 0;
let _p5;

function drawImageFit(g, img, mode = "cover", alpha255 = 255) {
  if (!img) return;
  const cw = g.width,
    ch = g.height,
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
  g.push();
  g.imageMode(CENTER);
  g.tint(255, alpha255);
  g.image(img, cw / 2, ch / 2, w, h);
  g.pop();
}
function drawBackgroundCollage(imgs, pan, mode = "cover", alpha255 = 255) {
  if (!imgs || !imgs.length) return;
  for (let i = 0; i < imgs.length; i++) {
    push();
    const off = (i % 2 === 0 ? pan : -pan) * 0.25;
    translate(off, off * 0.6);
    drawImageFit(_p5, imgs[i], mode, alpha255);
    pop();
  }
}

function preload() {
  for (const fn of BG_BASE_FILES)
    baseImgs.push(
      loadImage(
        ASSET_BASE + fn,
        () => _baseLoaded++,
        () => {}
      )
    );
  for (const fn of BG_SKIN_FILES)
    skinImgs.push(
      loadImage(
        ASSET_BASE + fn,
        () => _skinLoaded++,
        () => {}
      )
    );
}
function setup() {
  _p5 = this;
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = "none";
  const opt = { passive: false };
  canvas.elt.addEventListener("touchstart", (e) => e.preventDefault(), opt);
  canvas.elt.addEventListener("touchmove", (e) => e.preventDefault(), opt);
  canvas.elt.addEventListener("touchend", (e) => e.preventDefault(), opt);
  canvas.elt.addEventListener("touchcancel", (e) => e.preventDefault(), opt);
  pixelDensity(1); // iOS에서 렉 줄이기
  frameRate(60);
  const { Engine } = Matter;
  engine = Engine.create();
  world = engine.world;
  world.gravity.x = 0;
  world.gravity.y = 1;

  if (BOUNDS.enabled) makeWorldBounds();

  gSkin = createGraphics(width, height);
  gStitch = createGraphics(width, height);
  gSkin.pixelDensity(Math.min(2, pixelDensity()));
  gStitch.pixelDensity(Math.min(2, pixelDensity()));
  rebuildSkin();

  lastDrag = { x: 0, y: 0, t: performance.now() };
}
function draw() {
  background(255);
  bgPan += BG.panSpeed;
  drawBackgroundCollage(baseImgs, bgPan, BG.mode, BG.alpha);

  Matter.Engine.update(engine, 1000 / 60);

  cullOffscreenPieces();

  image(gSkin, 0, 0);
  if (STITCH.enabled) {
    push();
    blendMode(SCREEN);
    image(gStitch, 0, 0);
    pop();
  }

  noStroke();
  fill(0, 26);
  for (const p of pieces) {
    push();
    translate(p.body.position.x, p.body.position.y);
    rotate(p.body.angle);
    beginShape();
    for (const v of p.poly) vertex(v.x - p.cx, v.y - p.cy);
    endShape(CLOSE);
    pop();
  }
}

function rebuildSkin() {
  gSkin.clear();
  if (skinImgs.length) drawImageFit(gSkin, skinImgs[0], BG.mode, 255);
  else {
    gSkin.background(235);
    gSkin.noStroke();
    gSkin.fill(0, 22);
    const N = Math.floor(width * height * 0.00003);
    for (let i = 0; i < N; i++)
      gSkin.rect(Math.random() * width, Math.random() * height, 1, 1);
  }
  gStitch.clear();
}

function irregularOrientedPoly(cx, cy, ang, rx, ry, n = 12, jitter = 0.3) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TWO_PI + random(-0.04, 0.04);
    let x = Math.cos(t) * rx,
      y = Math.sin(t) * ry;
    const jr = 1 + random(-jitter, jitter) * 0.6;
    x *= jr;
    y *= jr;
    const ca = Math.cos(ang),
      sa = Math.sin(ang);
    pts.push({ x: cx + x * ca - y * sa, y: cy + x * sa + y * ca });
  }
  return pts;
}
function erasePolygonOnSkin(poly) {
  gSkin.push();
  gSkin.erase();
  gSkin.beginShape();
  for (const v of poly) gSkin.vertex(v.x, v.y);
  gSkin.endShape(CLOSE);
  gSkin.noErase();
  gSkin.pop();
}
function stitchOnBoundary(poly) {
  gStitch.push();
  gStitch.stroke(255, STITCH.alpha);
  gStitch.strokeWeight(1.2);
  gStitch.noFill();
  const step = STITCH.step,
    L = STITCH.len;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    const ux = dx / len,
      uy = dy / len,
      nx = -uy,
      ny = ux;
    for (let s = step / 2; s < len; s += step) {
      const px = a.x + ux * s,
        py = a.y + uy * s;
      const jx = nx * random(-1.5, 1.5),
        jy = ny * random(-1.5, 1.5);
      gStitch.line(px - L + jx, py - L + jy, px + L + jx, py + L + jy);
      gStitch.line(px - L + jx, py + L + jy, px + L + jx, py - L + jy);
    }
  }
  gStitch.pop();
}
function spawnPiece(poly, vx = 0, vy = 0) {
  const { Bodies, Body, Composite } = Matter;
  let cx = 0,
    cy = 0;
  for (const p of poly) {
    cx += p.x;
    cy += p.y;
  }
  cx /= poly.length;
  cy /= poly.length;
  const vertsLocal = poly.map((v) => ({ x: v.x - cx, y: v.y - cy }));
  let body;
  if (Bodies.fromVertices) {
    try {
      body = Bodies.fromVertices(
        cx,
        cy,
        [vertsLocal],
        {
          restitution: PHY.restitution,
          friction: PHY.friction,
          frictionAir: PHY.air,
        },
        true
      );
    } catch (e) {
      body = Bodies.circle(cx, cy, TEAR.radius * 0.7, {
        restitution: PHY.restitution,
        friction: PHY.friction,
        frictionAir: PHY.air,
      });
    }
  } else {
    body = Bodies.circle(cx, cy, TEAR.radius * 0.7, {
      restitution: PHY.restitution,
      friction: PHY.friction,
      frictionAir: PHY.air,
    });
  }
  Composite.add(world, body);

  const mass = body.mass || 1;
  const fx =
    vx * THROW.velScale * mass + (poly[0].x - cx) * THROW.radial * 0.001;
  const fy =
    vy * THROW.velScale * mass + (poly[0].y - cy) * THROW.radial * 0.001;
  Body.applyForce(body, { x: cx, y: cy }, { x: fx, y: fy });
  Body.setAngularVelocity(
    body,
    (body.angularVelocity || 0) + (Math.random() * 2 - 1) * THROW.spin
  );

  pieces.push({ body, poly, cx, cy });

  if (pieces.length > CONTROL.maxPieces) {
    const removeN = pieces.length - CONTROL.maxPieces;
    const { Composite } = Matter;
    for (let i = 0; i < removeN; i++) {
      const old = pieces.shift();
      Composite.remove(world, old.body);
    }
  }
}
function tearAt(x, y, vx, vy) {
  const speed = Math.hypot(vx, vy);
  const ang = speed > 0.001 ? Math.atan2(vy, vx) : lastAngle;
  lastAngle = ang;
  const rx = TEAR.radius * TEAR.aspect,
    ry = TEAR.radius;
  const poly = irregularOrientedPoly(
    x,
    y,
    ang,
    rx,
    ry,
    TEAR.verts,
    TEAR.jitter
  );
  erasePolygonOnSkin(poly);
  stitchOnBoundary(poly);
  spawnPiece(poly, vx, vy);
}

function makeWorldBounds() {
  const t = 60,
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

function cullOffscreenPieces() {
  const m = CULL.margin;
  const { Composite } = Matter;
  for (let i = pieces.length - 1; i >= 0; i--) {
    const b = pieces[i].body,
      x = b.position.x,
      y = b.position.y;
    if (x < -m || x > width + m || y < -m || y > height + m) {
      Composite.remove(world, b);
      pieces.splice(i, 1);
    }
  }
}

function touchStarted() {
  const now = performance.now();
  if (touches.length === 1) {
    const dx = touches[0].x - lastTapPos.x,
      dy = touches[0].y - lastTapPos.y;
    if (now - lastTapAt < DOUBLE_TAP_MS && Math.hypot(dx, dy) < DOUBLE_TAP_PX) {
      resetAll();
      lastTapAt = 0;
    } else {
      lastTapAt = now;
      lastTapPos = { x: touches[0].x, y: touches[0].y };
    }
  }
  lastEmitT = 0;
  lastEmitPos = { x: touches[0].x, y: touches[0].y };
  lastDrag = { x: touches[0].x, y: touches[0].y, t: now };
  tearAt(touches[0].x, touches[0].y, 0, 0);
  return false;
}
function touchMoved() {
  if (!touches.length) return false;
  const now = performance.now();
  const t = touches[0];
  const dt = Math.max(1, now - lastDrag.t);
  const vx = (t.x - lastDrag.x) / dt,
    vy = (t.y - lastDrag.y) / dt;

  const moved = dist(t.x, t.y, lastEmitPos.x, lastEmitPos.y);
  if (now - lastEmitT >= TEAR.emitMs && moved >= TEAR.minMove) {
    tearAt(t.x, t.y, vx, vy);
    lastEmitT = now;
    lastEmitPos = { x: t.x, y: t.y };
  }
  lastDrag = { x: t.x, y: t.y, t: now };
  return false;
}
function touchEnded() {
  return false;
}

function resetAll() {
  const { Composite } = Matter;
  for (const p of pieces) Composite.remove(world, p.body);
  pieces.length = 0;
  rebuildSkin();
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (BOUNDS.enabled) {
    clearWorldBounds();
    makeWorldBounds();
  }
  gSkin = createGraphics(width, height);
  gStitch = createGraphics(width, height);
  gSkin.pixelDensity(Math.min(2, pixelDensity()));
  gStitch.pixelDensity(Math.min(2, pixelDensity()));
  rebuildSkin();
}

function radians(d) {
  return (d * Math.PI) / 180;
}
