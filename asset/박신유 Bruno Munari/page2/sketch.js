const {
  Engine,
  World,
  Bodies,
  Composite,
  Composites,
  Constraint,
  Query,
  Vector,
  Body,
  Events,
} = Matter;

let engine, world;
let cnv;

let walls = [];
let stackComp = null;

const boxSize = 60;
const cols = 15;
const rows = 10;
const groundPadding = 8;

let pointerPos = null;
let isPointerDown = false;
let grabbedBody = null;
let grabConstraint = null;
let grabLocalOffset = null;

let textures = [];

let hitSnd;
let lastGlobalHitAt = 0;
const GLOBAL_COOLDOWN = 60;
const perBodyCooldown = new Map();
const PER_BODY_COOLDOWN = 120;
const MIN_HIT_SPEED = 1.2;

function preload() {
  textures = [
    loadImage("img/box01.png"),
    loadImage("img/box02.png"),
    loadImage("img/box03.png"),
    loadImage("img/box04.png"),
    loadImage("img/box05.png"),
  ];

  hitSnd = loadSound("block.wav", () => {
    hitSnd.setVolume(0.6);
  });
}

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  rectMode(CENTER);
  noStroke();

  cnv.elt.style.touchAction = "none";
  cnv.elt.addEventListener("pointerdown", onPointerDown);
  cnv.elt.addEventListener("pointermove", onPointerMove);
  cnv.elt.addEventListener("pointerup", onPointerUp);
  cnv.elt.addEventListener("pointercancel", onPointerUp);

  engine = Engine.create();
  world = engine.world;

  walls = createWalls(width, height);
  Composite.add(world, walls);

  stackComp = createCenteredPyramid();
  Composite.add(world, stackComp);

  assignTexturesToBodies(stackComp.bodies, textures);

  Events.on(engine, "collisionStart", onCollisionStart);
}

function draw() {
  background("#f2f2ed");
  Engine.update(engine, 1000 / 60);

  const bodies = Composite.allBodies(world);
  for (const b of bodies) drawBody(b);

  if (pointerPos) {
    noStroke();
    fill(255, 0);
    circle(pointerPos.x, pointerPos.y, 10);
  }
  if (grabConstraint && grabbedBody) {
    stroke(255, 0);
    strokeWeight(2);
    const a = grabConstraint.pointA;
    const bp = grabbedBody.position;
    const worldOffset = Vector.rotate(grabLocalOffset, grabbedBody.angle);
    const b = Vector.add(bp, worldOffset);
    line(a.x, a.y, b.x, b.y);
  }
}

function drawBody(body) {
  if (body.isStatic) {
    fill(80);
    beginShape();
    for (const v of body.vertices) vertex(v.x, v.y);
    endShape(CLOSE);
    return;
  }

  if (body.circleRadius) {
    if (body.texture) {
      push();
      translate(body.position.x, body.position.y);
      rotate(body.angle);
      imageMode(CENTER);
      image(body.texture, 0, 0, body.circleRadius * 2, body.circleRadius * 2);
      pop();
    } else {
      fill(240);
      circle(body.position.x, body.position.y, body.circleRadius * 2);
    }
    return;
  }

  if (body.texture) {
    push();
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    imageMode(CENTER);
    image(body.texture, 0, 0, boxSize, boxSize);
    pop();
  } else {
    fill(240);
    beginShape();
    for (const v of body.vertices) vertex(v.x, v.y);
    endShape(CLOSE);
  }
}

function createCenteredPyramid() {
  const baseWidth = cols * boxSize;
  const startX = (width - baseWidth) / 2;
  const startY = height - rows * boxSize - groundPadding;

  return Composites.pyramid(startX, startY, cols, rows, 0, 0, (x, y) =>
    Bodies.rectangle(x, y, boxSize, boxSize, {
      restitution: 0.1,
      friction: 0.2,
    })
  );
}

