const { Engine, World, Bodies, Composite } = Matter;

let engine, world;

//svg
let vb = { x: 0, y: 0, w: 1, h: 1 };
let svgGeomEls = [];
let polylines = [];
let segments = [];
let hiddenSvg = null;

const FIT_PADDING = 0.98;
const EXTRA_SCALE = 1.3;
const EDGE_THICKNESS = 8;
const SAMPLE_STEP_PX = 8;

const BEAD_R = 15;
let MIN_DIST = BEAD_R * 2;

const SNAP_DIST = 90;
const PICK_DIST = 28;

const SEPARATION_PASSES = 6;
const SEP_EPS = 0.0001;

let beads = [];
let activeBeadIdx = null;
let pointerDown = false;
let activePointerId = null;

let edgeBodies = [];

let audioCtx = null;
let beadSndBuf = null;
let beadGain = null;
let audioReady = false;

async function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    beadGain = audioCtx.createGain();
    beadGain.gain.value = 0.9;
    beadGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (_) {}
  }
  if (!beadSndBuf) {
    const res = await fetch("ball.wav");
    if (!res.ok) throw new Error(`Failed to load ball.wav: ${res.status}`);
    const arr = await res.arrayBuffer();
    beadSndBuf = await audioCtx.decodeAudioData(arr);
  }
  audioReady = true;
}

function playBeadSound() {
  if (!audioReady || !beadSndBuf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = beadSndBuf;
  src.playbackRate.value = 0.96 + Math.random() * 0.08; // ±4%
  src.connect(beadGain);
  src.start();
}

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(2);

  cnv.elt.addEventListener(
    "pointerdown",
    () => {
      initAudio();
    },
    { once: true }
  );

  const el = cnv.elt;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", onPointerDown, { passive: false });
  el.addEventListener("pointermove", onPointerMove, { passive: false });
  el.addEventListener("pointerup", onPointerUp, { passive: false });
  el.addEventListener("pointercancel", onPointerUp, { passive: false });
  el.addEventListener("pointerleave", onPointerUp, { passive: false });

  noFill();
  stroke(0);
  strokeWeight(2);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1.0;

  loadAllSvgGeometries("line.svg")
    .then(() => {
      polylines = sampleAllGeometriesToCanvasPoints(
        svgGeomEls,
        vb,
        SAMPLE_STEP_PX
      );
      buildStaticEdges(polylines, EDGE_THICKNESS);
      buildSegments(polylines);
      Engine.run(engine);
      loop();
    })
    .catch((err) => {
      console.error(err);
      Engine.run(engine);
      loop();
    });

  noLoop();
}

function draw() {
  background("#f2f2ed");

  noFill();
  stroke(0);
  strokeWeight(2);
  for (const pts of polylines) {
    if (pts.length < 2) continue;
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
  }

  noStroke();
  for (const bead of beads) {
    const t = millis() * bead.speed;
    const h = (bead.h + t) % 360;
    const rgb = hslToRgb(h, bead.s, bead.l);
    fill(rgb[0], rgb[1], rgb[2]);
    circle(bead.body.position.x, bead.body.position.y, BEAD_R * 2);
  }
}

function onPointerDown(e) {
  e.preventDefault();
  activePointerId = e.pointerId;
  pointerDown = true;

  const { px, py } = pointerToCanvas(e);

  const pickIdx = findBeadNear(px, py, PICK_DIST);
  if (pickIdx !== null) {
    activeBeadIdx = pickIdx;
    moveActiveBeadToNearest(px, py);
    return;
  }

  const nearest = nearestPointOnPolylines(px, py);
  if (nearest && nearest.dist <= SNAP_DIST) {
    const body = Bodies.circle(nearest.pos.x, nearest.pos.y, BEAD_R, {
      isStatic: true,
      friction: 0,
      restitution: 0,
      render: { visible: false },
    });

    const h = random(0, 360);
    const s = random(65, 90);
    const l = random(45, 65);
    const speed = random(0.00008, 0.0002);
    beads.push({ body, h, s, l, speed });
    World.add(world, body);
    activeBeadIdx = beads.length - 1;

    initAudio().then(() => playBeadSound());

    resolveBeadCollisions(activeBeadIdx);
  } else {
    activeBeadIdx = null;
  }
}

