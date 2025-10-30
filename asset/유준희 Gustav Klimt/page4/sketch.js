// circular garden

const { Engine, World, Bodies, Composite, Mouse, MouseConstraint } = Matter;
const MatterBody = Matter.Body;

let engine, world, mConstraint;
let blobs = [];
let walls = [];

let cnv;

let bigBlobs = [];

let PALETTES;

let stars = [];

//green triangles
const TRI_DENSITY = 0.000095; // try 1.5e-5 ~ 4e-5


class BigBlob {
  // pass rx, ry instead of r; layers same as before
  constructor(x, y, rx, ry, innerPalette, layers=2) {
    this.rx = rx;   // x-axis radius (visual & collision)
    this.ry = ry;   // y-axis radius
    this.seed = random(1000);
    this.innerPalette = innerPalette;
    this.layers = layers;

    // Use a circle body sized to the larger axis so it collides well in the world.
    const rForPhysics = max(rx, ry);
    this.body = Bodies.circle(x, y, rForPhysics, {
      restitution: 0.9,
      friction: 0.0001,
      frictionAir: 0.01,
    });
    World.add(world, this.body);

    // ---- inner particles (same idea, but place within ellipse) ----
    const count = floor(random(8, 12));
    this.inner = [];
    for (let i = 0; i < count; i++) {
      const pr = random(35, 75);

      // choose a layer ring radius in elliptical terms
      const layerIndex = 1 + floor(random(this.layers));
      const ringT = map(layerIndex, 1, this.layers, 0.35, 0.85) + random(-0.04, 0.04);
      // pick a random angle and radius proportion (polar-ish in ellipse space)
      const ang = random(TWO_PI);
      const px = (this.rx * ringT + random(-8, 8)) * Math.cos(ang);
      const py = (this.ry * ringT + random(-8, 8)) * Math.sin(ang);

      const sp = random(0.2, 0.6);
      const dir = random(TWO_PI);
      this.inner.push({
        x: px, y: py,
        vx: sp * Math.cos(dir),
        vy: sp * Math.sin(dir),
        rr: pr,
        seed: random(1000),
        col: random(this.innerPalette),
      });
    }

    // ---- triangles (local particles) ----
    const area = Math.PI * this.rx * this.ry;
    const triCount = max(3, floor(area * TRI_DENSITY)); // density-based
    this.tris = [];
    for (let i = 0; i < triCount; i++) {
      // place somewhere inside ellipse
      const ang = random(TWO_PI);
      // use rejection sampling to stay inside ellipse
      let tx, ty;
      for (let tries = 0; tries < 20; tries++) {
        const rr = random(0, 0.9); // 0..0.9 of ellipse radius proportion
        tx = (this.rx * rr) * Math.cos(ang + random(-0.3, 0.3));
        ty = (this.ry * rr) * Math.sin(ang + random(-0.3, 0.3));
        const s = (tx*tx)/(this.rx*this.rx) + (ty*ty)/(this.ry*this.ry);
        if (s <= 1) break;
      }
      const size = random(70, 100); // edge length-ish
      const sp   = random(0.15, 0.45);
      const dir  = random(TWO_PI);
      this.tris.push({
        x: tx, y: ty,
        vx: sp * Math.cos(dir),
        vy: sp * Math.sin(dir),
        a: random(TWO_PI),     // angle
        av: random(-0.02, 0.02), // angular vel
        s: size,
        col: random(PALETTES.greens),
      });
    }

  }

