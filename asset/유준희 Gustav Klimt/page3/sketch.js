// Klimt "The Kiss" — Garden Bloom (touch to grow flowers)
// Drag finger/mouse to plant blooms. Press C = clear, S = save PNG.

// -------------------- Editable Palette --------------------
const PALETTE = {
  greens: [
    '#98a989', '#9eb06f', '#477A3E', '#5E8D41', '#7AA847',
    '#b2b06e', '#658030', '#2E6B3F', '#6E9E54', '#89B35B'
  ],
  yellows: ['#F7D14A', '#c8ba3f', '#CFA32A', '#cebb3f', '#E0B64B'],
  purples: ['#9169a7', '#864f80', '#8160a1'],
  blues:   ['#2C6EA8', '#4047ab', '#6b67a6', '#4245ab', '#7281c0'],
  centers: ['#F3E6B3', '#F6D77D', '#EBD06A', '#E8C55E', '#D9B24C'],
  groundBase: '#91b18a',
  groundTopTint: '#91b18a'
};


// Debug counters to verify mix
let MIX_DEBUG = { tuft: 0, flower: 0, purple: 0 };

// ---- Mix knobs (percentages; they don't have to sum exactly, we clamp) ----
const PROB_TUFT   = 0.80; // 80% tufts
const PROB_FLOWER = 0.15; // 15% yellow/blue flowers
const PROB_PURPLE = 0.05; // 5% purple blobs

const WEIGHT_TUFT = 7;
const WEIGHT_FLOWER = 2.5;
const WEIGHT_PURPLE = 0.5;

// ---- Behavior knobs ----
const STEP = 14;             // spacing along stroke
const MAX_BLOOMS = 1800;     // performance cap
const FLOWER_RATIO = 0.3;    // not used directly now (we pick families below)
const JITTER = 100;           // scatter radius
const BRUSH_MODE = 'radial'; // 'radial' | 'directional'

let blooms = [];
let lastPos = null;
let cnv;
let _pressed = false;
let _pointer = { x: 0, y: 0 };

// -------------------- Setup --------------------
function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noStroke();

  // prevent browser gestures stealing touches
  cnv.style('touch-action', 'none');
  cnv.elt.style.touchAction = 'none';
  cnv.elt.style.webkitUserSelect = 'none';
  cnv.elt.style.userSelect = 'none';
  cnv.elt.style.pointerEvents = 'auto';

  // Raw DOM touch listeners (critical for iOS)
  cnv.elt.addEventListener('touchstart', handleTouchStart, { passive: false });
  cnv.elt.addEventListener('touchmove',  handleTouchMove,  { passive: false });
  cnv.elt.addEventListener('touchend',   handleTouchEnd,   { passive: false });
  cnv.elt.addEventListener('touchcancel',handleTouchEnd,   { passive: false });

  // Mouse fallback
  cnv.elt.addEventListener('mousedown',  (e) => {
    _pressed = true; setPointerFromMouse(e); spawnAt(_pointer.x, _pointer.y, lastPos);
  });
  cnv.elt.addEventListener('mousemove',  (e) => { setPointerFromMouse(e); });
  window.addEventListener('mouseup',     ()  => { _pressed = false; lastPos = null; });

  drawGround();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  drawGround();
}

// -------------------- Ground --------------------
function drawGround() {
  // gradient
  for (let y = 0; y < height; y++) {
    const t = y / max(1, height - 1);
    const c = lerpColor(color(PALETTE.groundTopTint), color(PALETTE.groundBase), t);
    stroke(c);
    line(0, y, width, y);
  }
  noStroke();
  // speckles
  randomSeed(7);
  for (let i = 0; i < (width * height) / 1500; i++) {
    const x = random(width), y = random(height);
    const g = random(PALETTE.greens);
    fill(color(g + '20'));
    circle(x, y, random(1, 2.2));
  }
}

