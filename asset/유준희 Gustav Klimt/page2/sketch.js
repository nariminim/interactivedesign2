// === Klimt Rectangles —

const { Engine, World, Bodies, Runner, Mouse, MouseConstraint } = Matter;

let engine, world, runner, mConstraint, p5mouse;
let walls = [];
let bricks = [];
let rngSeed;
let cnv;

// ----- Layout / palette (same as before)
const ROW_H_MIN = 0.10, ROW_H_MAX = 0.22;
const W_MIN = 0.12, W_MAX = 0.26;
const SPLIT_PROB = 0.55;
const INSET_WHEN_STROKED = 12, INSET_WHEN_SOLID = 0.0;

const PALETTE = {
  black:[49,43,36], white:[255,246,213], grey:[171,161,138],
  gold:[199,166,78], yellow:[224,184,55], lightYellow:[239,213,101]
};
const COLOR_WEIGHTS = { black:.1, white:.1, grey:.1, gold:.1, yellow:.4, lightYellow:.2 };

// ----- Physics feel
const GRAVITY_Y = 1.0;
const FRICTION_AIR = 0.02, RESTITUTION = 0.05, FRICTION = 0.8, DENSITY = 0.0016;

// ----- Recycle / draw
const CULL_MARGIN = 120;
const MAX_BRICKS = 260;

// ----- Long-press stretch params
const HOLD_MS = 350;           // threshold to trigger stretch
const STRETCH_MAX = 2.2;       // max height multiplier while holding
const STRETCH_SPEED = 0.20;    // ease speed towards target scale per frame

// tracking current press
let heldBrick = null;
let holdStartMs = 0;

// HiDPI helper
function computePixelRatioForCanvas(canvasEl) {
  const cssW = canvasEl.clientWidth || canvasEl.width;
  return cssW ? (canvasEl.width / cssW) : 1;
}

function setup(){
  cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(1.5);
  colorMode(RGB, 255);
  rectMode(CORNER);

  // block browser gestures
  cnv.style('touch-action', 'none');
  cnv.canvas.style.touchAction = 'none';
  cnv.canvas.style.webkitUserSelect = 'none';
  cnv.canvas.style.webkitTouchCallout = 'none';

  engine = Engine.create();
  world  = engine.world;
  world.gravity.y = GRAVITY_Y;

  runner = Runner.create();
  Runner.run(runner, engine);

  rebuildFloor();   // floor only (no side walls)

  // Mouse/touch drag
  p5mouse = Mouse.create(cnv.elt);
  p5mouse.pixelRatio = computePixelRatioForCanvas(cnv.elt);
  mConstraint = MouseConstraint.create(engine, {
    mouse: p5mouse,
    constraint: { stiffness: 0.15, damping: 0.05 }
  });
  World.add(world, mConstraint);

  // Detect what we’re holding for long-press
  // (polling in draw() is simpler than event listeners here)
  // seed
  rngSeed = Math.floor(Math.random()*1e9);
  randomSeed(rngSeed);
  noiseSeed(rngSeed);
  seedInitialRows();
}

function draw(){
  background(20);
  syncMatterMouseToCanvas();

  // Determine if we are holding a brick
  updateHeldBrick();

  // Draw bricks, apply long-press stretch, and recycle offscreen
  for (const b of bricks) {
    // If this is the held one, decide the target stretch
    // inside your bricks loop in draw()
  if (b === heldBrick && millis() - holdStartMs >= HOLD_MS) {
    b.targetStretch = STRETCH_MAX;
  } else {
    b.targetStretch = 1.0;
  }

  // Smooth approach
  const prevH = b.h;
  const goalH = b.h0 * b.targetStretch;
  const newH  = lerp(prevH, goalH, STRETCH_SPEED);

  if (abs(newH - prevH) > 0.1) {
    // 1) scale body about its centre
    const sy = newH / prevH;
    Matter.Body.scale(b.body, 1, sy);

    // 2) translate body so the **bottom edge stays fixed** in world space
    const oldHalf = prevH * 0.5;
    const newHalf = newH  * 0.5;
    const a = b.body.angle;
    const dx = (oldHalf - newHalf) * Math.sin(a);
    const dy = (oldHalf - newHalf) * Math.cos(a);
    Matter.Body.setPosition(b.body, { x: b.body.position.x + dx, y: b.body.position.y + dy });

    // 3) update stored height & visuals (no recolor)
    b.h = newH;
    b.rebuildSegments();

    b.body.isSleeping = false;
  }


    // draw
    b.draw();

    // recycle if it left the screen sideways/below
    const pos = b.body.position;
    const offBelow = pos.y > height + CULL_MARGIN;
    const offLeft  = pos.x < -CULL_MARGIN;
    const offRight = pos.x > width + CULL_MARGIN;
    if (offBelow || offLeft || offRight) recycleBrick(b);
  }

  // UI
  noStroke(); fill(255,180); textSize(12);
  text('Hold on the rectangles', 14, height - 12);
}

