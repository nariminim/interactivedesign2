const ASSET_BASE = "./assets/";
const BG_FILES = ["look1.jpg"];

const RENDER = {
  invertInsideShape: true,
  outlineWeight: 2,
  outlineAlpha: 20,
  showSprings: true,
};
const CIRCLE_SIZE = { min: 48, max: 120 };

const BG = {
  mode: "cover",
  alpha: 255,
  panSpeed: 0.03,
};

const DRIFT = {
  stampIntervalMs: 16,
  ghostMax: 400,
  misregPx: 3,
  misregDeg: 3,
  fade: 0.003,
  headFill: 20,
};

const SHOW_HUD = false;

let bgImgs = [];
let _bgLoaded = 0;
let bgPan = 0;

let canvas;
let engine, world;
let bodies = [];
let springsById = {};
let lastStampAtById = {};
let ghostStamps = [];
let gInv;

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
        () => console.warn("BG not found:", url)
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
  pixelDensity(1); // iOS에서 렉 줄이기
  frameRate(60);
  gInv = createGraphics(windowWidth, windowHeight);
  gInv.pixelDensity(Math.min(2, pixelDensity()));

  const { Engine } = Matter;
  engine = Engine.create();
  world = engine.world;

  makeWorldBounds();

  bodies.length = 0;
  springsById = {};
  lastStampAtById = {};
  ghostStamps.length = 0;
  bgPan = 0;
}

function draw() {
  background(255);

  bgPan += BG.panSpeed;
  drawBackgroundCollage(bgImgs, bgPan, BG.mode, BG.alpha);

  Matter.Engine.update(engine, 1000 / 60);

  gInv.clear();
  gInv.noStroke();

  if (RENDER.invertInsideShape) {
    for (let i = ghostStamps.length - 1; i >= 0; i--) {
      const g = ghostStamps[i];
      g.life -= DRIFT.fade;
      gInv.fill(255);
      gInv.push();
      gInv.translate(g.x, g.y);
      gInv.rotate(g.angle);
      const d = g.r * 2 * g.life;
      gInv.ellipse(0, 0, d, d);
      gInv.pop();
      if (g.life <= 0) ghostStamps.splice(i, 1);
    }

    gInv.fill(255);
    for (const b of bodies) {
      gInv.push();
      gInv.translate(b.position.x, b.position.y);
      gInv.rotate(b.angle);
      gInv.ellipse(0, 0, b.circleRadius * 2, b.circleRadius * 2);
      gInv.pop();
    }
  }

  if (RENDER.invertInsideShape) {
    blendMode(DIFFERENCE);
    image(gInv, 0, 0);
    blendMode(BLEND);
  }

  stroke(0);
  strokeWeight(RENDER.outlineWeight);
  fill(0, RENDER.outlineAlpha);
  for (const b of bodies) {
    push();
    translate(b.position.x, b.position.y);
    rotate(b.angle);
    ellipse(0, 0, b.circleRadius * 2, b.circleRadius * 2);
    pop();
  }

  if (RENDER.showSprings) {
    stroke(0, 90);
    strokeWeight(1.5);
    noFill();
    for (const key in springsById) {
      const s = springsById[key];
      if (!s || !s.bodyB) continue;
      line(s.pointA.x, s.pointA.y, s.bodyB.position.x, s.bodyB.position.y);
    }
  }

  if (SHOW_HUD) {
    push();
    noStroke();
    fill(0, 120);
    rect(8, 8, 170, 40, 6);
    fill(255);
    textSize(12);
    text(`touches: ${touches.length} | BG: ${BG.mode}`, 16, 30);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (gInv) gInv.resizeCanvas(windowWidth, windowHeight);
  if (!engine || !world) return;
  clearWorldBounds();
  makeWorldBounds();
}

function touchStarted() {
  for (const t of touches) {
    const id = t.id ?? t.identifier ?? 0;
    const p = { x: t.x, y: t.y };

    const size = randInt(CIRCLE_SIZE.min, CIRCLE_SIZE.max);
    const body = Matter.Bodies.circle(p.x, p.y, size / 2, {
      restitution: 0.9,
      frictionAir: 0.01,
    });
    Matter.Composite.add(world, body);
    bodies.push(body);

    const spring = Matter.Constraint.create({
      pointA: { x: p.x, y: p.y },
      bodyB: body,
      stiffness: 0.002,
      damping: 0.12,
    });
    Matter.Composite.add(world, spring);
    springsById[id] = spring;

    lastStampAtById[id] = 0;
  }
  return false;
}

function touchMoved() {
  const now = performance.now();
  for (const t of touches) {
    const id = t.id ?? t.identifier ?? 0;
    const p = { x: t.x, y: t.y };

    const spring = springsById[id];
    if (spring) spring.pointA = { x: p.x, y: p.y };

    if (now - (lastStampAtById[id] || 0) >= DRIFT.stampIntervalMs) {
      const misPx = randRange(-DRIFT.misregPx, DRIFT.misregPx);
      const misDeg = randRange(-DRIFT.misregDeg, DRIFT.misregDeg);
      ghostStamps.push({
        x: p.x + misPx,
        y: p.y + misPx,
        r: 40,
        angle: radians(misDeg),
        life: 1,
      });
      if (ghostStamps.length > DRIFT.ghostMax) {
        ghostStamps.splice(0, ghostStamps.length - DRIFT.ghostMax);
      }
      lastStampAtById[id] = now;
    }
  }
  return false;
}

function touchEnded() {
  const alive = new Set(touches.map((t) => t.id ?? t.identifier ?? 0));
  for (const key in springsById) {
    if (!alive.has(Number(key))) {
      Matter.Composite.remove(world, springsById[key]);
      delete springsById[key];
      delete lastStampAtById[key];
    }
  }
  return false;
}

function makeWorldBounds() {
  const t = 40,
    w = width,
    h = height;
  const opts = { isStatic: true, restitution: 0.6 };
  const walls = [
    Matter.Bodies.rectangle(-t, h / 2, t * 2, h + t * 2, opts),
    Matter.Bodies.rectangle(w + t, h / 2, t * 2, h + t * 2, opts),
    Matter.Bodies.rectangle(w / 2, -t, w + t * 2, t * 2, opts),
    Matter.Bodies.rectangle(w / 2, h + t, w + t * 2, t * 2, opts),
  ];
  Matter.Composite.add(world, walls);
  world._boundsWalls = walls;
}
function clearWorldBounds() {
  if (!world || !world._boundsWalls) return;
  for (const b of world._boundsWalls) Matter.Composite.remove(world, b);
  world._boundsWalls = null;
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function randRange(a, b) {
  return a + Math.random() * (b - a);
}
function radians(deg) {
  return (deg * Math.PI) / 180;
}