  updateInner(dt=1) {
    const damping = 0.96;
    const maxV = 2.0;
    const bounceRest = 0.85;

    for (const p of this.inner) {
      // integrate
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // effective ellipse reduced by particle radius (shrink the wall)
      const ax = this.rx - p.rr - 4; // margin
      const ay = this.ry - p.rr - 4;

      // point-in-ellipse test: s = (x/ax)^2 + (y/ay)^2
      const s = (p.x*p.x)/(ax*ax) + (p.y*p.y)/(ay*ay);
      if (s > 1) {
        // outward normal to ellipse: grad((x/ax)^2 + (y/ay)^2) = (2x/ax^2, 2y/ay^2)
        let nx = p.x / (ax*ax);
        let ny = p.y / (ay*ay);
        const nlen = Math.hypot(nx, ny) || 1;
        nx /= nlen; ny /= nlen;

        // reflect velocity across normal
        const dot = p.vx*nx + p.vy*ny;
        p.vx = (p.vx - 2*dot*nx) * bounceRest;
        p.vy = (p.vy - 2*dot*ny) * bounceRest;

        // project point back to ellipse boundary:
        // scale (x,y) so that (x/ax)^2+(y/ay)^2 == 1
        const k = 1 / Math.sqrt(s);
        p.x *= k * 0.999;  // slightly inside
        p.y *= k * 0.999;
      }

      // damping & clamp
      p.vx = constrain(p.vx * damping, -maxV, maxV);
      p.vy = constrain(p.vy * damping, -maxV, maxV);
    }

    // pairwise collisions (same as before)
    for (let i = 0; i < this.inner.length; i++) {
      for (let j = i + 1; j < this.inner.length; j++) {
        const a = this.inner[i], b = this.inner[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.rr + b.rr;
        if (dist < minDist) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = (minDist - dist);
          const push = overlap * 0.5;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;

          const relvx = b.vx - a.vx;
          const relvy = b.vy - a.vy;
          const reln = relvx * nx + relvy * ny;
          const jImp = -(1.0) * reln * 0.5;
          a.vx -= nx * jImp; a.vy -= ny * jImp;
          b.vx += nx * jImp; b.vy += ny * jImp;
        }
      }
    }
  }

  updateTriangles(dt = 1) {
  const damping = 0.97;
  const maxV = 1.8;
  const bounceRest = 0.9;

  for (const t of this.tris) {
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.a += t.av * dt;

    // use triangle’s effective radius
    const rad = (t.s / Math.sqrt(3));
    const ax = this.rx - rad - 4;
    const ay = this.ry - rad - 4;

    // ellipse boundary reflect
    const s = (t.x*t.x)/(ax*ax) + (t.y*t.y)/(ay*ay);
    if (s > 1) {
      let nx = t.x / (ax*ax), ny = t.y / (ay*ay);
      const nlen = Math.hypot(nx, ny) || 1;
      nx /= nlen; ny /= nlen;

      const dot = t.vx*nx + t.vy*ny;
      t.vx = (t.vx - 2*dot*nx) * bounceRest;
      t.vy = (t.vy - 2*dot*ny) * bounceRest;

      const k = 1 / Math.sqrt(s);
      t.x *= k * 0.999;
      t.y *= k * 0.999;
    }

    // damping
    t.vx = constrain(t.vx * damping, -maxV, maxV);
    t.vy = constrain(t.vy * damping, -maxV, maxV);
  }
}


drawTriangles() {
  noStroke();
  for (const t of this.tris) {
    push();
    translate(t.x, t.y);
    
    fill(t.col);

    // draw an equilateral triangle centered at (0,0) with "side" t.s
    const r = t.s / Math.sqrt(3); // circumscribed radius
    beginShape();
    for (let k = 0; k < 3; k++) {
      const a = HALF_PI + k * (TWO_PI / 3); // point-up default
      vertex(r * Math.cos(a), r * Math.sin(a));
    }
    endShape(CLOSE);
    pop();
  }
}


