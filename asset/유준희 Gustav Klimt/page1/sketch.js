// rectangles

let bricks = [];
let rngSeed;

// ===== Layout knobs
const ROW_H_MIN = 0.1;  // of canvas height
const ROW_H_MAX = 0.3;
const W_MIN     = 0.1; // of canvas width
const W_MAX     = 0.25;

// ===== Randomization knobs
const SPLIT_PROB = 0.55;         // chance a brick divides into two segments
const INSET_WHEN_STROKED = 12;  // how much to shrink the top layer if there is a stroke
const INSET_WHEN_SOLID   = 0.0;  // inset when no stroke (keep it flush)

// ===== Editable RGB palette
const PALETTE = {
  black:        [ 49,  43,  36],
  white:        [255, 246, 213],
  grey:         [171, 161, 138],
  gold:         [199, 166,  78],
  yellow:       [224, 184,  55],
  lightYellow:  [239, 213, 101]
};

let cnv;

// Weights for picking "original" colors
const COLOR_WEIGHTS = {
  black: 0.1,
  white: 0.1,
  grey:  0.1,
  gold:  0.1,
  yellow: 0.4,
  lightYellow: 0.2
};


function setup(){
  cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(1.5);
  colorMode(RGB, 255);
  noLoop();

  // Prevent the browser from intercepting touch gestures
  cnv.style('touch-action', 'none');           // modern
  cnv.canvas.style.touchAction = 'none';       // fallback
  cnv.canvas.style.webkitUserSelect = 'none';  // iOS
  cnv.canvas.style.webkitTouchCallout = 'none';
  cnv.canvas.style.zIndex = '10';              // avoid being under overlays

  randomizeSeedAndBuild(); // your buildBricks() etc.

  // Attach both input types to the same handler
  cnv.mousePressed(handlePointer);
  cnv.touchStarted((e)=>{ handlePointer(); return false; });

  cnv.touchStarted((e) => {
  let px, py;
  if (touches && touches.length) {
    // p5's touches[] gives canvas coords already
    px = touches[0].x;
    py = touches[0].y;
  } else if (e.changedTouches && e.changedTouches.length) {
    // fallback: map client coords to canvas coords
    const t = e.changedTouches[0];
    const r = cnv.elt.getBoundingClientRect();     // use .elt for p5 Renderer
    px = (t.clientX - r.left) * (width  / r.width);
    py = (t.clientY - r.top)  * (height / r.height);
  } else {
    px = mouseX; py = mouseY; // last resort
  }

  handlePointer(px, py);
  return false; // prevent scroll/zoom
});
}

function randomizeSeedAndBuild(){
  rngSeed = Math.floor(Math.random()*1e9);
  randomSeed(rngSeed);
  noiseSeed(rngSeed);
  buildBricks();
  redraw();
}

function draw(){
  background(20);

  // PASS 1: draw all segment bases (underlayers)
  for (const b of bricks) b.drawUnderlays();

  // PASS 2: draw all top layers
  for (const b of bricks) b.drawFills();

  noStroke(); fill(255,170); textSize(12);
  text('Click bricks to re-roll', 14, height-12);
}

function buildBricks(){
  bricks = [];
  let y = 0;
  while (y < height) {
    let rowH = int(random(height*ROW_H_MIN, height*ROW_H_MAX));
    if (y + rowH > height) rowH = height - y;

    let x = 0;
    while (x < width) {
      let w = int(random(width*W_MIN, width*W_MAX));
      if (x + w > width) w = width - x;

      const verts = [
        {x:x,   y:y},
        {x:x+w, y:y},
        {x:x+w, y:y+rowH},
        {x:x,   y:y+rowH}
      ];

      const brick = new Brick(verts);
      brick.reroll();     // decide split & build segments with stroke logic
      bricks.push(brick);

      x += w;
    }
    y += rowH;
  }
}

// ===== Interaction
function handlePointer(px, py){
  for (const b of bricks) {
    if (b.contains(px, py)) {
      b.reroll();
      redraw();
      break;
    }
  }
}



function touchStarted(){ return false; }  // prevent default
function touchMoved(){ return false; }    // stop scroll while dragging



function keyPressed(){
  if (key==='R' || key==='r') {
    rngSeed = floor(random(1e9));
    randomSeed(rngSeed);
    noiseSeed(rngSeed);
    buildBricks();
    redraw();
  }
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  buildBricks();
  redraw();
}

// ===== Utilities
function pickColor(){
  const entries = Object.entries(COLOR_WEIGHTS);
  const total = entries.reduce((a,[,w])=>a+w,0);
  let r = random(total);
  for (const [name, w] of entries) {
    if ((r -= w) <= 0) return { name, col: PALETTE[name] };
  }
  return { name: 'gold', col: PALETTE.gold };
}

