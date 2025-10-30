const {
  Engine,
  World,
  Bodies,
  Body,
  Constraint,
  Composite,
  Mouse,
  MouseConstraint,
  Vector,
  Events,
} = Matter;

let engine, world, mConstraint;
let fork, canvas;
let balls = [];
let spawnIntervalMs = 350;
let lastSpawnAt = 0;
const BALL_LIMIT = 120;

let hitSnd;
let lastHitAt = 0;
const HIT_COOLDOWN = 70;
let audioUnlocked = false;

function preload() {
  if (typeof soundFormats === "function") {
    soundFormats("wav", "mp3");
  }
  if (typeof loadSound === "function") {
    hitSnd = loadSound("fork.wav");
  }
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  noStroke();
  canvas.elt.style.touchAction = "none";
  pixelDensity(2);

  canvas.elt.addEventListener(
    "pointerdown",
    () => {
      if (typeof userStartAudio === "function") userStartAudio();
      audioUnlocked = true;
    },
    { once: true }
  );

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1.0;

  fork = new Fork(width * 0.65, height / 2);

  const m = Mouse.create(canvas.elt);
  m.pixelRatio = pixelDensity();
  mConstraint = MouseConstraint.create(engine, {
    mouse: m,
    constraint: { stiffness: 0.2, damping: 0.1 },
  });
  World.add(world, mConstraint);

  lastSpawnAt = millis();

  Events.on(engine, "collisionStart", onCollisionStart);
}

function draw() {
  background("#f2f2ed");
  Engine.update(engine, 1000 / 60);

  fork.update();
  fork.render();

  const now = millis();
  if (now - lastSpawnAt >= spawnIntervalMs) {
    lastSpawnAt = now + random(-80, 80);
    spawnBallBurst(1);
  }

  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    if (b.isOffscreen()) {
      b.removeFromWorld();
      balls.splice(i, 1);
    } else {
      b.render();
    }
  }

  while (balls.length > BALL_LIMIT) {
    const old = balls.shift();
    if (old) old.removeFromWorld();
  }
}

function keyPressed() {
  if (key === "r" || key === "R") {
    fork.resetAll();
    for (const b of balls) b.removeFromWorld();
    balls = [];
    lastSpawnAt = millis();
  }
}

class Fork {
  constructor(x, y) {
    this.pos = createVector(x, y);

    this.headW = 180;
    this.headH = 130;
    this.handleW = 500;
    this.handleH = 36;
    this.tineCount = 4;
    this.tineGap = 0;
    this.tines = [];

    const pad = 20;
    const span = this.headH - pad * 2;
    const step = span / (this.tineCount - 1);
    const baseLen = 170;

    for (let i = 0; i < this.tineCount; i++) {
      const baseY = y - this.headH / 2 + pad + step * i;
      const baseX = x - this.headW / 2 - this.tineGap;
      this.tines.push(
        new TineChain(createVector(baseX, baseY), baseLen, 18, "horizontal")
      );
    }
  }

  update() {
    const grabbedBody =
      mConstraint && mConstraint.body ? mConstraint.body : null;
    const shiftHeld = keyIsDown(SHIFT);
    for (const t of this.tines) t.update(grabbedBody, shiftHeld);
  }

  render() {
    rectMode(CENTER);
    noStroke();

    fill(255);
    rect(
      this.pos.x + this.handleW / 2,
      this.pos.y,
      this.handleW,
      this.handleH,
      12
    );

    fill(255);
    rect(this.pos.x, this.pos.y, this.headW, this.headH, 10);

    for (const t of this.tines) t.render();
  }

  resetAll() {
    for (const t of this.tines) t.reset();
  }
}

class TineChain {
  constructor(base, restLen = 160, segments = 18, dir = "vertical") {
    this.base = base.copy();
    this.dir = dir;
    this.initLen = restLen;
    this.totalLen = restLen;
    this.segments = segments;
    this.segLen = this.totalLen / this.segments;
    this.nodes = [];
    this.cons = [];
    this.home = [];
    this.nodeRadius = 12;
    this.stiffness = 0.9;
    this.damping = 0.2;
    this.settleLerp = 0.12;
    this.settleDamp = 0.8;
    this.snapDist = 0.6;
    this.snapSpeed = 0.25;

    for (let i = 0; i <= this.segments; i++) {
      const px =
        this.dir === "horizontal" ? this.base.x - i * this.segLen : this.base.x;
      const py =
        this.dir === "horizontal" ? this.base.y : this.base.y - i * this.segLen;

      const isAnchor = i === 0;
      const body = isAnchor
        ? Bodies.circle(px, py, this.nodeRadius, {
            isStatic: true,
            label: "tineAnchor",
            plugin: { isTine: true, isAnchor: true },
            collisionFilter: { group: -1 },
          })
        : Bodies.circle(px, py, this.nodeRadius, {
            frictionAir: 0.02,
            restitution: 0.8,
            density: 0.0015,
            label: "tineNode",
            plugin: { isTine: true },
            collisionFilter: { group: -1 },
          });

      World.add(world, body);
      this.nodes.push(body);
      this.home.push(createVector(px, py));
    }

    for (let i = 0; i < this.nodes.length - 1; i++) {
      const c = Constraint.create({
        bodyA: this.nodes[i],
        bodyB: this.nodes[i + 1],
        length: this.segLen,
        stiffness: this.stiffness,
        damping: this.damping,
      });
      World.add(world, c);
      this.cons.push(c);
    }
  }

  currentTotalLength() {
    let sum = 0;
    for (let i = 1; i < this.nodes.length; i++) {
      const a = this.nodes[i - 1].position;
      const b = this.nodes[i].position;
      sum += dist(a.x, a.y, b.x, b.y);
    }
    return sum;
  }

