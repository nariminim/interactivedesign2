// Gold leaves



// ellipse gate for flowers
let ellipseCX, ellipseCY, ellipseRX, ellipseRY;

//grain

let grain;                      // p5.Graphics noise tile
const GRAIN_SIZE   = 256;       // tile size (power of two is nice)
const GRAIN_ALPHA  = 100;        // 0–255: overall grain strength
const GRAIN_REMAKE = false;     // set true if you want new grain each frame


/////////////////////// Flowers ///////////////////////

let flowers = [];               // {x,y,r,petals,rot,col}
const FLOWER_PROB = 1;       // chance per stamp to drop a flower
const FLOWER_MIN_R = 6;         // radius range
const FLOWER_MAX_R = 12;
const FLOWER_MIN_PETALS = 3;
const FLOWER_MAX_PETALS = 8;

// subtle line sway (visual only)
let windVisual = 0;          // smoothed wind for lines
const WIND_SMOOTH = 0.03;    // 0..1: higher = snappier
const LINE_SWAY_AMP = 6;     // max pixel offset at strong wind
const LINE_SWAY_FREQ = 0.6;  // noise speed (Hz-ish)

/////////////////////// Matter aliases ///////////////////////
let Engine = Matter.Engine,
    World  = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Constraint = Matter.Constraint,
    Composite = Matter.Composite;

let engine, world;

/////////////////////// Brush / render ///////////////////////
let strokes = [];        // array of polylines: [{pts:[{x,y},...]}]
let currStroke = null;

let stampStep = 12;       // px: distance along path between triangle stamps
let sideOffset = 15;     // px: offset from centerline to place triangles
let triSize = 10;        // triangle size
let triDensity = 0.0008; // matter density

let maxTriangles = 800;  // cap for performance

// store triples so we can clean up together
let triTriples = [];     // [{tri, anchor, link}]

/////////////////////// Wind /////////////////////////////////
let wind = 5.0;             // horizontal wind magnitude
let windPerBody = 0.00004;  // force per frame

let lastWindChange = 0;
let windInterval = 1000; // ms between changes (2 seconds)

const STEP_MIN = 22;
const STEP_MAX = 25;

const TRI_MIN  = 19;
const TRI_MAX  = 24;

