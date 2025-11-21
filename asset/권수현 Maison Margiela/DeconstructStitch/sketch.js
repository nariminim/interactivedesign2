const ASSET_BASE = "./assets/";
const BG_FILES = ["look2.jpg"];

const BG = { mode: "cover", alpha: 220, panSpeed: 0.02 };

const GRID = { cols: 2, rows: 4 };
const CFG = {
  sheetPadding: 40,

  tileGap: 0,
  tileCorner: 12,

  subGap: 10,
  subCorner: 10,

  stitchLen: 18,
  stitchWeight: 2.2,
  stitchUnder: 5.0,
  stitchStep: 36,

  seamK: 0.25,
  seamDamp: 0.22,

  dragFric: 0.98,
};

const PINCH = {
  detachRatio: 0.22,
  attachRatio: 0.12,
  subSplitRatio: 0.34,
  subMergeRatio: 0.26,
};
const pinchDetachDist = () => Math.min(width, height) * PINCH.detachRatio;
const pinchAttachDist = () => Math.min(width, height) * PINCH.attachRatio;
const pinchSubSplitDist = () => Math.min(width, height) * PINCH.subSplitRatio;
const pinchSubMergeDist = () => Math.min(width, height) * PINCH.subMergeRatio;

const RENDER = { invertInside: true };

let canvas, gInv;
let bgImgs = [],
  _bgLoaded = 0,
  bgPan = 0;

let engine, world;

let UNIFIED = true;

let sheetBounds = { left: 0, top: 0, right: 0, bottom: 0 };

let tiles = [];
let seams = [];
let neighborIndex = {};

let dragIndex = -1;
let dragPrev = null;

let pinchIndex = -1;
let lastTapAt = 0;
let lastTapPos = { x: 0, y: 0 };
const DOUBLE_TAP_MS = 260,
  DOUBLE_TAP_PX = 28;

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
  pixelDensity(1); // iOS에서 렉 줄이기
  frameRate(60);
  gInv = createGraphics(windowWidth, windowHeight);
  gInv.pixelDensity(Math.min(2, pixelDensity()));

  const { Engine } = Matter;
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;

  layoutUnifiedSheet();
}
function layoutUnifiedSheet() {
  const pad = CFG.sheetPadding;
  sheetBounds.left = pad;
  sheetBounds.right = width - pad;

  const usableW = sheetBounds.right - sheetBounds.left;
  const tileAR = 4 / 3;
  const tileW1 = usableW / GRID.cols;
  const tileH1 = tileW1 / tileAR;
  const totalH = tileH1 * GRID.rows;
  const vPad = Math.max(pad, (height - totalH) / 2);

  sheetBounds.top = vPad;
  sheetBounds.bottom = vPad + totalH;

  UNIFIED = true;
  clearSplitWorld();
}
function draw() {
  background(255);

  bgPan += BG.panSpeed;
  drawBackgroundCollage(bgImgs, bgPan, BG.mode, BG.alpha);

  Matter.Engine.update(engine, 1000 / 60);

  gInv.clear();
  gInv.noStroke();
  if (RENDER.invertInside) {
    gInv.fill(255);
    if (UNIFIED) {
      gInv.push();
      gInv.rectMode(CORNERS);
      gInv.rect(
        sheetBounds.left,
        sheetBounds.top,
        sheetBounds.right,
        sheetBounds.bottom,
        CFG.tileCorner
      );
      gInv.pop();
    } else {
      for (const t of tiles) {
        if (t.mode === "subdivided") {
          const tileW2 = t.w / 2,
            tileH2 = t.h / 2;
          for (const b of t.children) {
            gInv.push();
            gInv.translate(b.position.x, b.position.y);
            gInv.rotate(b.angle);
            gInv.rectMode(CENTER);
            gInv.rect(
              0,
              0,
              tileW2 - CFG.subGap,
              tileH2 - CFG.subGap,
              CFG.subCorner
            );
            gInv.pop();
          }
        } else {
          const b = t.body;
          gInv.push();
          gInv.translate(b.position.x, b.position.y);
          gInv.rotate(b.angle);
          gInv.rectMode(CENTER);
          gInv.rect(0, 0, t.w, t.h, CFG.tileCorner);
          gInv.pop();
        }
      }
    }
  }
  blendMode(DIFFERENCE);
  image(gInv, 0, 0);
  blendMode(BLEND);

  stroke(0, 255);
  strokeWeight(2);
  fill(0, 20);
  if (UNIFIED) {
    push();
    rectMode(CORNERS);
    rect(
      sheetBounds.left,
      sheetBounds.top,
      sheetBounds.right,
      sheetBounds.bottom,
      CFG.tileCorner
    );
    pop();
  } else {
    for (const t of tiles) {
      if (t.mode === "subdivided") {
        const tileW2 = t.w / 2,
          tileH2 = t.h / 2;
        for (const b of t.children) {
          push();
          translate(b.position.x, b.position.y);
          rotate(b.angle);
          rectMode(CENTER);
          rect(0, 0, tileW2 - CFG.subGap, tileH2 - CFG.subGap, CFG.subCorner);
          pop();
        }
      } else {
        const b = t.body;
        push();
        translate(b.position.x, b.position.y);
        rotate(b.angle);
        rectMode(CENTER);
        rect(0, 0, t.w, t.h, CFG.tileCorner);
        pop();
      }
    }
    drawTileSeamStitches();
    for (const t of tiles) {
      if (t.mode === "subdivided") drawSubtileStitches(t);
    }
  }
}