function keyPressed(){
  if (key === 'R' || key === 'r') {
    for (const b of bricks) World.remove(world, b.body);
    bricks.length = 0;
    seedInitialRows();
  }
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  rebuildFloor();
  syncMatterMouseToCanvas();
}

// -------------------- Mouse/touch helpers --------------------
function syncMatterMouseToCanvas() {
  const r = cnv.elt.getBoundingClientRect();
  p5mouse.pixelRatio = computePixelRatioForCanvas(cnv.elt);
  p5mouse.offset.x = r.left + window.scrollX;
  p5mouse.offset.y = r.top  + window.scrollY;
}

function updateHeldBrick(){
  // Matter stores the body we currently grab as mConstraint.body
  const currentBody = mConstraint.body; // may be null
  if (currentBody && currentBody._brickRef) {
    const b = currentBody._brickRef;
    if (heldBrick !== b) {
      heldBrick = b;
      holdStartMs = millis();
    }
  } else {
    heldBrick = null; // not holding anything
  }
}

// -------------------- Walls --------------------
function rebuildFloor(){
  const thick = 60; 
  const floor = Bodies.rectangle(width/2, height+thick/2, width*2+thick*2, thick, { isStatic:true }); 
  const left = Bodies.rectangle(-thick, height/2, thick, height/2, { isStatic:true }); 
  const right = Bodies.rectangle(width+thick, height/2, thick, height/2, { isStatic:true }); 
  World.add(world, [floor, left, right]);
}

// -------------------- Seeding + Recycling --------------------
const START_PACKING_Y_OFFSET = (h) => Math.max(-h * 0.7, -600);

function seedInitialRows(){
  let yCursor = START_PACKING_Y_OFFSET(height);
  while (yCursor < height * 0.6) {
    let rowH = int(random(height * ROW_H_MIN, height * ROW_H_MAX));
    rowH = constrain(rowH, 18, height * 0.28);

    let xCursor = 0;
    while (xCursor < width) {
      let bw = int(random(width * W_MIN, width * W_MAX));
      bw = constrain(bw, 30, width * 0.40);
      if (xCursor + bw > width) bw = width - xCursor;
      if (bw <= 0) break;

      const cx = xCursor + bw/2;
      const cy = yCursor + rowH/2;
      const split = (random() < SPLIT_PROB);

      const brick = new Brick(cx, cy, bw, rowH, split);
      bricks.push(brick);

      xCursor += bw;
    }
    yCursor += rowH;
  }
}