  updateAndDraw() {
    const pos = this.body.position;
    const ang = this.body.angle;

    push();
    translate(pos.x, pos.y);
    

    const sx = wobbleScale(this.seed);
    const sy = wobbleScale(this.seed + 1.23);

    // draw elliptical container (light yellow)
    noStroke();
    push(); scale(sx * 1.08, sy * 1.08); fill(PALETTES.containerHalo); ellipse(0,0, this.rx*2.15, this.ry*2.15); pop();
    push(); scale(sx, sy);                fill(PALETTES.containerFill); ellipse(0,0, this.rx*2.0,  this.ry*2.0 );  pop();

    this.updateTriangles();
    this.drawTriangles();
    this.updateInner();
    // draw inner ovals
    noStroke();
    for (const p of this.inner) {
      push();
      const w = p.rr * 2.2, h = p.rr * 1.6; // make each mini-blob a little oval
      const sxp = 1 + 0.06 * Math.sin(frameCount * 0.02 + p.seed);
      const syp = 1 + 0.06 * Math.sin(frameCount * 0.018 + p.seed + 0.9);
      translate(p.x, p.y);
      scale(sxp, syp);
      fill(p.col);
      ellipse(0, 0, w, h);
      fill(random(224, 240), 191, random(90, 140));
      ellipse(0, 0, w/2.2, h/2.8);
      pop();
    }

    pop();
  }
}


function makeCircularCage(x, y, R, thickness = 12, segments = 28, opts = {}) {
  const parts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * TWO_PI;
    const cx = x + (R * Math.cos(a));
    const cy = y + (R * Math.sin(a));
    // each segment is a short rectangle tangent to the circle
    const w = (2 * PI * R) / segments + 1;   // segment length
    const h = thickness;
    const seg = Bodies.rectangle(cx, cy, w, h, {
      angle: a,
      isStatic: false,          // cage can move
      restitution: 0.9,
      friction: 0.0001,
      frictionAir: 0.01,
      ...opts
    });
    parts.push(seg);
  }
  // compound body = one moving ring
  const cage = Matter.Body.create({ parts, ...opts });
  return cage;
}

// Visual wobble (purely aesthetic; physics stays circular)
function wobbleScale(seed) {
  // small organic wobble between 0.9 ~ 1.1
  return 1 + 0.1 * Math.sin(frameCount * 0.01 + seed);
}

class Star {
  constructor(x, y, rOuter, rInner, points = 5) {
    this.x = x;
    this.y = y;
    this.rOuter = rOuter;
    this.rInner = rInner;
    this.points = points;

    // gentle drift
    const sp = random(0.2, 0.7);
    const dir = random(TWO_PI);
    this.vx = sp * Math.cos(dir);
    this.vy = sp * Math.sin(dir);

    // rotation
    this.a = random(TWO_PI);
    this.av = random(-0.03, 0.03);

    // “rounded” look via a black stroke outline with ROUND joins
    this.outlineW = max(2, this.rOuter * 0.55); // tweak thickness
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.a += this.av;

    // vertical wrap
    if (this.y < -this.rOuter) this.y = height + this.rOuter;
    else if (this.y > height + this.rOuter) this.y = -this.rOuter;

    // soft edge bounce off canvas
    if (this.x < this.rOuter || this.x > width - this.rOuter) this.vx *= -1;
    if (this.y < this.rOuter || this.y > height - this.rOuter) this.vy *= -1;

    // slight damping so they don’t get too wild
    this.vx *= 0.995;
    this.vy *= 0.995;
  }

  // draw a star centered at 0,0 with rotation this.a
  drawStar(rOut, rIn, pts) {
    beginShape();
    const step = PI / pts;
    for (let i = 0; i < pts * 2; i++) {
      const r = (i % 2 === 0) ? rOut : rIn;
      const ang = this.a + i * step - HALF_PI; // point-up baseline
      vertex(r * Math.cos(ang), r * Math.sin(ang));
    }
    endShape(CLOSE);
  }

  draw() {
    push();
    translate(this.x, this.y);

    // OUTER LAYER (black “rounded” outline)
    stroke(72, 64, 56);
    strokeWeight(this.outlineW);
    strokeJoin(ROUND);               // <- key for rounded spikes
    noFill();
    this.drawStar(this.rOuter, this.rInner, this.points);
    ellipse(0, 0, this.rOuter * 1.5, this.rOuter * 1.5); 

    // INNER LAYER (silver fill)
    noStroke();
    fill(215, 220, 230);            // silver-ish; tweak if you want
    // slightly smaller to reveal black rim
    this.drawStar(this.rOuter * 0.82, this.rInner * 0.82, this.points);
    ellipse(0, 0, this.rOuter * 1.23, this.rOuter * 1.25); 

    pop();
  }
}

