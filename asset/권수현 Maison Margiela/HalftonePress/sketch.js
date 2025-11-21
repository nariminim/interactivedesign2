const ASSET_BASE = "./assets/";
const BG_FILES = ["look3.jpg"];

const BG = { mode: "cover", alpha: 220, panSpeed: 0.012 };

/* ---------- 잉크/합성 ---------- */
const INK = {
  mode: "overlay", // "normal" | "multiply" | "overlay" | "hard-light" | "difference"
  withStroke: true,
  strokeAlpha: 42, // 점 외곽선 투명도
  washEnabled: true,
  washAlpha: 14,
  washFeather: 0.55,
};

const INVERT = { enabled: true, alpha: 255 };

const BRUSH = {
  radius: 80,
  minDot: 2.0,
  maxDot: 8.0,
  minStep: 8.0,
  maxStep: 26.0,
  alpha: 26,
  flowHz: 1000 / 20,
  screenAngleDeg: 22.5,
  hexPacking: false,
};

const SPEED = {
  vMin: 0.05,
  vMax: 1.2,
};

const SHOW_HUD = false;

let canvas;
let bgImgs = [],
  _bgLoaded = 0,
  bgPan = 0;

let gPrint, gInv;
let lastStampT = 0;
let lastPos = { x: 0, y: 0, t: 0 };

let lastTapAt = 0,
  lastTapPos = { x: 0, y: 0 };
const DBL_MS = 260,
  DBL_PX = 28;

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
    _p5.push();
    const off = (i % 2 === 0 ? pan : -pan) * 0.25;
    _p5.translate(off, off * 0.6);
    drawImageFit(_p5, imgs[i], mode, alpha255);
    _p5.pop();
  }
}

function preload() {
  for (const fn of BG_FILES) {
    const url = ASSET_BASE + fn;
    bgImgs.push(
      loadImage(
        url,
        () => _bgLoaded++,
        () => console.warn("BG not found:", url)
      )
    );
  }
}
function setup() {
  _p5 = this;
  canvas = createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, pixelDensity()));
  frameRate(60);
  const opt = { passive: false };
  canvas.elt.style.touchAction = "none";
  canvas.elt.addEventListener(
    "touchmove",
    (e) => {
      const r = canvas.elt.getBoundingClientRect();
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (
          t.clientX >= r.left &&
          t.clientX <= r.right &&
          t.clientY >= r.top &&
          t.clientY <= r.bottom
        ) {
          e.preventDefault();
          return;
        }
      }
    },
    opt
  );

  noStroke();
  gPrint = createGraphics(width, height);
  gInv = createGraphics(width, height);
  gPrint.pixelDensity(Math.min(2, pixelDensity()));
  gInv.pixelDensity(Math.min(2, pixelDensity()));
  clearBuffers();

  lastPos = { x: width * 0.5, y: height * 0.5, t: performance.now() };
}
function draw() {
  background(255);

  bgPan += BG.panSpeed;
  drawBackgroundCollage(bgImgs, bgPan, BG.mode, BG.alpha);

  if (INVERT.enabled) {
    push();
    blendMode(DIFFERENCE);
    tint(255, INVERT.alpha);
    image(gInv, 0, 0);
    pop();
  }

  push();
  switch (INK.mode) {
    case "multiply":
      blendMode(MULTIPLY);
      break;
    case "overlay":
      blendMode(OVERLAY);
      break;
    case "hard-light":
      blendMode(HARD_LIGHT);
      break;
    case "difference":
      blendMode(DIFFERENCE);
      break;
    default:
      break;
  }
  image(gPrint, 0, 0);
  pop();

  if (SHOW_HUD) {
    push();
    noStroke();
    fill(0, 120);
    rect(8, 8, 210, 44, 6);
    fill(255);
    textSize(12);
    text(`touches: ${touches.length}`, 16, 24);
    text(
      `invert: ${INVERT.enabled ? "on" : "off"} | mode: ${INK.mode}`,
      16,
      40
    );
    pop();
  }
}

