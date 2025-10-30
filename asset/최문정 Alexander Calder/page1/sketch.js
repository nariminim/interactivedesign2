const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Constraint = Matter.Constraint;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Events = Matter.Events;
const Body = Matter.Body;

let engine;
let pendulums = [];
let ropes = [];
let anchors = [];
let mouseConstraint;
let audioStarted = false;
let ballSet = new Set(); // 공 판별용
const COUNT = 10;

// ----------------------------------------------------
function touchStarted() {
  if (!audioStarted) {
    if (getAudioContext().state !== "running") getAudioContext().resume();
    userStartAudio();
    audioStarted = true;
  }
}

function mousePressed() {
  if (!audioStarted) {
    if (getAudioContext().state !== "running") getAudioContext().resume();
    userStartAudio();
    audioStarted = true;
  }
}

// ----------------------------------------------------
// ----------------------------------------------------
function setup() {
  createCanvas(700, 1000);
  engine = Engine.create();
  engine.gravity.y = 2;

  const spacing = 70;
  const startX = width / 2 - ((COUNT - 1) * spacing) / 2;

  for (let i = 0; i < COUNT; i++) {
    const ropeLen = random(300, 1000);
    const ballSize = random(3, 50);
    const anchor = { x: startX + i * spacing, y: -random(50, 200) };

    const ball = Bodies.circle(anchor.x, anchor.y + ropeLen, ballSize, {
      frictionAir: 0,
      restitution: 1.1,
      density: 0.01,
      label: "ball",
    });

    const rope = Constraint.create({
      pointA: anchor,
      bodyB: ball,
      length: ropeLen,
      stiffness: 0.9,
      damping: 0.02,
    });

    Composite.add(engine.world, [ball, rope]);
    anchors.push(anchor);
    pendulums.push({ body: ball, size: ballSize });
    ropes.push(rope);
    ballSet.add(ball);
  }

  for (let { body } of pendulums) {
    Body.setPosition(body, { x: body.position.x - 100, y: body.position.y });
    Body.applyForce(body, body.position, { x: 0.06, y: 0 });
  }

  const canvasElement = document.querySelector("canvas");
  const mouse = Mouse.create(canvasElement);
  mouse.pixelRatio = pixelDensity();

  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.25,
      render: { visible: false },
    },
  });
  Composite.add(engine.world, mouseConstraint);

  Events.on(engine, "collisionStart", onCollision);
}

// ---------------------------공-------------------------
// ----------------------------------------------------
function draw() {
  background(245);
  Engine.update(engine);

  noFill();
  stroke(0);
  strokeWeight(2);

  for (let i = 0; i < COUNT; i++) {
    const anchor = anchors[i];
    const p = pendulums[i].body;

    beginShape();
    const midX =
      (anchor.x + p.position.x) / 2 + sin(frameCount * 0.05 + i) * 10;
    const midY = (anchor.y + p.position.y) / 2 + cos(frameCount * 0.05 + i) * 5;
    vertex(anchor.x, anchor.y);
    quadraticVertex(midX, midY, p.position.x, p.position.y);
    endShape();
  }

  noStroke();
  for (let i = 0; i < COUNT; i++) {
    const p = pendulums[i].body;
    const s = pendulums[i].size;
    fill(70 + i * 30, 100, 220 - i * 20);
    ellipse(p.position.x, p.position.y, s * 2);
  }
}

// -------------------------소리---------------------------

function onCollision(event) {
  if (!audioStarted) return;

  for (const pair of event.pairs) {
    const A = pair.bodyA;
    const B = pair.bodyB;

    if (!(ballSet.has(A) && ballSet.has(B))) continue;

    const x = (A.position.x + B.position.x) / 2;
    const y = (A.position.y + B.position.y) / 2;

    const freq = map(y, 0, height, 880, 110);
    const pan = map(x, 0, width, -1, 1);

    const osc = new p5.Oscillator("sine");
    osc.freq(freq);
    osc.pan(pan);
    osc.amp(0.6, 0);
    osc.start();
    osc.amp(0, 0.25, 0.02);
    setTimeout(() => osc.stop(), 350);
  }
}