// Upward drift + wrapping
const WRAP_MARGIN = 200;       // how far offscreen before wrapping
const TARGET_VY   = -0.6;     // target upward speed (negative = up)
const DRIFT_LERP  = 0.1;     // how quickly velocity eases toward target

function driftUp(body, targetVy = TARGET_VY, lerpAmt = DRIFT_LERP) {
  const v = body.velocity;
  // ease Y velocity toward the target
  const vy = v.y + (targetVy - v.y) * lerpAmt;
  MatterBody.setVelocity(body, { x: v.x, y: vy });
}

function wrapBodyY(body) {
  const m = WRAP_MARGIN;
  const { x, y } = body.position;
  if (y < -m) {
    MatterBody.setPosition(body, { x, y: height + m });
  } else if (y > height + m) {
    MatterBody.setPosition(body, { x, y: -m });
  }
}


function setup() {
  cnv = createCanvas(windowWidth, windowHeight);

  // ~20 tiny stars floating around
  for (let i = 0; i < 20; i++) {
    const rOut = random(10, 18);          // outer size
    const rIn  = rOut * random(0.38, 0.52); // inner radius for the star valleys
    const sx   = random(rOut + 10, width  - rOut - 10);
    const sy   = random(rOut + 10, height - rOut - 10);
    stars.push(new Star(sx, sy, rOut, rIn, 5)); // 5-point star
  }

  pixelDensity(1);

  PALETTES = {
    // light-yellow container for all three
    containerFill: color(245, 236, 190, 235),  // soft yellow
    containerHalo: color(255, 235, 160, 120),

    redInner:  [ color(230,60,10), color(220,60,50),   color(255,50,20) ],
    pinkInner: [ color(114,93,190,250), color(220,124,152), color(134,38,82) ],
    blueInner: [ color(73, 76, 134), color(80, 90, 220),  color(140,190,255,220) ],

    greens:    [ color(86,111,92), color(56,101,64), color(143,173,144), color(143,173,144) ],
  };

  engine = Engine.create();
  world = engine.world;

  // Zero gravity
  world.gravity.x = 0;
  world.gravity.y = 0;

  // Add invisible walls so blobs stay on the page
  const t = 60; // wall thickness
  walls = [
  Bodies.rectangle(-t/2, height/2, t, height, { isStatic: true }),
  Bodies.rectangle(width + t/2, height/2, t, height, { isStatic: true }),
];


  World.add(world, walls);

  // circles with bouncy settings
  const N = 8;
  for (let i = 0; i < N; i++) {
    const r = random(45, 55); // radius
    const x = random(r + 20, width - r - 20);
    const y = random(r + 20, height - r - 20);
    const blob = Bodies.circle(x, y, r, {
      restitution: 0.001,   // bounce
      friction: 0.0001,
      frictionAir: 0.01,   // subtle drift damping
    });
    // give a tiny random push so they start moving
    MatterBody.setVelocity(blob, { x: random(-2, 2), y: random(-2, 2) });
    blobs.push({ body: blob, r, seed: random(1000) });
  }
  World.add(world, blobs.map(b => b.body));

  // big circle
  // big blobs (elliptical containers)
  const bigCount = 3;
  const cfgs = [
    { inner: PALETTES.redInner,  layers: 2 },
    { inner: PALETTES.pinkInner, layers: 3 },
    { inner: PALETTES.blueInner, layers: 2 },
  ];

  for (let i = 0; i < bigCount; i++) {
    const rx = random(190, 250);             // x radius
    const ry = rx * random(0.65, 0.85);      // y radius (oval)
    const pad = Math.max(rx, ry) + 60;       // keep fully on screen

    const x = random(pad, width  - pad);
    const y = random(pad, height - pad);

    const { inner, layers } = cfgs[i % cfgs.length];
    const bb = new BigBlob(x, y, rx, ry, inner, layers);
    MatterBody.setVelocity(bb.body, { x: random(-1.0, 1.0), y: random(-1.0, 1.0) });
    bigBlobs.push(bb);
  }


  // Dragging (mouse + touch) on the canvas element
  const mouse = Mouse.create(cnv.elt);
  mConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.15,
      damping: 0.1,
    },
  });
  World.add(world, mConstraint);

  // Prevent page scroll while touching the canvas
  cnv.elt.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  cnv.elt.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

