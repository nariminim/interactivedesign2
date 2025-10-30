const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;
let bigBody, smallBody;

let tipX = 650;
let tipY = 350;
let maxRadius = 200;
let minRadius = 100;
let smallRadius = minRadius;

let startAngleDeg = 190;
let centerAngleDeg = 110;

let startAngle = startAngleDeg * Math.PI / 180;
let endAngleDeg = startAngleDeg + centerAngleDeg;
if (endAngleDeg > 360) endAngleDeg -= 360;
let endAngle = endAngleDeg * Math.PI / 180;

let growRate = 2;
let growing = false;

let randomRects = [];
let boxes = [];
const particleCount = 1;
let lastTouchX = tipX;
let lastTouchY = tipY;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.style('touch-action', 'none'); // ✅ 브라우저 터치 기본 제스처 비활성화
  canvas.elt.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.elt.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.elt.addEventListener('touchend', handleTouchEnd, { passive: false });

  engine = Engine.create();
  engine.world.gravity.y = 0;

  bigBody = createTipSectorBody(tipX, tipY, maxRadius, startAngle, endAngle, true);
  smallBody = createTipSectorBody(tipX, tipY, smallRadius, startAngle, endAngle, true);
  Composite.add(engine.world, [bigBody, smallBody]);

  for (let i = 0; i < 4; i++) {
    let colors = [color(255), color(0), color('#E72727')];
    randomRects.push({
      x: random(width / 2, width / 2 + 150),
      y: random(height / 2, height / 2 + 80),
      w: random(10, 30),
      h: random(30, 100),
      angle: random(-PI / 4, 0),
      col: random(colors)
    });
  }
  for (let i = 0; i < 6; i++) {
    let colors = [color(255), color(0), color('#E72727')];
    randomRects.push({
      x: random(50, width - 100),
      y: random(50, 200),
      w: random(8, 20),
      h: random(30, 200),
      angle: random(0, 3),
      col: random(colors)
    });
  }
}

function draw() {
  background(235);
  Engine.update(engine);
  createWall(40);

  // ---------------- 단순 회전 직사각형들 ----------------
  push();
  translate(700, height / 2 + 140);
  rotate(radians(-10));
  rectMode(CENTER);
  fill(255);
  rect(0, 0, 60, 200);
  pop();

  push();
  translate(740, height / 2 + 130);
  rotate(radians(-10));
  rectMode(CENTER);
  fill(0);
  rect(0, 0, 20, 200);
  pop();

  push();
  translate(650, height / 2 + 20);
  rotate(radians(0));
  rectMode(CENTER);
  fill('#777777');
  rect(0, 0, 60, 200);
  pop();

  push();
  translate(620, height / 2 - 50);
  rotate(radians(10));
  rectMode(CENTER);
  fill('#ead9a4ff');
  rect(0, 0, 100, 60);
  pop();

  push();
  translate(620, height / 2 - 80);
  rotate(radians(20));
  rectMode(CENTER);
  fill("#E72727");
  rect(0, 0, 100, 60);
  pop();

  push();
  translate(600, height / 2 + 140);
  rotate(radians(-5));
  rectMode(CENTER);
  fill('#ead9a4ff');
  rect(0, 0, 20, 200);
  pop();

  push();
  translate(590, height / 2 + 150);
  rotate(radians(0));
  rectMode(CENTER);
  fill(0);
  rect(0, 0, 20, 200);
  pop();

  for (let r of randomRects) {
    push();
    translate(r.x, r.y);
    rotate(r.angle);
    rectMode(CENTER);
    fill(r.col);
    noStroke();
    rect(0, 0, r.w, r.h);
    pop();
  }

  // 부채꼴 성장
  if (growing && smallRadius < maxRadius) {
    smallRadius += growRate;
    if (smallRadius > maxRadius) smallRadius = maxRadius;
    updateTipSectorBody(smallBody, tipX, tipY, smallRadius, startAngle, endAngle);
  }

  drawSector(tipX, tipY, maxRadius, startAngle, endAngle, color(0));
  drawSector(tipX, tipY, smallRadius, startAngle, endAngle, color("#E72727"));

  // 터치 중일 때 particle 생성
  if (growing) {
    particle();
  }

  // 박스 렌더링
  for (let i = boxes.length - 1; i >= 0; i--) {
    let b = boxes[i];

    if (b.white) Body.applyForce(b.white, b.white.position, { x: 0, y: 0.001 });
    if (b.black) Body.applyForce(b.black, b.black.position, { x: 0, y: 0.001 });

    if (b.white) {
      push();
      translate(b.white.position.x, b.white.position.y);
      rotate(b.white.angle);
      rectMode(CENTER);
      fill(255);
      stroke(0);
      let hWhite = b.white.bounds.max.y - b.white.bounds.min.y;
      rect(0, 0, 10, hWhite);
      pop();
    }

    if (b.black) {
      push();
      translate(b.black.position.x, b.black.position.y);
      rotate(b.black.angle);
      rectMode(CENTER);
      fill(0);
      stroke(0);
      let hBlack = b.black.bounds.max.y - b.black.bounds.min.y;
      rect(0, 0, 5, hBlack);
      pop();
    }
  }
}

