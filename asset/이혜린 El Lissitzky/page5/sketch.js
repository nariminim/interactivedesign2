const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Vector = Matter.Vector;

let engine;
let redSquare;
let squareSize = 160;

let smallSquares = [];
let smallW = 50;
let smallH = 50;

let isDragging = false;
let prevPos;
let started = false;

let miniSquares = [];
let maxMini = 20;
let pendingSpawn = false;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = 'none';
  canvas.elt.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener('touchend', e => e.preventDefault(), { passive: false });

  engine = Engine.create();

  redSquare = Bodies.rectangle(width / 2, height / 2, squareSize, squareSize, {
    restitution: 0.5,
    friction: 0.1,
    frictionAir: 0.02,
    mass: 5
  });
  Composite.add(engine.world, redSquare);
  prevPos = { x: redSquare.position.x, y: redSquare.position.y };

  createWalls(40);

  // 작은 사각형 생성
  for (let x = smallW / 2; x < width; x += smallW) {
    for (let y = smallH / 2; y < height; y += smallH) {
      if (
        x > redSquare.position.x - squareSize / 2 &&
        x < redSquare.position.x + squareSize / 2 &&
        y > redSquare.position.y - squareSize / 2 &&
        y < redSquare.position.y + squareSize / 2
      ) continue;

      let s = Bodies.rectangle(x, y, smallW, smallH, {
        isStatic: false,
        restitution: 0.1,
        friction: 0.05,
        mass: 2
      });
      smallSquares.push(s);
      Composite.add(engine.world, s);
    }
  }

  // 충돌 이벤트
  Matter.Events.on(engine, 'collisionStart', function(event) {
    if (!started) return;
    let pairs = event.pairs;
    for (let pair of pairs) {
      let other = pair.bodyA === redSquare ? pair.bodyB : (pair.bodyB === redSquare ? pair.bodyA : null);
      if (other && !pendingSpawn) {
        if (smallSquares.includes(other)) {
          pendingSpawn = true;
        }
      }
    }
  });
}

function draw() {
  Engine.update(engine);
  background(0);

  let currentPos = { x: redSquare.position.x, y: redSquare.position.y };

  if (started) {
    if (isDragging) {
      // 모바일 터치 또는 마우스
      let target = touches.length > 0 ? touches[0] : { x: mouseX, y: mouseY };
      Body.setPosition(redSquare, { x: target.x, y: target.y });
      Body.setAngularVelocity(redSquare, 0.05);

      let velocity = Vector.sub(currentPos, prevPos);
      for (let s of smallSquares) {
        let distance = Vector.magnitude(Vector.sub(s.position, redSquare.position));
        if (distance < squareSize / 2 + 50) {
          let force = Vector.mult(velocity, 0.0001);
          Body.applyForce(s, s.position, force);
        }
      }
    } else {
      Body.setAngularVelocity(redSquare, 0);
      Body.setVelocity(redSquare, { x: 0, y: 0 });
    }
  }

  drawSquare(squareSize, squareSize, redSquare, '#E72727');

  for (let i = smallSquares.length - 1; i >= 0; i--) {
    let s = smallSquares[i];
    drawSquare(smallW, smallH, s, '#FFFFFF');

    if (
      s.position.x < -50 || s.position.x > width + 50 ||
      s.position.y < -50 || s.position.y > height + 50
    ) {
      Composite.remove(engine.world, s);
      smallSquares.splice(i, 1);
    }
  }

  if (started && pendingSpawn) {
    spawnMiniSquares(redSquare.position.x, redSquare.position.y);
    pendingSpawn = false;
  }

  for (let i = miniSquares.length - 1; i >= 0; i--) {
    let sq = miniSquares[i];
    drawSquare(sq.body.w, sq.body.h, sq.body, sq.color);

    if (
      sq.body.position.x < -50 || sq.body.position.x > width + 50 ||
      sq.body.position.y < -50 || sq.body.position.y > height + 50
    ) {
      Composite.remove(engine.world, sq.body);
      miniSquares.splice(i, 1);
    }
  }

  prevPos = { x: redSquare.position.x, y: redSquare.position.y };
}

function drawSquare(w, h, body, color) {
  push();
  translate(body.position.x, body.position.y);
  rotate(body.angle);
  fill(color);
  noStroke();
  rectMode(CENTER);
  rect(0, 0, w, h);
  pop();
}

function spawnMiniSquares(x, y) {
  let count = Math.floor(random(3, 6));
  for (let i = 0; i < count; i++) {
    let color = random(255);
    let w = random(10, 50);
    let h = random(10, 50);
    let mini = Bodies.rectangle(
      x + random(-squareSize/2, squareSize/2),
      y + random(-squareSize/2, squareSize/2),
      w,
      h,
      { restitution: 0.5, friction: 0.3 }
    );
    mini.w = w;
    mini.h = h;
    miniSquares.push({ body: mini, color: color });
    Composite.add(engine.world, mini);

    if (miniSquares.length > maxMini) {
      let removed = miniSquares.shift();
      Composite.remove(engine.world, removed.body);
    }
  }
}

// 마우스/터치 이벤트
function mousePressed() { started = true; isDragging = true; }
function mouseReleased() { isDragging = false; }
function touchStarted() { started = true; isDragging = true; return false; }
function touchMoved() { return false; } // 이벤트 전파 차단
function touchEnded() { isDragging = false; return false; }

function createWalls(t) {
  Composite.add(engine.world, [
    Bodies.rectangle(width / 2, 0, width, t, { isStatic: true }),
    Bodies.rectangle(width / 2, height, width, t, { isStatic: true })
  ]);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
