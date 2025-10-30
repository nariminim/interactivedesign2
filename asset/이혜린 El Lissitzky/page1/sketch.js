const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;

let engine;
let tri, triPos;
let circle;
let circleRadius = 160;
const minCircleRadius = 25;
let trail = [];
const trailLength = 60;
const trailAlphaMax = 180;
let miniTriangles = [];
let tris = [];
let rects = [];
let touchActive = false;
let prevX = 0;
let walls = [];

const triVertices = [
  { x: 0, y: 0 },
  { x: -120, y: 0 },
  { x: -100, y: -220 }
];

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.style('touch-action', 'none'); // ✅ 브라우저 기본 터치 제스처 비활성화
  canvas.elt.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.elt.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.elt.addEventListener('touchend', handleTouchEnd, { passive: false });

  rectMode(CENTER);
  noStroke();

  engine = Engine.create();
  engine.world.gravity.y = 0;

  triPos = { x: width / 3 - 100, y: height / 3 };
  tri = Bodies.fromVertices(triPos.x, triPos.y, triVertices, { restitution: 0.1 });
  Body.rotate(tri, -10);

  circle = Bodies.circle(width / 2 + 200, height / 2, circleRadius, {
    restitution: 0.9,
    friction: 0.1,
    frictionAir: 0.01,
    inertia: Infinity
  });

  Composite.add(engine.world, [tri, circle]);

  rects.push({ body: Bodies.rectangle(width - 300, 80, 130, 50, { isStatic: true }), w: 70, h: 20, color: 255 });
  Body.rotate(rects[0].body, -PI / 6);

  for (let i = 0; i < 6; i++) {
    const x = random(50, width - 50);
    const y = random(50, height - 50);
    const w = random(40, 200);
    const h = random(8, 20);
    const colors = ['#E72727', '#777777', '#FFFFFF'];
    const color = random(colors);
    const angle = random(TWO_PI);
    const body = Bodies.rectangle(x, y, w, h, { isStatic: true });
    Body.rotate(body, angle);
    rects.push({ body, w, h, color });
    Composite.add(engine.world, body);
  }

  tris = [];
  for (let i = 0; i < 12; i++) {
    const x = random(50, width - 100);
    const y = random(50, height - 50);
    const colors = ['#E72727', '#777777', '#FFFFFF'];
    const color = random(colors);
    const angle = random(TWO_PI);
    tris.push({ x, y, color, angle });
  }

  createWalls(40);

  Events.on(engine, "collisionStart", event => {
    event.pairs.forEach(pair => {
      let bodies = [pair.bodyA, pair.bodyB];
      if (bodies.includes(tri) && bodies.includes(circle)) {
        circleRadius = max(minCircleRadius, circleRadius - 10);
        Body.scale(circle, circleRadius / circle.circleRadius, circleRadius / circle.circleRadius);
        circle.circleRadius = circleRadius;
        spawnMiniTriangles(circle.position.x, circle.position.y);
      }
    });
  });
}

function draw() {
  background(235);
  Engine.update(engine);
  drawTraz(0);

  for (let r of rects) drawSquare(r.w, r.h, r.body, r.color);

  for (let t of tris) {
    push();
    translate(t.x, t.y);
    rotate(t.angle);
    fill(t.color);
    beginShape();
    vertex(0, 0);
    vertex(10, 10);
    vertex(20, -30);
    endShape(CLOSE);
    pop();
  }

  engine.world.gravity.y = touchActive ? 1 : 0;

  updateTriangle();
  drawCircle(circle);
  drawMiniTriangles();
  drawTrail();
  drawTriangle(tri);
}

function updateTriangle() {
  let dx = triPos.x - prevX;
  prevX = triPos.x;

  if (touchActive) {
    Body.setPosition(tri, triPos);
    let speed = map(abs(dx), 0, width, 0.05, 0.2);
    Body.setAngularVelocity(tri, speed);
  }

  trail.push({ x: tri.position.x, y: tri.position.y, angle: tri.angle });
  if (trail.length > trailLength) trail.shift();
}

function drawTrail() {
  for (let i = 0; i < trail.length - 1; i++) {
    let alpha = map(i, 0, trail.length, 0, trailAlphaMax);
    push();
    translate(trail[i].x, trail[i].y);
    rotate(trail[i].angle);
    fill(255, alpha);
    drawTriangleShape(triVertices);
    pop();
  }
}

function drawTriangle(body) {
  push();
  translate(body.position.x, body.position.y);
  rotate(body.angle);
  fill("#E72727");
  drawTriangleShape(triVertices);
  pop();
}

function drawTriangleShape(vertices) {
  beginShape();
  for (let v of vertices) vertex(v.x, v.y);
  endShape(CLOSE);
}

function drawCircle(body) {
  push();
  translate(body.position.x, body.position.y);
  fill(255);
  ellipse(0, 0, circleRadius * 2);
  pop();
}

function spawnMiniTriangles(x, y) {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const speed = random(2, 5);
    const colors = ['#E72727', '#777777', '#FFFFFF'];
    const color = random(colors);

    const customVertices = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: -30 }
    ];

    const body = Bodies.fromVertices(x, y, customVertices, { restitution: 0.8 });
    Body.setVelocity(body, { x: cos(angle) * speed, y: sin(angle) * speed });
    body.customColor = color;
    Composite.add(engine.world, body);
    miniTriangles.push(body);
  }
}

function drawMiniTriangles() {
  for (let b of miniTriangles) {
    push();
    translate(b.position.x, b.position.y);
    rotate(b.angle);
    fill(b.customColor);
    drawTriangleShape([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: -30 }
    ]);
    pop();
  }
}

function createWalls(t) {
  walls = [
    Bodies.rectangle(0, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width / 2, 0, width, t, { isStatic: true }),
    Bodies.rectangle(width / 2, height, width, t, { isStatic: true })
  ];
  Composite.add(engine.world, walls);
}

function drawSquare(w, h, body, color) {
  push();
  translate(body.position.x, body.position.y);
  rotate(body.angle);
  rectMode(CENTER);
  fill(color);
  rect(0, 0, w, h);
  pop();
}

function drawTraz(col) {
  fill(col);
  quad(width / 2, 0, width, 0, width, height, width / 4, height);
}

// ✅ 터치 핸들러만 사용
function handleTouchStart(e) {
  e.preventDefault();
  touchActive = true;
  updatePointer(e);
}
function handleTouchMove(e) {
  e.preventDefault();
  updatePointer(e);
}
function handleTouchEnd(e) {
  e.preventDefault();
  touchActive = false;
  Body.setAngularVelocity(tri, 0);
}

function updatePointer(e) {
  const t = e.touches[0];
  triPos.x = t.clientX;
  triPos.y = t.clientY;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
