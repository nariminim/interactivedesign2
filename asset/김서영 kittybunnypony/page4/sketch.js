/**
 * Falling Pattern
 * 파란 사각형, 빨간 원, 초록 사각형이 규칙적으로 떨어지며 쌓임
 */

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;
let ground;
let elements = [];

// 색상
const blueColor = '#004AAD';
const redColor = '#DD0000';
const greenColor = '#006400';
const bgColor = '#FFFFFF';

// 도형 크기
const rectWidth = 40;
const rectHeight = 120;
const circleRadius = 20;
const smallRectWidth = 30;
const smallRectHeight = 60;

let spawnTimer = 0;
let spawnInterval = 20; // 프레임마다 생성 간격

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  engine = Engine.create();
  engine.world.gravity.y = 1;

  // 바닥 생성
  ground = Bodies.rectangle(width / 2, height - 10, width * 2, 20, {
    isStatic: true
  });
  Composite.add(engine.world, ground);

  // 초기 패턴 생성
  createInitialPattern();
}

function draw() {
  background(bgColor);
  Engine.update(engine);

  // 지속적으로 도형 생성
  spawnTimer++;
  if (spawnTimer > spawnInterval) {
    createPattern();
    spawnTimer = 0;
  }

  // 모든 도형 그리기
  for (let i = elements.length - 1; i >= 0; i--) {
    let el = elements[i];
    el.display();

    // 화면 밖으로 나가거나 너무 많이 쌓이면 제거
    if (el.isOffScreen() || elements.length > 200) {
      el.remove();
      elements.splice(i, 1);
    }
  }

  // 바닥 그리기 (안 보이게)
  // push();
  // fill(200);
  // noStroke();
  // rect(width / 2, height - 10, width * 2, 20);
  // pop();
}

function createInitialPattern() {
  // 초기 몇 개의 패턴 생성
  for (let i = 0; i < 3; i++) {
    let xOffset = i * 150;
    createPatternAt(width / 4 + xOffset, -200 - i * 300);
  }
}

function createPattern() {
  let x = random(100, width - 100);
  createPatternAt(x, -100);
}

function createPatternAt(x, startY) {
  // 패턴: 파란 사각형 - 빨간 원 - 초록 사각형

  // 파란 사각형 (큰)
  elements.push(new Box(x, startY, rectWidth, rectHeight, blueColor, 0.3, 0.5));

  // 빨간 원
  elements.push(new Ball(x, startY + rectHeight / 2 + circleRadius + 10, circleRadius, redColor, 0.5, 0.3));

  // 초록 사각형 (작은)
  elements.push(new Box(x, startY + rectHeight / 2 + circleRadius * 2 + smallRectHeight / 2 + 20, smallRectWidth, smallRectHeight, greenColor, 0.3, 0.5));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 바닥 재생성
  Composite.remove(engine.world, ground);
  ground = Bodies.rectangle(width / 2, height - 10, width * 2, 20, {
    isStatic: true
  });
  Composite.add(engine.world, ground);
}

// --- Ball 클래스 (원) ---
class Ball {
  constructor(x, y, r, col, rest, fric) {
    this.r = r;
    this.c = color(col);

    let options = {
      restitution: rest,
      friction: fric,
      density: 0.001
    };
    this.body = Bodies.circle(x, y, this.r, options);
    Composite.add(engine.world, this.body);
  }

  display() {
    let pos = this.body.position;
    let angle = this.body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    fill(this.c);
    noStroke();
    ellipse(0, 0, this.r * 2);
    pop();
  }

  isOffScreen() {
    let pos = this.body.position;
    return pos.y > height + 100 || pos.x < -100 || pos.x > width + 100;
  }

  remove() {
    Composite.remove(engine.world, this.body);
  }
}

// --- Box 클래스 (사각형) ---
class Box {
  constructor(x, y, w, h, col, rest, fric) {
    this.w = w;
    this.h = h;
    this.c = color(col);

    let options = {
      restitution: rest,
      friction: fric,
      density: 0.001
    };
    this.body = Bodies.rectangle(x, y, this.w, this.h, options);
    Composite.add(engine.world, this.body);
  }

  display() {
    let pos = this.body.position;
    let angle = this.body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    fill(this.c);
    noStroke();
    rect(0, 0, this.w, this.h);
    pop();
  }

  isOffScreen() {
    let pos = this.body.position;
    return pos.y > height + 100 || pos.x < -100 || pos.x > width + 100;
  }

  remove() {
    Composite.remove(engine.world, this.body);
  }
}