  update(grabbedBody, shiftHeld) {
    const dragging = grabbedBody && this.nodes.includes(grabbedBody);
    if (dragging && shiftHeld) {
      const curLen = this.currentTotalLength();
      const extra = curLen - this.totalLen;
      if (extra > 6) {
        this.totalLen += extra * 0.1;
        this.applyNewSegLen(this.totalLen / this.segments);
      }
    }

    if (!dragging) {
      for (let i = 1; i < this.nodes.length; i++) {
        const b = this.nodes[i];
        const h = this.home[i];
        const p = b.position;
        const v = b.velocity;
        const nx = p.x + (h.x - p.x) * this.settleLerp;
        const ny = p.y + (h.y - p.y) * this.settleLerp;
        Body.setPosition(b, { x: nx, y: ny });
        Body.setVelocity(b, {
          x: v.x * this.settleDamp,
          y: v.y * this.settleDamp,
        });

        const dx = h.x - nx,
          dy = h.y - ny;
        const dist2 = dx * dx + dy * dy;
        const speed2 = v.x * v.x + v.y * v.y;
        if (
          dist2 < this.snapDist * this.snapDist &&
          speed2 < this.snapSpeed * this.snapSpeed
        ) {
          Body.setPosition(b, { x: h.x, y: h.y });
          Body.setVelocity(b, { x: 0, y: 0 });
          Body.setAngularVelocity(b, 0);
        }
      }
    }
  }

  applyNewSegLen(newLen) {
    this.segLen = newLen;
    for (let i = 0; i < this.cons.length; i++) this.cons[i].length = newLen;
    for (let i = 0; i <= this.segments; i++) {
      const off = i * this.segLen;
      if (this.dir === "horizontal")
        this.home[i].set(this.base.x - off, this.base.y);
      else this.home[i].set(this.base.x, this.base.y - off);
    }
  }

  reset() {
    this.totalLen = this.initLen;
    this.applyNewSegLen(this.totalLen / this.segments);
    for (let i = 0; i <= this.segments; i++) {
      const h = this.home[i];
      Body.setPosition(this.nodes[i], { x: h.x, y: h.y });
      Body.setVelocity(this.nodes[i], { x: 0, y: 0 });
      Body.setAngularVelocity(this.nodes[i], 0);
    }
  }

  render() {
    stroke(255);
    strokeWeight(14);
    noFill();
    beginShape();
    const pts = this.nodes.map((b) => b.position);
    const first = pts[0],
      last = pts[pts.length - 1];
    curveVertex(first.x, first.y);
    for (const p of pts) curveVertex(p.x, p.y);
    curveVertex(last.x, last.y);
    endShape();
  }
}

class Ball {
  constructor(x, y, r = 18) {
    this.r = r;
    this.body = Bodies.circle(x, y, r, {
      restitution: 0.8,
      friction: 0.02,
      density: map(r, 8, 28, 0.0006, 0.002),
      label: "ball",
      plugin: { isBall: true },
    });
    World.add(world, this.body);
    Body.setVelocity(this.body, { x: random(-0.6, 0.6), y: 0 });

    push();
    colorMode(HSB, 360, 100, 100, 1);
    const hue = random(0, 360);
    const sat = random(90, 100);
    const bri = random(75, 95);
    const alf = 0.9;
    this.fillCol = color(hue, sat, bri, alf);
    pop();
  }

  isOffscreen() {
    const p = this.body.position;
    return p.y > height + 200 || p.x < -200 || p.x > width + 200 || p.y < -200;
  }

  removeFromWorld() {
    try {
      World.remove(world, this.body);
    } catch (e) {}
  }

  render() {
    const p = this.body.position;
    push();
    noStroke();
    fill(this.fillCol);
    circle(p.x, p.y, this.r * 2);
    pop();
  }
}

function spawnBallBurst(n = 1) {
  for (let i = 0; i < n; i++) {
    const r = random(10, 28);
    const jitterX = random(-80, 80);
    const b = new Ball(width / 2 + jitterX, 0 - r * 2, r);
    balls.push(b);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  Composite.clear(world, false);
  engine.events = {};
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1.0;

  fork = new Fork(width * 0.65, height / 2);

  const m = Mouse.create(canvas.elt);
  m.pixelRatio = pixelDensity();
  mConstraint = MouseConstraint.create(engine, {
    mouse: m,
    constraint: { stiffness: 0.2, damping: 0.1 },
  });
  World.add(world, mConstraint);

  Events.on(engine, "collisionStart", onCollisionStart);

  for (const b of balls) b.removeFromWorld();
  balls = [];
  lastSpawnAt = millis();
}

function onCollisionStart(evt) {
  const now = millis();
  if (now - lastHitAt < HIT_COOLDOWN) return;

  for (const pair of evt.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;

    const aIsTine = a.plugin && a.plugin.isTine;
    const bIsTine = b.plugin && b.plugin.isTine;
    const aIsBall = a.plugin && a.plugin.isBall;
    const bIsBall = b.plugin && b.plugin.isBall;

    if ((aIsTine && bIsBall) || (bIsTine && aIsBall)) {
      if (!audioUnlocked || !hitSnd || !hitSnd.isLoaded()) break;

      const relV = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
      const amp = constrain(map(relV, 0, 8, 0.08, 0.5), 0.05, 0.6);
      const rate = constrain(map(relV, 0, 8, 0.9, 1.25), 0.85, 1.35);

      hitSnd.play(0, rate, amp);

      lastHitAt = now;
      break;
    }
  }
}