const isYellowish = (n)=> (n==='yellow' || n==='lightYellow');

// Given an original color name, decide if the segment should have a stroke,
// and what that stroke (base) color should be.
// Rule:
// - yellow/lightYellow → NO stroke
// - white → stroke color = black
// - black/grey/gold → stroke color = white
function strokeDecisionForOriginal(name){
  // probability knobs
  const STROKE_CHANCE_DEFAULT = 0.35;   // chance for black / grey / gold
  const STROKE_CHANCE_WHITE   = 0.5;    // chance for white

  // yellow & lightYellow → never stroke
  if (name === 'yellow' || name === 'lightYellow') {
    return { hasStroke: false, strokeCol: null, inset: INSET_WHEN_SOLID };
  }

  if (name === 'white') {
    if (random() < STROKE_CHANCE_WHITE) {
      return { hasStroke: true, strokeCol: PALETTE.black, inset: INSET_WHEN_STROKED };
    } else {
      return { hasStroke: false, strokeCol: null, inset: INSET_WHEN_SOLID };
    }
  }

  // black, grey, gold
  if (random() < STROKE_CHANCE_DEFAULT) {
    return { hasStroke: true, strokeCol: PALETTE.white, inset: INSET_WHEN_STROKED };
  } else {
    return { hasStroke: false, strokeCol: null, inset: INSET_WHEN_SOLID };
  }
}





/* =========================
   Segment: one drawable rect
   - original color (top color)
   - base color (stroke-as-underlay) if hasStroke
   - inset controls top size
========================= */
class Segment {
  constructor(x, y, w, h, originalName){
    this.x = x; this.y = y; this.w = w; this.h = h;

    this.originalName = originalName;
    this.originalCol  = color(...PALETTE[originalName]);

    const sd = strokeDecisionForOriginal(originalName);
    this.hasStroke = sd.hasStroke;
    this.strokeCol = sd.strokeCol ? color(...sd.strokeCol) : null;
    this.inset     = sd.inset;

    // If stroked: base = stroke color, top = original color (shrunken by inset)
    // If not:     base = original color (fill the bounds), top = same color (no inset)
    this.baseCol = this.hasStroke ? color(...sd.strokeCol) : color(...PALETTE[originalName]);
    this.topCol  = color(...PALETTE[originalName]);
  }

  drawUnderlay(){
    noStroke();
    fill(this.baseCol);
    rectMode(CORNER);
    rect(this.x, this.y, this.w, this.h);
  }

  drawFill(){
    noStroke();
    fill(this.topCol);
    rectMode(CORNER);
    const t = this.inset;
    // Keep a minimal guard so halves don't invert when very small
    const rw = max(0, this.w - 2*t);
    const rh = max(0, this.h - 2*t);
    rect(this.x + t, this.y + t, rw, rh);
  }

  contains(px, py){
    return (px >= this.x && px <= this.x+this.w && py >= this.y && py <= this.y+this.h);
  }
}

/* =========================
   Brick: holds 1 (solid) or 2 (split) segments
========================= */
class Brick {
  constructor(verts) {
    this.verts = verts;
    this.segments = []; // array of Segment
    this.split = false;
  }

  get bounds() {
    const xs = this.verts.map(v => v.x);
    const ys = this.verts.map(v => v.y);
    return { x: min(...xs), y: min(...ys), w: max(...xs)-min(...xs), h: max(...ys)-min(...ys) };
  }

  reroll(){
    this.segments = [];
    this.split = (random() < SPLIT_PROB);

    const b = this.bounds;

    if (this.split) {
      // Two independent segments (top and bottom), each with its own logic
      const midY = b.y + b.h/2;

      // pick original colors (allow same or different; if you prefer different, re-pick when equal)
      let topCol = pickColor();
      let botCol = pickColor();
      // Uncomment to force variety:
      // if (botCol.name === topCol.name) botCol = pickColor();

      this.segments.push(new Segment(b.x, b.y, b.w, b.h/2, topCol.name));
      this.segments.push(new Segment(b.x, midY, b.w, b.h/2, botCol.name));
    } else {
      // Single solid segment
      const one = pickColor();
      this.segments.push(new Segment(b.x, b.y, b.w, b.h, one.name));
    }
  }

  drawUnderlays(){
    for (const s of this.segments) s.drawUnderlay();
  }

  drawFills(){
    for (const s of this.segments) s.drawFill();
  }

  contains(px, py) {
    const b = this.bounds;
    return (px >= b.x && px <= b.x+b.w && py >= b.y && py <= b.y+b.h);
  }
}