/////////////////////// Setup ////////////////////////////////
function setup(){
  cnv = createCanvas(windowWidth, windowHeight);

  createCanvas(windowWidth, windowHeight);
  pixelDensity(1.5);
  colorMode(HSB, 360, 100, 100, 255);
  noFill();
  strokeJoin(ROUND);
  strokeCap(ROUND);

  engine = Engine.create({ enableSleeping: true });
  world = engine.world;
  world.gravity.y = 0.8; // gravity can stay; constraints hold triangles

  textFont('sans-serif');

  makeGrainTexture();

    ellipseCX = 0;
    ellipseCY = height;
    ellipseRX = width+50;   // horizontal radius
    ellipseRY = ellipseRX * 1.1;             // vertical radius

  cnv.elt.addEventListener('touchstart',  e => e.preventDefault(), { passive: false });
  cnv.elt.addEventListener('touchmove',   e => e.preventDefault(), { passive: false });
  cnv.elt.addEventListener('touchend',    e => e.preventDefault(), { passive: false });

  // (optional) belt-and-suspenders: stop scroll/zoom at the document level too
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

function makeGrainTexture(){
  grain = createGraphics(GRAIN_SIZE, GRAIN_SIZE);
  grain.loadPixels();
  for (let y = 0; y < GRAIN_SIZE; y++){
    for (let x = 0; x < GRAIN_SIZE; x++){
      // random monochrome pixel (0..255)
      const v = random(120, 255);       // brighter grain (tweak range for contrast)
      const i = (y * GRAIN_SIZE + x) * 4;
      grain.pixels[i+0] = v;
      grain.pixels[i+1] = v;
      grain.pixels[i+2] = v;
      grain.pixels[i+3] = 255;
    }
  }
  grain.updatePixels();
}



/////////////////////// Draw loop ////////////////////////////
function draw(){
  background(35, 62, 30);

  ///////noise effect////////////////////
  
  push();
  // Use a blending mode that feels nice over gold; try OVERLAY, SOFT_LIGHT, or MULTIPLY
  blendMode(OVERLAY);
  // alpha strength (tint works in current colorMode; using 255-based here is simple)
  tint(255, GRAIN_ALPHA);

  // draw stretched to cover canvas
  image(grain, 0, 0, width, height);
  pop();

  // green ellipse
  fill(70, 53, 38);
  noStroke();
  ellipse(ellipseCX, ellipseCY, ellipseRX*2, ellipseRY*2);

  ///////////////////////////

  Engine.update(engine, 1000/60);

  // smooth wind for line sway (keeps it subtle)
  windVisual = lerp(windVisual, wind, WIND_SMOOTH);


  // every few seconds, pick a new random wind value
  if (millis() - lastWindChange > windInterval) {
    wind = random(0, 30); // new random magnitude + direction
    lastWindChange = millis();

    windInterval = random(500, 2000); 
  }


  // apply wind (translational + a little spin) but triangles remain attached
  if (abs(wind) > 0.00001) {
    for (const {tri} of triTriples) {
      Body.applyForce(tri, tri.position, { x: wind * windPerBody, y: 0 });
      Body.setAngularVelocity(tri, tri.angularVelocity + wind * 0.002); // gentle torque
    }
  }

  drawFlowers();  
  drawAllStrokes();
  drawTriangles();
  drawHUD();
  
  // limit count
  if (triTriples.length > maxTriangles) pruneTriangles(maxTriangles);

  // UI
  noStroke(); fill(255,180); textSize(12);
  text('Hold and drag to draw', 14, height - 12);
}

/////////////////////// Input: draw stroke ///////////////////
function mousePressed(){ beginStroke(mouseX, mouseY); }
function mouseDragged(){ extendStroke(mouseX, mouseY); }
function mouseReleased(){ endStroke(); }

function touchStarted(){ if (touches.length>0) beginStroke(touches[0].x, touches[0].y); return false; }
function touchMoved(){ if (touches.length>0) extendStroke(touches[0].x, touches[0].y); return false; }
function touchEnded(){ endStroke(); return false; }

function beginStroke(x, y){
  currStroke = { 
    pts: [{x, y, phase: random(1000)}],
    acc: 0,
    nextStep: random(STEP_MIN, STEP_MAX)
  };
  strokes.push(currStroke);
}

function extendStroke(x, y){
  if (!currStroke) return;
  const pts = currStroke.pts;
  const p0 = pts[pts.length-1];
  const dx = x - p0.x, dy = y - p0.y;
  const d  = Math.hypot(dx, dy);
  if (d < 1) return;

  pts.push({ x, y, phase: random(1000) });

  currStroke.acc += d;

  // use the stroke’s “nextStep”; after each stamp, randomize a new nextStep
  while (currStroke.acc >= currStroke.nextStep) {
    currStroke.acc -= currStroke.nextStep;

    // parametric position along JUST this segment
    const t = 1 - (currStroke.acc / d);
    const sx = p0.x + dx * t;
    const sy = p0.y + dy * t;

    // normal (perpendicular to path direction)
    const nx = -dy / d, ny = dx / d;

    const pL = { x: sx + nx * sideOffset, y: sy + ny * sideOffset };
    const pR = { x: sx - nx * sideOffset, y: sy - ny * sideOffset };

    // (optional) per-triangle size randomness for extra organic feel
    const sizeThis = random(TRI_MIN, TRI_MAX);

    // upside-down triangles anchored to the stroke
    spawnAttachedTriangle(pL.x, pL.y, sizeThis, Math.PI);
    spawnAttachedTriangle(pR.x, pR.y, sizeThis, Math.PI);

    // pick a NEW random distance for the next triangle
    currStroke.nextStep = random(STEP_MIN, STEP_MAX);

    // randomly plant a small flower somewhere on the canvas
    if (random() < FLOWER_PROB) {
      spawnFlowerInEllipse();
    }


  }
}


function endStroke(){ currStroke = null; }

/////////////////////// Spawn attached triangle //////////////
function spawnAttachedTriangle(cx, cy, size, rotationRad){
  // Make a triangle (3-gon) approx "size" tall
  // Matter polygon radius is from center; map so height ≈ size
  const radius = size * 0.58; // tuned so polygon height ~ size
  const tri = Bodies.polygon(cx, cy, 3, radius, {
    density: triDensity,
    friction: 0.6,
    frictionAir: 0.02,
    restitution: 0.05
  });

  if (!tri) return;

  // Point it "down"
  Body.setAngle(tri, rotationRad || Math.PI);

  // Invisible static anchor at the stamp point (pin location)
  const anchor = Bodies.circle(cx, cy, 1, { isStatic: true, isSensor: true });

  // Attach near the top edge center of the triangle (local offset)
  // For an equilateral triangle centered at (0,0), top edge is around y ≈ -radius*0.5
  const link = Constraint.create({
    bodyA: anchor,
    pointA: { x: 0, y: 0 },
    bodyB: tri,
    pointB: { x: 0, y: -radius * 0.5 },  // pin closer to top edge
    length: 0,
    stiffness: 0.98,
    damping: 0.18
  });

  Body.setAngularVelocity(tri, random(-0.05, 0.05));

  World.add(world, [tri, anchor, link]);
  triTriples.push({ tri, anchor, link });
}


/////////////////////// Rendering ////////////////////////////
function drawAllStrokes(){
  const t = millis() * 0.001;
  // map the (possibly big) wind value to a gentle 0..1 factor
  const wmag = constrain(abs(windVisual) * 0.2, 0, 1); // tune 0.2 as needed
  const amp  = LINE_SWAY_AMP * wmag;                   // pixels

  for (const s of strokes) {
    const pts = s.pts;
    if (pts.length < 2) continue;

    // build displaced polyline
    const disp = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[i > 0 ? i - 1 : i]; // previous (or self)
      const dx = p.x - q.x, dy = p.y - q.y;
      const len = max(1e-6, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len; // unit normal

      // soft noise so each vertex wiggles slightly differently
      const n = noise(p.phase + t * LINE_SWAY_FREQ);
      const offset = (n - 0.5) * 2 * amp;    // -amp..+amp
      disp.push({ x: p.x + nx * offset, y: p.y + ny * offset });
    }

    // halo
    stroke(44, 45, 90, 70);
    strokeWeight(8);
    noFill();
    beginShape(); for (const p of disp) vertex(p.x, p.y); endShape();

    // core line
    stroke(44, 80, 92, 255);
    strokeWeight(3.2);
    beginShape(); for (const p of disp) vertex(p.x, p.y); endShape();
  }
}


function drawTriangles(){
  for (const {tri} of triTriples) {
    const verts = tri.vertices;

    // motion-based sparkle
    const speed = Math.hypot(tri.velocity.x, tri.velocity.y);
    const s = constrain(60 + speed*12, 40, 100);
    const br = constrain(60 + speed*18, 35, 100);

    // fill
    noStroke();
    fill(44, s, br);
    beginShape(); for (let v of verts) vertex(v.x, v.y); endShape(CLOSE);

    // subtle rim
    stroke(44, 30, 20, 120);
    strokeWeight(0.6);
    noFill();
    beginShape(); for (let v of verts) vertex(v.x, v.y); endShape(CLOSE);
  }
}

/////////////////////// Housekeeping /////////////////////////
function pruneTriangles(keep){
  const excess = triTriples.length - keep;
  if (excess <= 0) return;
  const toRemove = triTriples.splice(0, excess);
  for (const t of toRemove) {
    World.remove(world, t.link);
    World.remove(world, t.tri);
    World.remove(world, t.anchor);
  }
}

/////////////////////// HUD & Controls ///////////////////////
function drawHUD(){
  const hud = `Wind: ${nf(wind,1,3)}`;
  noStroke(); fill(0, 0, 80, 30); rect(10, 10, textWidth(hud)+16, 28, 6);
  fill(0, 0, 70); textSize(9); textAlign(LEFT, BASELINE);
  text(hud, 18, 27);
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  // rebuild walls, keep attachments
  const saved = triTriples.slice();
  Composite.clear(world, false);
  triTriples = [];
  addBounds();
  // re-add saved triples
  for (const t of saved) {
    World.add(world, [t.tri, t.anchor, t.link]);
    triTriples.push(t);
  }
}

function spawnFlower(x, y){
  const r = random(FLOWER_MIN_R, FLOWER_MAX_R);
  const petals = int(random(FLOWER_MIN_PETALS, FLOWER_MAX_PETALS+1));
  const rot = random(TWO_PI);
  // your requested color range (HSB)
  const col = color(random(226, 269), random(43, 58), random(61, 67));
  flowers.push({ x, y, r, petals, rot, col });
  // hard cap so list doesn't explode
  if (flowers.length > 600) flowers.splice(0, flowers.length - 600);
}

function drawFlowers(){
  // simple multi-petal stamp (ellipses around a circle)
  noStroke();
  for (const f of flowers) {
    push();
    translate(f.x, f.y);
    rotate(f.rot);

    // petals
    fill(f.col);
    for (let i = 0; i < f.petals; i++) {
      const a = (TWO_PI * i) / f.petals;
      const px = cos(a) * f.r;
      const py = sin(a) * f.r;
      push();
      translate(px, py);
      rotate(a);
      ellipse(0, 0, f.r * 2, f.r * 1.5);
      pop();
    }

    // tiny center (slightly lighter)
    const h = hue(f.col), s = saturation(f.col), b = brightness(f.col);
    fill(h, s * 0.6, min(100, b + 20));
    circle(0, 0, f.r * 0.6);

    pop();
  }
}

function randomPointInEllipse(cx, cy, rx, ry){
  // uniform sampling in ellipse: sqrt trick for radius
  const theta = random(TWO_PI);
  const r = Math.sqrt(random()); 
  return { x: cx + rx * r * Math.cos(theta), y: cy + ry * r * Math.sin(theta) };
}

function spawnFlowerInEllipse(){
  const p = randomPointInEllipse(ellipseCX, ellipseCY, ellipseRX, ellipseRY);
  spawnFlower(p.x, p.y);
}