function createWalls(w, h) {
  const t = 50;
  const top = Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, { isStatic: true });
  const right = Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, {
    isStatic: true,
  });
  const left = Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, {
    isStatic: true,
  });
  const bottom = Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, {
    isStatic: true,
  });
  return [top, right, left, bottom];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 벽 위치 업데이트
  if (walls.length === 4) {
    const [top, right, left, bottom] = walls;
    const t = 50;
    Body.setPosition(top, { x: width / 2, y: -t / 2 });
    Body.setPosition(right, { x: width + t / 2, y: height / 2 });
    Body.setPosition(left, { x: -t / 2, y: height / 2 });
    Body.setPosition(bottom, { x: width / 2, y: height + t / 2 });
  }

  if (stackComp) Composite.remove(world, stackComp);
  stackComp = createCenteredPyramid();
  Composite.add(world, stackComp);
  assignTexturesToBodies(stackComp.bodies, textures);
}

function assignTexturesToBodies(bodies, texArr) {
  if (!texArr?.length) return;

  const sorted = [...bodies].sort((a, b) => {
    if (Math.abs(a.position.y - b.position.y) > 1)
      return b.position.y - a.position.y; // y 큰 게 아래쪽
    return a.position.x - b.position.x;
  });

  sorted.forEach((b, i) => {
    b.texture = texArr[i % texArr.length];
  });
}

function onPointerDown(e) {
  isPointerDown = true;
  pointerPos = getPointerPos(e);

  if (typeof userStartAudio === "function") {
    userStartAudio();
  }

  const bodies = Composite.allBodies(world);
  const hit = Query.point(bodies, pointerPos).find((b) => !b.isStatic);

  if (hit) {
    grabbedBody = hit;
    const worldDelta = Vector.sub(pointerPos, grabbedBody.position);
    grabLocalOffset = Vector.rotate(worldDelta, -grabbedBody.angle);

    grabConstraint = Constraint.create({
      pointA: { x: pointerPos.x, y: pointerPos.y },
      bodyB: grabbedBody,
      pointB: grabLocalOffset,
      stiffness: 0.2,
      damping: 0.1,
      length: 0,
    });
    Composite.add(world, grabConstraint);

    Body.setVelocity(grabbedBody, { x: 0, y: 0 });
    Body.setAngularVelocity(grabbedBody, 0);
  }
}

function onPointerMove(e) {
  if (!isPointerDown) return;
  pointerPos = getPointerPos(e);
  if (grabConstraint) {
    grabConstraint.pointA.x = pointerPos.x;
    grabConstraint.pointA.y = pointerPos.y;
  }
}

function onPointerUp(e) {
  isPointerDown = false;
  pointerPos = getPointerPos(e);
  if (grabConstraint) {
    Composite.remove(world, grabConstraint);
    grabConstraint = null;
  }
  grabbedBody = null;
  grabLocalOffset = null;
}

function getPointerPos(e) {
  const rect = cnv.elt.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (width / rect.width),
    y: (e.clientY - rect.top) * (height / rect.height),
  };
}

function onCollisionStart(event) {
  const now = performance.now();

  if (now - lastGlobalHitAt < GLOBAL_COOLDOWN) return;

  for (const pair of event.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;

    if (a.isStatic && b.isStatic) continue;

    const rel = Vector.sub(a.velocity, b.velocity);
    const speed = Vector.magnitude(rel);

    if (speed < MIN_HIT_SPEED) continue;

    const okA = checkBodyCooldown(a, now);
    const okB = checkBodyCooldown(b, now);
    if (!okA && !okB) continue;

    const vol = constrain(map(speed, 0.8, 8.0, 0.08, 0.9), 0.0, 0.9);
    const rate = constrain(map(speed, 0.8, 8.0, 0.95, 1.25), 0.5, 1.5);

    playHitSound(vol, rate);
    lastGlobalHitAt = now;

    break;
  }
}

function checkBodyCooldown(body, now) {
  if (body.isStatic) return true;
  const last = perBodyCooldown.get(body.id) || 0;
  if (now - last < PER_BODY_COOLDOWN) return false;
  perBodyCooldown.set(body.id, now);
  return true;
}

function playHitSound(vol = 0.6, rate = 1.0) {
  if (!hitSnd || !hitSnd.isLoaded()) return;
  try {
    hitSnd.stop();
    hitSnd.rate(rate);
    hitSnd.setVolume(vol);
    hitSnd.play();
  } catch (e) {}
}
