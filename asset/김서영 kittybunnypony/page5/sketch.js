/**
 * Page 5: Moving Shapes (Frame 7 + sketch05.js)
 */
const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const MatterBody = Matter.Body;

let engine;
let world;
let elements = []; // 떨어지는 원들
let floatingBoxes = []; // 둥둥 떠다니는 사각형들
let ground;
let canvas;

// 색상 설정
const greenColor = '#006400';
const orangeColor = '#DD4400';
const bgColor = '#C8D8E4';

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.mouseMoved(p5PointerMove);
  canvas.touchMoved(p5PointerMove);

  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0.5; // 중력 설정

  // 둥둥 떠다니는 사각형 2~3개 생성
  floatingBoxes.push(new FloatingBox(150, height / 3, 180, 400));
  floatingBoxes.push(new FloatingBox(width - 200, height / 4, 180, 250));

  // 바닥 경계 추가
  ground = Bodies.rectangle(width / 2, height + 25, width * 2, 50, {
    isStatic: true
  });
  Composite.add(world, ground);
}

function draw() {
  background(bgColor);
  Engine.update(engine);

  // 둥둥 떠다니는 사각형들 업데이트 및 그리기
  for (let box of floatingBoxes) {
    box.update();
    box.display();
  }

  // 떨어지는 원들 그리기 및 관리
  for (let i = elements.length - 1; i >= 0; i--) {
    let el = elements[i];
    el.display();

    // 바닥에 닿거나 너무 쌓이면 제거
    if (el.shouldRemove()) {
      el.remove();
      elements.splice(i, 1);
    }
  }
}

// 마우스/터치 이동 시 원 생성
function p5PointerMove(event) {
  let x = mouseX;
  let y = mouseY;
  if (touches.length > 0) {
    x = touches[0].x;
    y = touches[0].y;
  }

  if (x > 0 && x < width && y > 0 && y < height) {
    // 초록색 원 생성 (3프레임마다)
    if (frameCount % 3 === 0) {
      elements.push(new Ball(x, y, random(30, 60)));
    }
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 바닥 위치 재설정
  Composite.remove(world, ground);
  ground = Bodies.rectangle(width / 2, height + 25, width * 2, 50, {
    isStatic: true
  });
  Composite.add(world, ground);
}

// --- Ball 클래스 (떨어지는 초록색 원) ---
class Ball {
  constructor(x, y, r) {
    this.r = r;
    this.c = color(greenColor);
    this.creationTime = frameCount;

    let options = {
      restitution: 0.3,
      friction: 0.1,
      density: 0.001
    };
    this.body = Bodies.circle(x, y, this.r, options);
    Composite.add(world, this.body);
  }

  display() {
    let pos = this.body.position;
    push();
    translate(pos.x, pos.y);
    fill(this.c);
    stroke(0);
    strokeWeight(3);
    ellipse(0, 0, this.r * 2);
    pop();
  }

  shouldRemove() {
    let pos = this.body.position;
    let vel = this.body.velocity;

    // 바닥 근처에서 거의 멈춘 경우 (쌓임)
    let nearGround = pos.y > height - 100;
    let almostStopped = abs(vel.x) < 0.5 && abs(vel.y) < 0.5;
    let existedLongEnough = frameCount - this.creationTime > 120; // 2초 정도

    // 화면 밖으로 나간 경우
    let offScreen = pos.y > height + 50 || pos.x < -50 || pos.x > width + 50;

    return (nearGround && almostStopped && existedLongEnough) || offScreen;
  }

  remove() {
    Composite.remove(world, this.body);
  }
}

// --- FloatingBox 클래스 (둥둥 떠다니는 사각형) ---
class FloatingBox {
  constructor(x, y, w, h) {
    this.initialX = x;
    this.initialY = y;
    this.w = w;
    this.h = h;
    this.c = color(orangeColor);

    // 떠다니는 움직임을 위한 변수
    this.offsetX = random(TWO_PI);
    this.offsetY = random(TWO_PI);
    this.speedX = random(0.015, 0.025);
    this.speedY = random(0.02, 0.04);
    this.amplitudeX = random(80, 150);
    this.amplitudeY = random(20, 40);

    // Matter.js 바디 생성 (물리 충돌용)
    this.body = Bodies.rectangle(x, y, w, h, {
      isStatic: false,
      density: 0.0005, // 매우 가벼움
      restitution: 0.6,
      friction: 0.1,
      frictionAir: 0.01
    });
    Composite.add(world, this.body);
  }

  update() {
    this.offsetX += this.speedX;
    this.offsetY += this.speedY;

    // sin 함수로 부드러운 움직임 계산
    let targetX = this.initialX + sin(this.offsetX) * this.amplitudeX;
    let targetY = this.initialY + sin(this.offsetY) * this.amplitudeY;

    // 부드럽게 목표 위치로 이동 (물리 엔진 활용)
    let currentX = this.body.position.x;
    let currentY = this.body.position.y;

    let forceX = (targetX - currentX) * 0.001;
    let forceY = (targetY - currentY) * 0.001;

    MatterBody.applyForce(this.body, this.body.position, {
      x: forceX,
      y: forceY
    });

    // 속도 제한
    if (this.body.velocity.x > 2) MatterBody.setVelocity(this.body, {
      x: 2,
      y: this.body.velocity.y
    });
    if (this.body.velocity.x < -2) MatterBody.setVelocity(this.body, {
      x: -2,
      y: this.body.velocity.y
    });
    if (this.body.velocity.y > 2) MatterBody.setVelocity(this.body, {
      x: this.body.velocity.x,
      y: 2
    });
    if (this.body.velocity.y < -2) MatterBody.setVelocity(this.body, {
      x: this.body.velocity.x,
      y: -2
    });
  }

  display() {
    let pos = this.body.position;
    let angle = this.body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    fill(this.c);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, this.w, this.h);
    pop();
  }
}