function buildTilesFromUnified() {
  if (!UNIFIED) return;
  UNIFIED = false;
  tiles.length = 0;
  seams.length = 0;
  neighborIndex = {};

  const { Bodies, Composite } = Matter;
  const cols = GRID.cols,
    rows = GRID.rows;
  const totalW = sheetBounds.right - sheetBounds.left;
  const totalH = sheetBounds.bottom - sheetBounds.top;
  const w = totalW / cols;
  const h = totalH / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = sheetBounds.left + w * (c + 0.5);
      const cy = sheetBounds.top + h * (r + 0.5);
      const body = Bodies.rectangle(cx, cy, w - CFG.tileGap, h - CFG.tileGap, {
        restitution: 0.05,
        frictionAir: 0.06,
      });
      Composite.add(world, body);
      tiles.push({
        body,
        col: c,
        row: r,
        w: w - CFG.tileGap,
        h: h - CFG.tileGap,
        attached: true,
        mode: "attached",
        children: [],
        innerSeams: [],
      });
    }
  }
  makeAllNeighborSeams();
}
function clearSplitWorld() {
  const { Composite } = Matter;
  for (const s of seams) Composite.remove(world, s);
  seams.length = 0;
  neighborIndex = {};
  for (const t of tiles) {
    if (t.body) Composite.remove(world, t.body);
    for (const s of t.innerSeams) Composite.remove(world, s);
    for (const b of t.children) Composite.remove(world, b);
  }
  tiles.length = 0;
}
function idx(col, row) {
  return row * GRID.cols + col;
}

function makeAllNeighborSeams() {
  const { Constraint, Composite } = Matter;
  const cols = GRID.cols,
    rows = GRID.rows;

  const addSeam = (aIdx, bIdx, type) => {
    const key = [Math.min(aIdx, bIdx), Math.max(aIdx, bIdx), type].join("-");
    if (neighborIndex[key]) return;
    neighborIndex[key] = true;

    const A = tiles[aIdx],
      B = tiles[bIdx];
    if (!A || !B || !A.attached || !B.attached) return;

    const ax = type === "H" ? A.w / 2 : 0;
    const ay = type === "H" ? 0 : A.h / 2;
    const bx = type === "H" ? -B.w / 2 : 0;
    const by = type === "H" ? 0 : -B.h / 2;

    const seam = Constraint.create({
      bodyA: A.body,
      pointA: { x: ax, y: ay },
      bodyB: B.body,
      pointB: { x: bx, y: by },
      length: 0,
      stiffness: CFG.seamK,
      damping: CFG.seamDamp,
    });
    seams.push(seam);
    Composite.add(world, seam);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = idx(c, r);
      if (c + 1 < cols) addSeam(a, idx(c + 1, r), "H");
      if (r + 1 < rows) addSeam(a, idx(c, r + 1), "V");
    }
  }
}