function recycleBrick(b){
  // reset to original height before recycling
  const sy = b.h0 / b.h;
  Matter.Body.scale(b.body, 1, sy);
  b.h = b.h0;
  b.rebuildSegments();

  const cx = random(b.w/2, width - b.w/2);
  const cy = -random(80, 240) - b.h/2;
  Matter.Body.setPosition(b.body, { x: cx, y: cy });
  Matter.Body.setVelocity(b.body, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(b.body, 0);
  Matter.Body.setAngle(b.body, random(-0.1, 0.1));
  b.body.isSleeping = false;
}

// -------------------- Color / style helpers --------------------
function pickColor(){
  const entries = Object.entries(COLOR_WEIGHTS);
  const total = entries.reduce((a,[,w]) => a + w, 0);
  let r = random(total);
  for (const [name, w] of entries) {
    if ((r -= w) <= 0) return { name, col: PALETTE[name] };
  }
  return { name: 'gold', col: PALETTE.gold };
}
function strokeDecisionForOriginal(name){
  const STROKE_CHANCE_DEFAULT = 0.35, STROKE_CHANCE_WHITE = 0.5;
  if (name === 'yellow' || name === 'lightYellow') {
    return { hasStroke:false, strokeCol:null, inset:INSET_WHEN_SOLID };
  }
  if (name === 'white') {
    if (random() < STROKE_CHANCE_WHITE)
      return { hasStroke:true, strokeCol:PALETTE.black, inset:INSET_WHEN_STROKED };
    return { hasStroke:false, strokeCol:null, inset:INSET_WHEN_SOLID };
  }
  if (random() < STROKE_CHANCE_DEFAULT)
    return { hasStroke:true, strokeCol:PALETTE.white, inset:INSET_WHEN_STROKED };
  return { hasStroke:false, strokeCol:null, inset:INSET_WHEN_SOLID };
}

// -------------------- Visual segment --------------------
class Segment {
  constructor(x, y, w, h, originalName){
    this.x = x; this.y = y; this.w = w; this.h = h;
    const sd = strokeDecisionForOriginal(originalName);
    this.hasStroke = sd.hasStroke;
    this.strokeCol = sd.strokeCol ? color(...sd.strokeCol) : null;
    this.inset     = sd.inset;
    this.baseCol = this.hasStroke ? color(...sd.strokeCol) : color(...PALETTE[originalName]);
    this.topCol  = color(...PALETTE[originalName]);
  }
  drawLocal(){
    noStroke();
    fill(this.baseCol);
    rect(this.x, this.y, this.w, this.h);
    fill(this.topCol);
    const t = this.inset;
    const rw = max(0, this.w - 2*t);
    const rh = max(0, this.h - 2*t);
    rect(this.x + t, this.y + t, rw, rh);
  }
}

// -------------------- Brick (physics + visuals + stretch state) --------------------
class Brick {
  constructor(cx, cy, w, h, split=false){
    this.w = w;           // current height will change via stretch (actually w is width; h below)
    this.h = h;           // current height
    this.h0 = h;          // rest height
    this.split = split;

    // --- cache the visual params ONCE so we don't reroll colors each rebuild ---
    if (split) {
      const topName = pickColor().name;
      const botName = pickColor().name;
      const topSD = strokeDecisionForOriginal(topName);
      const botSD = strokeDecisionForOriginal(botName);
      this.segmentParams = [
        { // top half
          name: topName,
          baseCol: topSD.hasStroke ? color(...topSD.strokeCol) : color(...PALETTE[topName]),
          topCol:  color(...PALETTE[topName]),
          inset:   topSD.inset
        },
        { // bottom half
          name: botName,
          baseCol: botSD.hasStroke ? color(...botSD.strokeCol) : color(...PALETTE[botName]),
          topCol:  color(...PALETTE[botName]),
          inset:   botSD.inset
        }
      ];
    } else {
      const oneName = pickColor().name;
      const sd = strokeDecisionForOriginal(oneName);
      this.segmentParams = [{
        name: oneName,
        baseCol: sd.hasStroke ? color(...sd.strokeCol) : color(...PALETTE[oneName]),
        topCol:  color(...PALETTE[oneName]),
        inset:   sd.inset
      }];
    }

    // physics body
    this.body = Bodies.rectangle(cx, cy, w, h, {
      frictionAir: FRICTION_AIR,
      restitution: RESTITUTION,
      friction: FRICTION,
      density: DENSITY
    });
    this.body._brickRef = this;
    World.add(world, this.body);

    this.rebuildSegments();
    this.targetStretch = 1.0;
  }

  // rebuild geometry **only**, reuse cached colors/inset
  rebuildSegments(){
    this.segments = [];
    const w = this.w, h = this.h;
    const left = -w/2, top = -h/2;

    if (this.split) {
      const midH = h/2;
      // order: top segment first, then bottom segment
      const pTop = this.segmentParams[0];
      const pBot = this.segmentParams[1];

      const sTop = new Segment(left, top, w, midH, pTop.name);
      sTop.baseCol = pTop.baseCol; sTop.topCol = pTop.topCol; sTop.inset = pTop.inset;

      const sBot = new Segment(left, top+midH, w, midH, pBot.name);
      sBot.baseCol = pBot.baseCol; sBot.topCol = pBot.topCol; sBot.inset = pBot.inset;

      this.segments.push(sTop, sBot);
    } else {
      const p = this.segmentParams[0];
      const s = new Segment(left, top, w, h, p.name);
      s.baseCol = p.baseCol; s.topCol = p.topCol; s.inset = p.inset;
      this.segments.push(s);
    }
  }

  draw(){
    const pos = this.body.position;
    const ang = this.body.angle;
    push();
    translate(pos.x, pos.y);
    rotate(ang);
    for (const s of this.segments) s.drawLocal();
    pop();
  }
}

