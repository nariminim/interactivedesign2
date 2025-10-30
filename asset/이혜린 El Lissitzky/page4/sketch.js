// 🔹 Matter.js 기본 구성요소
const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Vector = Matter.Vector;

let engine;
let circle;
let square;
let rects = [];
let arc1, arc2;
let dot;
let isDragging = false;

let minSize = 160;
let currentSize = minSize;
let growRate = 2;
let growing = false;

// 🔸 파티클 관련
let miniSquares = [];
let maxMini = 20;

// 🔸 충돌 쿨다운
let lastCollisionTime = 0;
let collisionCooldown = 300;

// 🔸 충돌 카테고리
let SQUARE_CATEGORY = 0x0001;
let MINI_CATEGORY   = 0x0002;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  // ✅ 모바일 기본 제스처 완전 차단
  canvas.elt.style.touchAction = 'none';
  canvas.elt.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener('touchend', e => e.preventDefault(), { passive: false });

  engine = Engine.create();
  engine.world.gravity.y = 0;

  circle = { x: 400, y: height / 2, r: 200 };

  // 빨간 사각형
  square = Bodies.rectangle(350, height / 2, minSize, minSize, {
    restitution: 0.8,
    frictionAir: 0.05,
    collisionFilter: {
      category: SQUARE_CATEGORY,
      mask: 0xFFFFFFFF & ~MINI_CATEGORY
    }
  });
  Composite.add(engine.world, square);
  Body.rotate(square, PI / 4);

  // 정적 사각형들
  let staticRects = [
    { x:600, y:300, w:320, h:56, angle:-PI/6, color:'#a60909ff' },
    { x:240, y:500, w:150, h:70, angle:-PI/5, color:'#a60909ff' },
    { x:580, y:185, w:120, h:60, angle:PI/5, color:200 },
    { x:580, y:250, w:200, h:30, angle:-PI/4, color:0 },
    { x:550, y:250, w:290, h:10, angle:-PI/4, color:255 },
    { x:160, y:250, w:120, h:60, angle:PI/12, color:'#ffc400ff' },
    { x:100, y:200, w:30, h:36, angle:-PI/6, color:0 },
    { x:540, y:480, w:600, h:18, angle:-PI/10, color:'#ffc400ff' },
    { x:520, y:500, w:800, h:8, angle:-PI/11, color:255 },
    { x:940, y:230, w:240, h:8, angle:-PI/8, color:'#ffc400ff' },
    { x:920, y:260, w:170, h:8, angle:-PI/10, color:255 },
    { x:880, y:230, w:80, h:8, angle:-PI/5, color:0 }
  ];

  staticRects.forEach(r => {
    const body = Bodies.rectangle(r.x, r.y, r.w, r.h, { isStatic:true });
    Body.rotate(body, r.angle);
    rects.push({ body, w:r.w, h:r.h, color:r.color });
    Composite.add(engine.world, body);
  });

  // 랜덤 정적 사각형 추가
  for (let i = 0; i < 6; i++) {
    const x = random(width / 2 + 200, width - 50);
    const y = random(50, height - 200);
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
}

function draw() {
  Engine.update(engine);
  background(235);

  drawSector(500,385,200,100,240,20);
  drawSector(350,310,200,60,80,0);

  rects.forEach(r => drawSquare(r.w, r.h, r.body, r.color));

  drawCircle(circle,'#2c2b31ff',circle.r);
  drawSquare(currentSize,currentSize,square,'#E72727');

  Body.rotate(square, isDragging ? 0.08 : 0.03);

  if (growing && currentSize < 260) {
    let potentialSize = currentSize + growRate;
    let halfDiag = Math.sqrt(2 * Math.pow(potentialSize / 2, 2));
    let toCenter = Vector.sub(square.position, { x: circle.x, y: circle.y });
    let dist = Vector.magnitude(toCenter);
    if (dist + halfDiag >= circle.r) {
      growing = false;
    } else {
      let scale = potentialSize / currentSize;
      Body.scale(square, scale, scale);
      currentSize = potentialSize;
    }
  }

  bounceSquareInsideCircleSmooth();
  updateAndDrawMiniSquares();
  drawTopArcs(490,190,120,'#ffc400ff');
}