function detachTile(i) {
  const { Composite } = Matter;
  const tBody = tiles[i].body;
  for (let si = seams.length - 1; si >= 0; si--) {
    const s = seams[si];
    if (s.bodyA === tBody || s.bodyB === tBody) {
      Composite.remove(world, s);
      seams.splice(si, 1);
    }
  }
  tiles[i].attached = false;
  tiles[i].mode = "detached";
}
function attachTile(i) {
  const { Constraint, Composite } = Matter;
  if (tiles[i].attached) return;
  if (tiles[i].mode === "subdivided") mergeSubdividedToDetached(i);

  const c = tiles[i].col,
    r = tiles[i].row;
  const neighbors = [];
  if (c - 1 >= 0) neighbors.push([idx(c - 1, r), "H"]);
  if (c + 1 < GRID.cols) neighbors.push([idx(c + 1, r), "H"]);
  if (r - 1 >= 0) neighbors.push([idx(c, r - 1), "V"]);
  if (r + 1 < GRID.rows) neighbors.push([idx(c, r + 1), "V"]);

  for (const [j, type] of neighbors) {
    if (!tiles[j] || !tiles[j].attached) continue;

    const A = tiles[i],
      B = tiles[j];
    const ax = type === "H" ? A.w / 2 : 0;
    const ay = type === "H" ? 0 : A.h / 2;
    const bx = type === "H" ? -B.w / 2 : 0;
    const by = type === "H" ? 0 : -B.h / 2;

    const seam = Constraint.create({
      bodyA: A.body,
      pointA: { x: ax, y: ay },
      bodyB: B.body,
      pointB: { x: bx, y: by },
      length: 0,
      stiffness: CFG.seamK,
      damping: CFG.seamDamp,
    });
    seams.push(seam);
    Composite.add(world, seam);
  }
  tiles[i].attached = true;
  tiles[i].mode = "attached";
}

function subdivideTile(i) {
  const t = tiles[i];
  if (!t || t.mode !== "detached") return;

  const { Composite, Bodies, Constraint } = Matter;

  const cx = t.body.position.x;
  const cy = t.body.position.y;

  Composite.remove(world, t.body);
  t.body = null;

  const tileW2 = t.w / 2;
  const tileH2 = t.h / 2;

  const gap = CFG.subGap / 2;
  const pos = [
    { x: cx - tileW2 / 2 - gap, y: cy - tileH2 / 2 - gap },
    { x: cx + tileW2 / 2 + gap, y: cy - tileH2 / 2 - gap },
    { x: cx - tileW2 / 2 - gap, y: cy + tileH2 / 2 + gap },
    { x: cx + tileW2 / 2 + gap, y: cy + tileH2 / 2 + gap },
  ];

  t.children = [];
  for (const p of pos) {
    const b = Bodies.rectangle(
      p.x,
      p.y,
      tileW2 - CFG.subGap,
      tileH2 - CFG.subGap,
      { restitution: 0.05, frictionAir: 0.06 }
    );
    Composite.add(world, b);
    t.children.push(b);
  }

  t.innerSeams = [];
  const w2 = (tileW2 - CFG.subGap) / 2;
  const h2 = (tileH2 - CFG.subGap) / 2;
  const opts = { stiffness: 0.28, damping: 0.22 };

  t.innerSeams.push(
    Constraint.create({
      bodyA: t.children[0],
      pointA: { x: w2, y: 0 },
      bodyB: t.children[1],
      pointB: { x: -w2, y: 0 },
      length: 0,
      ...opts,
    })
  );
  t.innerSeams.push(
    Constraint.create({
      bodyA: t.children[2],
      pointA: { x: w2, y: 0 },
      bodyB: t.children[3],
      pointB: { x: -w2, y: 0 },
      length: 0,
      ...opts,
    })
  );
  t.innerSeams.push(
    Constraint.create({
      bodyA: t.children[0],
      pointA: { x: 0, y: h2 },
      bodyB: t.children[2],
      pointB: { x: 0, y: -h2 },
      length: 0,
      ...opts,
    })
  );
  t.innerSeams.push(
    Constraint.create({
      bodyA: t.children[1],
      pointA: { x: 0, y: h2 },
      bodyB: t.children[3],
      pointB: { x: 0, y: -h2 },
      length: 0,
      ...opts,
    })
  );

  t.mode = "subdivided";
}

function mergeSubdividedToDetached(i) {
  const t = tiles[i];
  if (!t || t.mode !== "subdivided") return;
  const { Composite, Bodies } = Matter;

  let sx = 0,
    sy = 0;
  for (const b of t.children) {
    sx += b.position.x;
    sy += b.position.y;
  }
  const cx = sx / t.children.length;
  const cy = sy / t.children.length;

  for (const s of t.innerSeams) Composite.remove(world, s);
  t.innerSeams = [];
  for (const b of t.children) Composite.remove(world, b);
  t.children = [];

  t.body = Bodies.rectangle(cx, cy, t.w, t.h, {
    restitution: 0.05,
    frictionAir: 0.06,
  });
  Composite.add(world, t.body);
  t.mode = "detached";
}