// -------------------- Draw --------------------
function draw() {
  // animate + render
  for (let b of blooms) b.update();
  for (let b of blooms) if (b.kind === 'tuft') b.render();
  for (let b of blooms) if (b.kind === 'flower' || b.kind === 'purpleflower') b.render();

  // spawn along drag path
  if (_pressed && isInCanvas(_pointer.x, _pointer.y)) {
    if (lastPos) {
      const d = dist(lastPos.x, lastPos.y, _pointer.x, _pointer.y);
      if (d > 0) {
        for (let t = STEP; t <= d; t += STEP) {
          const x = lerp(lastPos.x, _pointer.x, t / d);
          const y = lerp(lastPos.y, _pointer.y, t / d);
          spawnAt(x, y, lastPos);
        }
      }
    }
    lastPos = { x: _pointer.x, y: _pointer.y };
  } else {
    lastPos = null;
  }

  // cap count
  if (blooms.length > MAX_BLOOMS) {
    blooms.splice(0, blooms.length - MAX_BLOOMS);
  }

  // UI
  noStroke(); fill(255,255,255,5); textSize(12);
  text('Hold and drag', 14, height - 12);
}

// -------------------- Spawn helpers --------------------
function spawnAt(x, y, prev) {
  if (!isInCanvas(x, y)) return;

  // directional (perpendicular) or radial jitter
  if (BRUSH_MODE === 'directional' && prev) {
    const dir = createVector(x - prev.x, y - prev.y);
    if (dir.magSq() > 1e-3) {
      dir.normalize();
      const perp = createVector(-dir.y, dir.x);
      const offset = (random() - 0.5) * 2 * JITTER;
      plantBloom(x + perp.x * offset, y + perp.y * offset);
      return;
    }
  }
  const ang = random(TWO_PI);
  const rad = JITTER * Math.sqrt(random()); // uniform disk
  plantBloom(x + rad * Math.cos(ang), y + rad * Math.sin(ang));
}

// Choose what to plant (yellow/blue flower vs purple flower vs tuft)
function plantBloom(x, y) {
  if (!isInCanvas(x, y)) return;

  // normalize in case the three don't sum to 1.0 exactly
  const total = Math.max(1e-9, PROB_TUFT + PROB_FLOWER + PROB_PURPLE);
  const pTuft   = PROB_TUFT   / total;
  const pFlower = PROB_FLOWER / total;
  const pPurple = PROB_PURPLE / total;

  const r = Math.random(); // <-- not affected by p5 randomSeed()

  if (r < pTuft) {
    blooms.push(new Tuft(x, y));
    MIX_DEBUG.tuft++;
  } else if (r < pTuft + pFlower) {
    blooms.push(new Flower(x, y));
    MIX_DEBUG.flower++;
  } else {
    blooms.push(new PurpleFlower(x, y));
    MIX_DEBUG.purple++;
  }
}

// -------------------- Events --------------------
function isInCanvas(x, y) { return x >= 0 && x < width && y >= 0 && y < height; }

function setPointerFromTouchEvent(e) {
  const rect = cnv.elt.getBoundingClientRect();
  const t = e.touches[0] || e.changedTouches[0];
  if (!t) return;
  _pointer.x = t.clientX - rect.left;
  _pointer.y = t.clientY - rect.top;
}
function setPointerFromMouse(e) {
  const rect = cnv.elt.getBoundingClientRect();
  _pointer.x = e.clientX - rect.left;
  _pointer.y = e.clientY - rect.top;
}

function handleTouchStart(e) {
  e.preventDefault();
  setPointerFromTouchEvent(e);
  _pressed = true;
  spawnAt(_pointer.x, _pointer.y, lastPos);
}
function handleTouchMove(e) {
  e.preventDefault();
  setPointerFromTouchEvent(e);
}
function handleTouchEnd(e) {
  e.preventDefault();
  _pressed = false;
  lastPos = null;
}

// -------------------- Keys --------------------
function keyPressed() {
  if (key === 'c' || key === 'C') clearGarden();
  else if (key === 's' || key === 'S') saveCanvas('klimt-garden', 'png');
}
function clearGarden() { blooms = []; drawGround(); }