function onPointerMove(e) {
  e.preventDefault();
  if (!pointerDown || e.pointerId !== activePointerId) return;
  if (activeBeadIdx === null) return;

  const { px, py } = pointerToCanvas(e);
  moveActiveBeadToNearest(px, py);

  resolveBeadCollisions(activeBeadIdx);
}

function onPointerUp(e) {
  e.preventDefault();
  if (e.pointerId !== activePointerId) return;
  pointerDown = false;
  activePointerId = null;
  activeBeadIdx = null;
}

function moveActiveBeadToNearest(px, py) {
  if (activeBeadIdx === null) return;
  const nearest = nearestPointOnPolylines(px, py);
  if (!nearest) return;

  const b = beads[activeBeadIdx].body;

  if (nearest.dist > SNAP_DIST) {
    const k = 0.35;
    const nx = lerp(b.position.x, nearest.pos.x, k);
    const ny = lerp(b.position.y, nearest.pos.y, k);
    Matter.Body.setPosition(b, { x: nx, y: ny });
  } else {
    Matter.Body.setPosition(b, nearest.pos);
  }
}

function resolveBeadCollisions(pinnedIdx = null) {
  for (let pass = 0; pass < SEPARATION_PASSES; pass++) {
    for (let i = 0; i < beads.length; i++) {
      for (let j = i + 1; j < beads.length; j++) {
        const bi = beads[i].body,
          bj = beads[j].body;
        let dx = bj.position.x - bi.position.x;
        let dy = bj.position.y - bi.position.y;
        let d2 = dx * dx + dy * dy;

        if (d2 === 0) {
          dx = (Math.random() - 0.5) * 0.001;
          dy = (Math.random() - 0.5) * 0.001;
          d2 = dx * dx + dy * dy;
        }

        const d = Math.sqrt(d2);
        const overlap = MIN_DIST - d;
        if (overlap > 0) {
          const nx = dx / (d + SEP_EPS);
          const ny = dy / (d + SEP_EPS);

          let moveI = overlap * 0.5;
          let moveJ = overlap * 0.5;
          if (pinnedIdx === i) {
            moveI = 0;
            moveJ = overlap;
          }
          if (pinnedIdx === j) {
            moveJ = 0;
            moveI = overlap;
          }

          const newIx = bi.position.x - nx * moveI;
          const newIy = bi.position.y - ny * moveI;
          const newJx = bj.position.x + nx * moveJ;
          const newJy = bj.position.y + ny * moveJ;

          const ni = nearestPointOnPolylines(newIx, newIy);
          const nj = nearestPointOnPolylines(newJx, newJy);
          if (ni) Matter.Body.setPosition(bi, ni.pos);
          if (nj) Matter.Body.setPosition(bj, nj.pos);
        }
      }
    }
  }
}

function buildSegments(polylinesArr) {
  segments = [];
  for (const pts of polylinesArr) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) continue;
      segments.push({ a, b, dx, dy, len2 });
    }
  }
}

function nearestPointOnPolylines(px, py) {
  if (!segments.length) return null;
  let best = null;
  for (const s of segments) {
    const apx = px - s.a.x,
      apy = py - s.a.y;
    let t = (apx * s.dx + apy * s.dy) / s.len2;
    t = Math.max(0, Math.min(1, t));
    const qx = s.a.x + s.dx * t;
    const qy = s.a.y + s.dy * t;
    const d2 = (px - qx) ** 2 + (py - qy) ** 2;
    if (!best || d2 < best.d2) {
      best = { d2, dist: Math.sqrt(d2), pos: { x: qx, y: qy } };
    }
  }
  return best;
}