function drawTileSeamStitches() {
  const cols = GRID.cols,
    rows = GRID.rows;

  const boundsFor = (t) => {
    if (t.mode === "subdivided") {
      let L = Infinity,
        R = -Infinity,
        T = Infinity,
        B = -Infinity;
      for (const b of t.children) {
        L = Math.min(L, b.bounds.min.x);
        R = Math.max(R, b.bounds.max.x);
        T = Math.min(T, b.bounds.min.y);
        B = Math.max(B, b.bounds.max.y);
      }
      return { left: L, right: R, top: T, bottom: B };
    } else {
      const b = t.body.bounds;
      return { left: b.min.x, right: b.max.x, top: b.min.y, bottom: b.max.y };
    }
  };

  const drawBetween = (A, B, type) => {
    if (!A || !B) return;
    const aB = boundsFor(A),
      bB = boundsFor(B);
    let x1, y1, x2, y2;
    if (type === "H") {
      x1 = aB.right;
      y1 = (aB.top + aB.bottom) / 2;
      x2 = bB.left;
      y2 = (bB.top + bB.bottom) / 2;
    } else {
      x1 = (aB.left + aB.right) / 2;
      y1 = aB.bottom;
      x2 = (bB.left + bB.right) / 2;
      y2 = bB.top;
    }
    stroke(255);
    strokeWeight(CFG.stitchUnder);
    stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep, Math.PI / 4, true);
    stroke(0);
    strokeWeight(CFG.stitchWeight);
    stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep, Math.PI / 4, true);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const A = tiles[idx(c, r)];
      if (c + 1 < cols) drawBetween(A, tiles[idx(c + 1, r)], "H");
      if (r + 1 < rows) drawBetween(A, tiles[idx(c, r + 1)], "V");
    }
  }
}
function drawSubtileStitches(t) {
  if (!t.children || t.children.length !== 4) return;
  const tileW2 = t.w / 2,
    tileH2 = t.h / 2;

  const P = t.children;
  let x1 = P[0].position.x + (tileW2 - CFG.subGap) / 2;
  let y1 = P[0].position.y;
  let x2 = P[1].position.x - (tileW2 - CFG.subGap) / 2;
  let y2 = P[1].position.y;
  stroke(255);
  strokeWeight(CFG.stitchUnder);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);
  stroke(0);
  strokeWeight(CFG.stitchWeight);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);

  x1 = P[2].position.x + (tileW2 - CFG.subGap) / 2;
  y1 = P[2].position.y;
  x2 = P[3].position.x - (tileW2 - CFG.subGap) / 2;
  y2 = P[3].position.y;
  stroke(255);
  strokeWeight(CFG.stitchUnder);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);
  stroke(0);
  strokeWeight(CFG.stitchWeight);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);

  x1 = P[0].position.x;
  y1 = P[0].position.y + (tileH2 - CFG.subGap) / 2;
  x2 = P[2].position.x;
  y2 = P[2].position.y - (tileH2 - CFG.subGap) / 2;
  stroke(255);
  strokeWeight(CFG.stitchUnder);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);
  stroke(0);
  strokeWeight(CFG.stitchWeight);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);

  x1 = P[1].position.x;
  y1 = P[1].position.y + (tileH2 - CFG.subGap) / 2;
  x2 = P[3].position.x;
  y2 = P[3].position.y - (tileH2 - CFG.subGap) / 2;
  stroke(255);
  strokeWeight(CFG.stitchUnder);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);
  stroke(0);
  strokeWeight(CFG.stitchWeight);
  stitchLineDiagonal(x1, y1, x2, y2, CFG.stitchStep * 0.8, Math.PI / 4, true);
}
function stitchLineDiagonal(
  x1,
  y1,
  x2,
  y2,
  step,
  thetaRad = Math.PI / 4,
  alternate = true
) {
  const len = dist(x1, y1, x2, y2);
  if (len <= 0.0001) return;
  const n = Math.max(1, Math.floor(len / step));
  const tx = (x2 - x1) / len,
    ty = (y2 - y1) / len;
  const nx = -ty,
    ny = tx;
  const half = CFG.stitchLen / 2;
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    const cx = lerp(x1, x2, t),
      cy = lerp(y1, y2, t);
    const sign = alternate && i % 2 === 1 ? -1 : 1;
    const a = thetaRad * sign;
    const dx = tx * Math.cos(a) + nx * Math.sin(a);
    const dy = ty * Math.cos(a) + ny * Math.sin(a);
    line(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  }
}