function stampHalftone(x, y, v) {
  const sp = constrain(v, SPEED.vMin, SPEED.vMax);
  const t = (sp - SPEED.vMin) / (SPEED.vMax - SPEED.vMin + 1e-6);

  const R = lerp(BRUSH.radius * 0.6, BRUSH.radius * 1.2, t);
  const step = lerp(BRUSH.maxStep, BRUSH.minStep, t);
  const rDot = lerp(BRUSH.minDot, BRUSH.maxDot, t);
  const angle = (BRUSH.screenAngleDeg * Math.PI) / 180;

  const ca = Math.cos(angle),
    sa = Math.sin(angle);
  const toLocal = (gx, gy) => {
    const dx = gx - x,
      dy = gy - y;
    return { u: dx * ca + dy * sa, v: -dx * sa + dy * ca };
  };
  const toGlobal = (u, v) => {
    return { gx: x + (u * ca - v * sa), gy: y + (u * sa + v * ca) };
  };

  const Umin = -R,
    Umax = R;
  const Vmin = -R,
    Vmax = R;

  if (INVERT.enabled) {
    gInv.push();
    gInv.noStroke();
    gInv.fill(255);
  }

  if (INK.washEnabled) {
    gPrint.push();
    gPrint.noStroke();
    gPrint.fill(255, INK.washAlpha);
    const washR = R * (1 + INK.washFeather);
    gPrint.ellipse(x, y, washR * 2, washR * 2);
    gPrint.pop();
  }

  gPrint.push();
  if (INK.withStroke) {
    gPrint.stroke(0, INK.strokeAlpha);
    gPrint.strokeWeight(1);
  } else {
    gPrint.noStroke();
  }
  gPrint.fill(0, BRUSH.alpha);

  const rowStep = step * (BRUSH.hexPacking ? Math.sqrt(3) / 2 : 1); // 벌집이면 세로 간격 줄임
  for (
    let vv = Math.floor(Vmin / rowStep) * rowStep;
    vv <= Vmax;
    vv += rowStep
  ) {
    const odd = Math.round(vv / rowStep) % 2 !== 0;
    const uStart = odd && BRUSH.hexPacking ? step * 0.5 : 0;

    for (
      let uu = Math.floor((Umin - uStart) / step) * step + uStart;
      uu <= Umax;
      uu += step
    ) {
      if (uu * uu + vv * vv > R * R) continue;

      const { gx, gy } = toGlobal(uu, vv);

      const jx = (Math.random() * 2 - 1) * step * 0.18;
      const jy = (Math.random() * 2 - 1) * step * 0.18;

      const cx = gx + jx,
        cy = gy + jy;

      const dNorm = Math.min(1, Math.hypot(uu, vv) / R);
      const dotR = rDot * (1.05 - 0.35 * dNorm);

      if (INVERT.enabled) gInv.ellipse(cx, cy, dotR * 2, dotR * 2);
      gPrint.ellipse(cx, cy, dotR * 2, dotR * 2);
    }
  }

  if (INVERT.enabled) gInv.pop();
  gPrint.pop();
}

function touchStarted() {
  const now = performance.now();

  if (touches.length === 1) {
    const dx = touches[0].x - lastTapPos.x;
    const dy = touches[0].y - lastTapPos.y;
    if (now - lastTapAt < DBL_MS && Math.hypot(dx, dy) < DBL_PX) {
      clearBuffers();
      lastTapAt = 0;
    } else {
      lastTapAt = now;
      lastTapPos = { x: touches[0].x, y: touches[0].y };
    }
  }

  lastStampT = 0;
  lastPos = { x: touches[0].x, y: touches[0].y, t: now };
  stampHalftone(touches[0].x, touches[0].y, SPEED.vMin);
  return false;
}
function touchMoved() {
  if (!touches.length) return false;
  const now = performance.now();
  const t = touches[0];

  const dt = Math.max(1, now - lastPos.t);
  const vx = (t.x - lastPos.x) / dt;
  const vy = (t.y - lastPos.y) / dt;
  const v = Math.hypot(vx, vy);

  const moved = dist(t.x, t.y, lastPos.x, lastPos.y);
  if (now - lastStampT >= BRUSH.flowHz && moved >= 2) {
    stampHalftone(t.x, t.y, v);
    lastStampT = now;
  }
  lastPos = { x: t.x, y: t.y, t: now };
  return false;
}
function touchEnded() {
  return false;
}

function mouseDragged() {
  if (touches && touches.length) return;
  const now = performance.now();
  const dt = Math.max(1, now - lastPos.t);
  const vx = (mouseX - lastPos.x) / dt;
  const vy = (mouseY - lastPos.y) / dt;
  const v = Math.hypot(vx, vy);
  if (
    now - lastStampT >= BRUSH.flowHz &&
    dist(mouseX, mouseY, lastPos.x, lastPos.y) >= 2
  ) {
    stampHalftone(mouseX, mouseY, v);
    lastStampT = now;
  }
  lastPos = { x: mouseX, y: mouseY, t: now };
}

function clearBuffers() {
  gPrint.clear();
  gInv.clear();
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  gPrint = createGraphics(width, height);
  gInv = createGraphics(width, height);
  gPrint.pixelDensity(Math.min(2, pixelDensity()));
  gInv.pixelDensity(Math.min(2, pixelDensity()));
  clearBuffers();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