// ---------------- particle ----------------
function particle() {
  for (let i = 0; i < particleCount; i++) {
    let h = random(10, 40);
    let whiteBox = Bodies.rectangle(lastTouchX, lastTouchY, 10, h, {
      restitution: 0.3, friction: 0.1, frictionAir: 0.02, isStatic: false, angle: 0, inertia: Infinity
    });
    let blackBox = Bodies.rectangle(lastTouchX, lastTouchY, 5, h, {
      restitution: 0.3, friction: 0.1, frictionAir: 0.02, isStatic: false, angle: 0, inertia: Infinity
    });
    Composite.add(engine.world, [whiteBox, blackBox]);
    boxes.push({ white: whiteBox, black: blackBox });
    if (boxes.length > 60) {
      let removed = boxes.splice(0, boxes.length - 60);
      for (let r of removed) {
        if (r.white) Composite.remove(engine.world, r.white);
        if (r.black) Composite.remove(engine.world, r.black);
      }
    }
  }
}

// ---------------- announce ----------------
function announce() {
  let stepDeg = 10;
  let start = startAngleDeg;
  let end = startAngleDeg + centerAngleDeg;
  if (end > 360) end -= 360;

  for (let a = start; a <= end; a += stepDeg) {
    let rad = a * Math.PI / 180;
    let x = tipX + maxRadius * cos(rad);
    let y = tipY + maxRadius * sin(rad);

    let grayBox = Bodies.rectangle(x, y, 10, 30, {
      angle: rad, isStatic: false, restitution: 0.3, friction: 0.1, frictionAir: 0.02
    });

    Composite.add(engine.world, grayBox);
    boxes.push({ white: grayBox, black: null });

    let forceMagnitude = 0.01;
    let dirX = x - tipX;
    let dirY = y - tipY;
    let len = Math.sqrt(dirX * dirX + dirY * dirY);
    dirX /= len;
    dirY /= len;

    Body.applyForce(grayBox, grayBox.position, {
      x: dirX * forceMagnitude, y: dirY * forceMagnitude
    });
  }
}

// ---------------- tip sector ----------------
function createTipSectorBody(tipX, tipY, r, startA, endA, isStatic = true) {
  let steps = 30;
  let points = [{ x: 0, y: 0 }];
  for (let i = 0; i <= steps; i++) {
    let angle = startA + i / steps * ((endA - startA + 2 * Math.PI) % (2 * Math.PI));
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return Bodies.fromVertices(tipX, tipY, [points], { isStatic });
}

function updateTipSectorBody(body, tipX, tipY, r, startA, endA) {
  let steps = 30;
  let points = [{ x: 0, y: 0 }];
  for (let i = 0; i <= steps; i++) {
    let angle = startA + i / steps * ((endA - startA + 2 * Math.PI) % (2 * Math.PI));
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  Matter.Body.setVertices(body, points.map(p => ({ x: p.x + tipX - body.position.x, y: p.y + tipY - body.position.y })));
  Matter.Body.setPosition(body, { x: tipX, y: tipY });
}

function drawSector(x, y, r, startA, endA, col) {
  fill(col);
  noStroke();
  beginShape();
  vertex(x, y);
  let steps = 30;
  for (let i = 0; i <= steps; i++) {
    let angle = startA + i / steps * ((endA - startA + 2 * Math.PI) % (2 * Math.PI));
    vertex(x + r * cos(angle), y + r * sin(angle));
  }
  endShape(CLOSE);
}

function createWall(t) {
  Composite.add(engine.world, [
    Bodies.rectangle(0, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width - t / 2, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width / 2, t / 2, width, t, { isStatic: true }),
    Bodies.rectangle(width / 2, height - t / 2, width, t, { isStatic: true })
  ]);
}

// ✅ 터치 전용
function handleTouchStart(e) {
  e.preventDefault();
  growing = true;
  const t = e.touches[0];
  lastTouchX = t.clientX;
  lastTouchY = t.clientY;
}

function handleTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  lastTouchX = t.clientX;
  lastTouchY = t.clientY;
}

function handleTouchEnd(e) {
  e.preventDefault();
  growing = false;
  smallRadius = minRadius;
  updateTipSectorBody(smallBody, tipX, tipY, smallRadius, startAngle, endAngle);
  announce();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