//svg
async function loadAllSvgGeometries(url) {
  const text = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
    return r.text();
  });
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");

  const svgEl = doc.querySelector("svg");
  if (!svgEl) throw new Error("<svg> not found");

  const vbAttr = svgEl.getAttribute("viewBox");
  if (vbAttr) {
    const v = vbAttr.trim().split(/\s+/).map(Number);
    vb = { x: v[0], y: v[1], w: v[2], h: v[3] };
  } else {
    const w = Number(svgEl.getAttribute("width") || 100);
    const h = Number(svgEl.getAttribute("height") || 100);
    vb = { x: 0, y: 0, w, h };
  }

  hiddenSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  hiddenSvg.setAttribute(
    "style",
    "position:absolute; width:0; height:0; left:-9999px; top:-9999px;"
  );
  hiddenSvg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  document.body.appendChild(hiddenSvg);

  const geoms = doc.querySelectorAll("path, polyline, polygon, line");
  svgGeomEls = [];
  geoms.forEach((g) => {
    const clone = g.cloneNode(true);
    hiddenSvg.appendChild(clone);
    svgGeomEls.push(clone);
  });
}

function sampleAllGeometriesToCanvasPoints(geomEls, viewBox, stepCanvasPx) {
  const polylinesOut = [];

  const s0 = Math.min(
    (width * FIT_PADDING) / viewBox.w,
    (height * FIT_PADDING) / viewBox.h
  );
  const s = s0 * EXTRA_SCALE;
  const offX = (width - viewBox.w * s) * 0.5 - viewBox.x * s;
  const offY = (height - viewBox.h * s) * 0.5 - viewBox.y * s;
  const stepSvg = Math.max(0.5, stepCanvasPx / s);

  for (const el of geomEls) {
    let totalLen = 0;
    try {
      totalLen = el.getTotalLength();
    } catch {
      continue;
    }

    const pts = [];
    const isClosed =
      el.tagName.toLowerCase() === "polygon" ||
      /\b[zZ]\s*$/.test(el.getAttribute("d") || "");

    const ctm = el.getCTM();
    const applyCTM = (p) => {
      if (!ctm) return p;
      const pt = new DOMPoint(p.x, p.y).matrixTransform(ctm);
      return { x: pt.x, y: pt.y };
    };

    for (let d = 0; d <= totalLen; d += stepSvg) {
      const p = el.getPointAtLength(d);
      pts.push(applyCTM({ x: p.x, y: p.y }));
    }
    const pend = el.getPointAtLength(totalLen);
    pts.push(applyCTM({ x: pend.x, y: pend.y }));

    if (isClosed && pts.length > 1) {
      const f = pts[0],
        l = pts[pts.length - 1];
      if (Math.hypot(f.x - l.x, f.y - l.y) < 1.5) pts.pop();
    }

    const canvasPts = pts.map((p) => ({
      x: p.x * s + offX,
      y: p.y * s + offY,
    }));
    polylinesOut.push(canvasPts);
  }

  return polylinesOut;
}

function buildStaticEdges(polylinesArr, thickness) {
  for (const b of edgeBodies) Composite.remove(world, b);
  edgeBodies.length = 0;

  for (const pts of polylinesArr) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.5) continue;

      const midX = (a.x + b.x) * 0.5;
      const midY = (a.y + b.y) * 0.5;
      const angle = Math.atan2(dy, dx);

      const seg = Bodies.rectangle(midX, midY, len, thickness, {
        isStatic: true,
        angle,
        friction: 0.4,
        restitution: 0.1,
        render: { visible: false },
      });
      edgeBodies.push(seg);
    }
  }
  World.add(world, edgeBodies);
}

function pointerToCanvas(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    px: (e.clientX - rect.left) * (width / rect.width),
    py: (e.clientY - rect.top) * (height / rect.height),
  };
}

function findBeadNear(x, y, distPx) {
  const d2max = distPx * distPx;
  for (let i = 0; i < beads.length; i++) {
    const b = beads[i].body;
    const dx = x - b.position.x,
      dy = y - b.position.y;
    if (dx * dx + dy * dy <= d2max) return i;
  }
  return null;
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (0 <= hp && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, c];
  else if (5 <= hp && hp < 6) [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (svgGeomEls.length) {
    polylines = sampleAllGeometriesToCanvasPoints(
      svgGeomEls,
      vb,
      SAMPLE_STEP_PX
    );
    buildStaticEdges(polylines, EDGE_THICKNESS);
    buildSegments(polylines);
  }
}