function touchStarted() {
  const now = performance.now();

  if (touches.length === 1) {
    const dx = touches[0].x - lastTapPos.x;
    const dy = touches[0].y - lastTapPos.y;
    if (now - lastTapAt < DOUBLE_TAP_MS && Math.hypot(dx, dy) < DOUBLE_TAP_PX) {
      layoutUnifiedSheet();
      lastTapAt = 0;
    } else {
      lastTapAt = now;
      lastTapPos = { x: touches[0].x, y: touches[0].y };
    }

    if (UNIFIED) {
      dragIndex = -2;
      dragPrev = { x: touches[0].x, y: touches[0].y };
    } else {
      dragIndex = nearestTileIndex(touches[0].x, touches[0].y);
      dragPrev = { x: touches[0].x, y: touches[0].y };
    }

    pinchIndex = -1;
  } else if (touches.length >= 2) {
    if (UNIFIED) buildTilesFromUnified();
    const c = centroid(touches[0], touches[1]);
    pinchIndex = nearestTileIndex(c.x, c.y);
    dragIndex = -1;
  }
  return false;
}
function touchMoved() {
  if (touches.length === 1 && dragPrev) {
    const now = { x: touches[0].x, y: touches[0].y };
    const dx = now.x - dragPrev.x,
      dy = now.y - dragPrev.y;

    if (dragIndex === -2) {
      sheetBounds.left += dx;
      sheetBounds.right += dx;
      sheetBounds.top += dy;
      sheetBounds.bottom += dy;
    } else if (dragIndex >= 0 && !UNIFIED) {
      const t = tiles[dragIndex];
      if (t.mode === "subdivided") {
        for (const b of t.children) Matter.Body.translate(b, { x: dx, y: dy });
      } else {
        Matter.Body.translate(t.body, { x: dx, y: dy });
      }
    }
    dragPrev = now;
  }

  if (touches.length >= 2 && pinchIndex >= 0 && !UNIFIED) {
    const d = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
    const t = tiles[pinchIndex];
    if (t) {
      if (t.attached && d >= pinchDetachDist()) {
        detachTile(pinchIndex);
      } else if (
        !t.attached &&
        t.mode !== "subdivided" &&
        d <= pinchAttachDist()
      ) {
        attachTile(pinchIndex);
      }

      if (t.mode === "detached" && d >= pinchSubSplitDist()) {
        subdivideTile(pinchIndex);
      } else if (t.mode === "subdivided" && d <= pinchSubMergeDist()) {
        mergeSubdividedToDetached(pinchIndex);
      }
    }
    return false;
  }

  return false;
}
function touchEnded() {
  if (touches.length === 0) {
    dragIndex = -1;
    dragPrev = null;
  }
  if (touches.length < 2) {
    pinchIndex = -1;
  }
  return false;
}

function nearestTileIndex(x, y) {
  if (!tiles.length) return -1;
  let best = -1,
    bestD = Infinity;
  for (let i = 0; i < tiles.length; i++) {
    let px, py;
    if (tiles[i].mode === "subdivided") {
      let sx = 0,
        sy = 0;
      for (const b of tiles[i].children) {
        sx += b.position.x;
        sy += b.position.y;
      }
      px = sx / tiles[i].children.length;
      py = sy / tiles[i].children.length;
    } else {
      const b = tiles[i].body.position;
      px = b.x;
      py = b.y;
    }
    const d = dist(x, y, px, py);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
function centerOfTile(t) {
  if (t.mode === "subdivided" && t.children.length) {
    let sx = 0,
      sy = 0;
    for (const b of t.children) {
      sx += b.position.x;
      sy += b.position.y;
    }
    return { x: sx / t.children.length, y: sy / t.children.length };
  }
  return t.body
    ? { x: t.body.position.x, y: t.body.position.y }
    : { x: 0, y: 0 };
}
function centroid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (gInv) gInv.resizeCanvas(windowWidth, windowHeight);
  layoutUnifiedSheet();
}

function makeWorldBounds() {
  const t = 60,
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

function map(v, a, b, c, d, clamp = false) {
  let t = c + ((v - a) * (d - c)) / (b - a);
  if (clamp)
    t = d > c ? Math.min(Math.max(t, c), d) : Math.min(Math.max(t, d), c);
  return t;
}