function draw() {
  Engine.update(engine);

  // 1) drift all physics bodies upward
  for (const b of blobs) {
    driftUp(b.body);
  }
  for (const bb of bigBlobs) {
    driftUp(bb.body);
  }

  // 2) wrap them vertically
  for (const b of blobs) {
    wrapBodyY(b.body);
  }
  for (const bb of bigBlobs) {
    wrapBodyY(bb.body);
  }


  // Klimt-ish warm paper base
  background(224, 191, 100);

  // floating rounded stars
  for (const s of stars) {
    s.update();
    s.draw();
  }


  noFill();
  stroke(157, 148, 116, 150);
  strokeWeight(4);

  let spacing = 30; // distance between lines
  let amp = 20;     // amplitude
  let freq = 0.05;  // frequency
  
  for (let xOffset = 0; xOffset < width; xOffset += spacing) {
    beginShape();
    for (let y = 0; y < height; y++) {
      let x = xOffset + amp * sin(y * freq);
      vertex(x, y);
    }
    endShape();
  }
  

  // Optional: faint sparkles/dust (very light)
  noStroke();
  for (let i = 0; i < 40; i++) {
    const x = noise(i * 0.13, frameCount * 0.005) * width;
    const y = noise(i * 0.31, frameCount * 0.005) * height;
    fill(255, 230, 120, 12);
    circle(x, y, 3);
  }

  // big circles
  for (const bb of bigBlobs) {
    bb.updateAndDraw();
  }

  // Draw blobs with a soft “squishy” wobble
  for (const b of blobs) {
    const { x, y } = b.body.position;
    const a = b.body.angle;

    push();
    translate(x, y);
    rotate(a);

    // subtle wobble scaling for squishy vibe
    const sx = wobbleScale(b.seed);
    const sy = wobbleScale(b.seed + 1.23);

    // Klimt palette: warm golds + olives
    fill(
      220 + 35 * noise(b.seed, frameCount * 0.01),
      190 + 30 * noise(b.seed + 5, frameCount * 0.01),
      60 + 40 * noise(b.seed + 9, frameCount * 0.01),
      100
    );

    // outer soft halo
    noStroke();
    push();
    scale(sx * 1.1, sy * 1.1);
    ellipse(0, 0, b.r * 2.7, b.r * 2.2);
    pop();

    // main body
    push();
    scale(sx, sy);
    fill(
      235 + 20 * noise(b.seed + 2, frameCount * 0.01),
      205 + 30 * noise(b.seed + 6, frameCount * 0.01),
      80 + 40 * noise(b.seed + 10, frameCount * 0.01),
      205
    );
    ellipse(0, 0, b.r * 2.5, b.r * 2);
    pop();

    // inner circle
    push();
    scale(sx/1.5, sy/1.5);
    fill(200, 170, 60);
    ellipse(0, 0, b.r*1.5, b.r);
    pop();

    

    pop();
  }

  // UI
  noStroke(); fill(255,180); textSize(12);
  text('Drag the circles', 14, height - 12);
}

// Keep walls correct on resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Move/resize walls
  World.remove(world, walls);
  const t = 60;
  walls = [
    Bodies.rectangle(-t/2, height/2, t, height, { isStatic: true }),
    Bodies.rectangle(width + t/2, height/2, t, height, { isStatic: true }),
  ];
  World.add(world, walls);

}
