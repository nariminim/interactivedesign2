const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Vector = Matter.Vector;

let engine, canvas;

// 빨간 원
let circle;
let radius = 160;

// 사각형
let blackSquare;
let redSquare;
let w = 120;

let rects = [];
// 벽
let t = 40;

// 드래그 관련
let dragging = false;
let dragOffset = {x:0, y:0};
let lastTouch = {x:0, y:0};
let dragVelocity = {x:0, y:0};
let lastAngle = 0;
let angularVelocity = 0;

// 중력 관련
let gravityRadius = 150;
let gravityStrength = 0.0005;

// 작은 사각형(파티클)
let miniSquares = [];
let miniW;
let miniH;
let maxMini = 40;      
let pendingSpawn = false;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  engine = Engine.create();
  engine.world.gravity.y = 0;

  // 기본 이벤트 비활성화
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('contextmenu', e => e.preventDefault());

  // 빨간 원
  circle = Bodies.circle(radius + 10, height - radius - 10, radius, { isStatic: true });
  Composite.add(engine.world, circle);

  // 원 둘레에 사각형들
  rects = [];
  for (let i = 0; i < 7; i++) {
    let angle = random(TWO_PI);
    let r = radius;
    let x = circle.position.x + cos(angle) * r;
    let y = circle.position.y + sin(angle) * r;

    let wRandom = random(10, 60);
    let hRandom = random(10, 20);
    let colors = [255, 0, 119];
    let color = random(colors);

    let body = Bodies.rectangle(x, y, wRandom, hRandom, { isStatic: true });

    if (random() < 0.5) Body.setAngle(body, angle + PI/2);
    else Body.setAngle(body, angle);

    Composite.add(engine.world, body);
    rects.push({ body: body, w: wRandom, h: hRandom, color: color });
  }

  // 검은 사각형
  blackSquare = Bodies.rectangle(width - 100, 50 + w/2, w, w, { isStatic: true, angle: radians(10) });
  Composite.add(engine.world, blackSquare);

  // 빨간 사각형
  redSquare = Bodies.rectangle(200, 300, w, w, {
    isStatic: false,
    angle: radians(10),
    friction: 0.8,
    frictionAir: 0,
    restitution: 0.5
  });
  Composite.add(engine.world, redSquare);

  // 벽 생성
  createWall(t);

  // 충돌 이벤트
  Matter.Events.on(engine, 'collisionStart', e => {
    for (let pair of e.pairs) {
      let other = pair.bodyA === redSquare ? pair.bodyB : (pair.bodyB === redSquare ? pair.bodyA : null);
      if (other && !pendingSpawn) {
        if (other === blackSquare || other === circle) pendingSpawn = true;
      }
    }
  });
}

function draw() {
  Engine.update(engine);
  background(235);

  // 빨간 원
  drawCircle(circle, '#E72727', radius);

  // 원 주변 사각형
  for (let r of rects) drawSquare(r.w, r.h, r.body, r.color);

  // 검은 사각형 회전
  Body.rotate(blackSquare, 0.01);
  drawSquare(w, w, blackSquare, 0);

  // 빨간 사각형
  drawSquare(w, w, redSquare, '#E72727');

  // 미니 사각형들
  for (let sq of miniSquares) {
    drawSquare(miniW, miniH, sq.body, sq.color);
    ifGravity(sq.body);
  }

  // 터치 드래그 중
  if (dragging && touches.length > 0) {
    let tx = touches[0].x;
    let ty = touches[0].y;

    let angle = Math.atan2(ty - redSquare.position.y, tx - redSquare.position.x);
    Body.setAngle(redSquare, angle);
    angularVelocity = angle - lastAngle;

    let targetPos = { x: tx - dragOffset.x, y: ty - dragOffset.y };
    let moveVec = Vector.sub(targetPos, redSquare.position);
    Body.setVelocity(redSquare, Vector.mult(moveVec, 0.2));

    dragVelocity.x = tx - lastTouch.x;
    dragVelocity.y = ty - lastTouch.y;

    lastTouch.x = tx;
    lastTouch.y = ty;
    lastAngle = angle;
  }

  // 중력 적용
  ifGravity(redSquare);

  // 충돌 후 파티클 생성
  if (pendingSpawn) {
    spawnMiniSquares(redSquare.position.x, redSquare.position.y);
    pendingSpawn = false;
  }
}

// 충돌 후 파티클 생성
function spawnMiniSquares(x, y) {
  let count = Math.floor(random(3, 6));
  for (let i = 0; i < count; i++) {
    let color = random([255, 0]);
    miniW = random(10, 40);
    miniH = random(6, 10);
    let mini = Bodies.rectangle(
      x + random(-w/2, w/2),
      y + random(-w/2, w/2),
      miniW,
      miniH,
      { restitution: 0.5, friction: 0.3 }
    );

    miniSquares.push({ body: mini, color: color });
    Composite.add(engine.world, mini);

    if (miniSquares.length > maxMini) {
      let removed = miniSquares.shift();
      Composite.remove(engine.world, removed.body);
    }
  }
}

function drawSquare(squareW, squareH, body, color) {
  push();
  translate(body.position.x, body.position.y);
  rotate(body.angle);
  fill(color);
  rect(0, 0, squareW, squareH);
  pop();
}

function drawCircle(body, color, r) {
  push();
  translate(body.position.x, body.position.y);
  fill(color);
  noStroke();
  ellipse(0, 0, r * 2);
  pop();
}

// 터치 드래그 시작
function touchStarted() {
  if (touches.length > 0) {
    let tx = touches[0].x;
    let ty = touches[0].y;
    let dx = tx - redSquare.position.x;
    let dy = ty - redSquare.position.y;
    if (abs(dx) < w/2 && abs(dy) < w/2) {
      dragging = true;
      dragOffset.x = dx;
      dragOffset.y = dy;
      Body.setStatic(redSquare, false);
      Body.setVelocity(redSquare, {x:0, y:0});
      dragVelocity = {x:0, y:0};
      angularVelocity = 0;
      lastTouch.x = tx;
      lastTouch.y = ty;
    }
  }
  return false; // 복사 팝업 방지
}

// 터치 종료
function touchEnded() {
  if (dragging) {
    dragging = false;
    Body.setVelocity(redSquare, Vector.mult(dragVelocity, 1));
    Body.setAngularVelocity(redSquare, angularVelocity);
  }
  return false;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// 벽
function createWall(t) {
  Composite.add(engine.world, [
    Bodies.rectangle(0, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width - t / 2, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width / 2, t / 2, width, t, { isStatic: true }),
    Bodies.rectangle(width / 2, height - t / 2, width, t, { isStatic: true })
  ]);
}

// 중력
function ifGravity(body) {
  let dx = circle.position.x - body.position.x;
  let dy = circle.position.y - body.position.y;
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 0 && distance <= gravityRadius) {
    let dir = { x: dx / distance, y: dy / distance };
    Body.applyForce(body, body.position, { x: dir.x * gravityStrength, y: dir.y * gravityStrength });
  }
}