function bounceSquareInsideCircleSmooth() {
  let toCenter = Vector.sub(square.position, { x: circle.x, y: circle.y });
  let dist = Vector.magnitude(toCenter);
  let halfDiag = Math.sqrt(2 * Math.pow(currentSize / 2, 2));
  let maxDist = circle.r - halfDiag;

  if (dist > maxDist) {
    let now = millis();
    if (now - lastCollisionTime > collisionCooldown) {
      lastCollisionTime = now;
      let overlap = dist - maxDist;
      let norm = Vector.normalise(toCenter);
      let newPos = Vector.sub(square.position, Vector.mult(norm, overlap));
      Body.setPosition(square, newPos);

      let v = square.velocity;
      let dot = v.x * norm.x + v.y * norm.y;
      Body.setVelocity(square, {
        x: (v.x - 2 * dot * norm.x) * 0.9,
        y: (v.y - 2 * dot * norm.y) * 0.9
      });

      Body.setAngularVelocity(square, -square.angularVelocity * 0.7);
      spawnMiniSquares(square.position.x - norm.x * currentSize / 2,
                       square.position.y - norm.y * currentSize / 2);
    }
  }
}

function spawnMiniSquares(x, y) {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const w = random(5, 20);
    const h = random(15, 50);
    const angle = random(TWO_PI);
    const speed = random(2, 5);
    const color = random(['#000', '#777', '#FFF']);
    const body = Bodies.rectangle(x, y, w, h, {
      restitution: 0.8,
      frictionAir: 0.02,
      collisionFilter: {
        category: MINI_CATEGORY,
        mask: 0xFFFFFFFF & ~SQUARE_CATEGORY
      }
    });
    Body.setVelocity(body, { x: cos(angle) * speed, y: sin(angle) * speed });
    Composite.add(engine.world, body);
    miniSquares.push({ body, color, w, h });
  }
  while (miniSquares.length > maxMini) {
    let old = miniSquares.shift();
    Composite.remove(engine.world, old.body);
  }
}

function updateAndDrawMiniSquares() {
  for (let i = miniSquares.length - 1; i >= 0; i--) {
    const sq = miniSquares[i];
    drawSquare(sq.w, sq.h, sq.body, sq.color);
    if (sq.body.position.x < -50 || sq.body.position.x > width + 50 ||
        sq.body.position.y < -50 || sq.body.position.y > height + 50) {
      Composite.remove(engine.world, sq.body);
      miniSquares.splice(i, 1);
    }
  }
}

// ✅ 터치 전용 이벤트 (완전한 모바일 대응)
function touchStarted() {
  if (touches.length > 0) {
    const tx = touches[0].x;
    const ty = touches[0].y;
    if (dist(tx, ty, square.position.x, square.position.y) < currentSize) {
      isDragging = true;
    }
    growing = true;
  }
  return false;
}

function touchMoved() {
  if (isDragging && touches.length > 0) {
    const tx = touches[0].x;
    const ty = touches[0].y;
    Body.setVelocity(square, { x: (tx - square.position.x) * 0.2, y: (ty - square.position.y) * 0.2 });
  }
  return false;
}

function touchEnded() {
  isDragging = false;
  growing = false;
  let scale = minSize / currentSize;
  Body.scale(square, scale, scale);
  currentSize = minSize;
  return false;
}

// ======= 그래픽 함수 =======
function drawCircle(body, color, r) { push(); translate(body.x, body.y); fill(color); noStroke(); ellipse(0, 8, r * 2); pop(); }
function drawSquare(w, h, body, color) { push(); translate(body.position.x, body.position.y); rotate(body.angle); rectMode(CENTER); fill(color); rect(0, 0, w, h); pop(); }
function drawSector(x, y, r, startA, endA, col) { fill(col); noStroke(); beginShape(); vertex(x, y); let steps = 30; for (let i = 0; i <= steps; i++) { let angle = startA + i / steps * ((endA - startA + TWO_PI) % TWO_PI); vertex(x + r * cos(angle), y + r * sin(angle)); } endShape(CLOSE); }
function drawTopArcs(x, y, r, col) { push(); stroke(col); strokeWeight(8); noFill(); let arcRadius = r; let spacing = arcRadius / 8; let arcX = x; let arcY = y; let arcAngle = -9; arc1 = arc(arcX - spacing - 10, arcY - 10, arcRadius, arcRadius, arcAngle, PI + arcAngle); arc2 = arc(arcX + spacing + 10, arcY + 10, arcRadius, arcRadius, PI + arcAngle, arcAngle); noStroke(); fill(0); dot = ellipse(arcX, arcY, r / 5); pop(); }

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