// -------------------- Blooms --------------------
class Bloom {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.age = 0;
    this.growFrames = int(random(18, 28));
    this.r = random(30, 54);
    this.rot = random(TWO_PI);
  }
  scaleNow() {
    const t = constrain(this.age / this.growFrames, 0, 1);
    return 1 - pow(1 - t, 3); // cubic ease-out
  }
  update() { this.age++; }
}

class Tuft extends Bloom {
  constructor(x, y) {
    super(x, y);
    this.kind = 'tuft';
    this.r = random(50, 78);             // overall size of the tuft
    this.blades = int(random(2, 5));     // number of blades
    this.bladeParams = [];
    for (let i = 0; i < this.blades; i++) {
      const len = this.r * random(0.3, 1.2);   // blade length variation
      const wid = max(2, this.r * 0.08 * random(4, 1.1)); // blade width
      const col = color(random(PALETTE.greens));
      this.bladeParams.push({ len, wid, col });
    }
  }

  render() {
    push();
    translate(this.x, this.y);
    const s = this.scaleNow();
    noStroke();
    for (const b of this.bladeParams) {
      fill(b.col);
      // draw each blade centered, upright
      ellipse(0, -b.len * 0.5 * s, b.wid * s, b.len * s);
    }
    pop();
  }
}


// Simple Flower (Yellow + Blue
class Flower extends Bloom {
  constructor(x, y) {
    super(x, y);
    this.kind = 'flower';
    const family = random(['yellows', 'blues']);
    this.petalPalette = PALETTE[family];

    this.center = color('#FFD84D');     // fixed yellow center
    this.petalCount = int(random(3, 6)); // 3–5 petals
    this.r = random(20, 30);             // overall size (edit here)

    // Precompute petals: angle + color (freeze at birth)
    this.petals = [];
    for (let i = 0; i < this.petalCount; i++) {
      const angle = (TWO_PI * i) / this.petalCount + random(-0.2, 0.2); // slight jitter
      const col = color(random(this.petalPalette));
      this.petals.push({ angle, col });
    }
  }

  render() {
    push();
    translate(this.x, this.y);
    const s = this.scaleNow();
    const R = this.r * s;

    noStroke();
    for (const p of this.petals) {
      const px = cos(p.angle) * (R * 0.4);
      const py = sin(p.angle) * (R * 0.4);
      fill(p.col);                       // <- precomputed color (no random here)
      ellipse(px, py, R * 0.6, R * 0.9); // petal proportions
    }

    // center dot
    fill(this.center);
    circle(0, 0, R * 0.4);
    pop();
  }
}



// Simple Purple Flower (blob style, two shades)
class PurpleFlower extends Bloom {
  constructor(x, y) {
    super(x, y);
    this.kind = 'purpleflower';
    this.petalCount = int(random(3, 6));   // 3–5 petals
    this.r = random(68, 72);               // overall size

    // pick two shades of purple for this flower
    this.primaryCol = color(random(PALETTE.purples));
    this.secondaryCol = color(random(PALETTE.purples));

    this.petals = [];
    for (let i = 0; i < this.petalCount; i++) {
      const a = random(TWO_PI);            
      const px = cos(a) * (this.r * 0.3);
      const py = sin(a) * (this.r * 0.3);
      // alternate which shade each petal uses
      const col = (i % 2 === 0) ? this.primaryCol : this.secondaryCol;
      this.petals.push({ a, px, py, col });
    }
  }

  render() {
    push();
    translate(this.x, this.y);
    const s = this.scaleNow();
    const R = this.r * s;

    // draw petals with alternating shades
    noStroke();
    for (const p of this.petals) {
      fill(p.col);
      ellipse(p.px * s, p.py * s, R * 0.8, R * 0.5);
    }

    // center (yellow dot)
    fill('#d0c6a0');
    circle(0, 0, R * 0.4);

    pop();
  }
}


