/**
 * Page 1: 체크 패턴 - 균일한 가로/세로 직사각형 교차
 * 일정한 간격으로 가로 긴 직사각형과 세로 긴 직사각형이 교차
 */

// Matter.js 모듈
const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const MatterBody = Matter.Body;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine;
let world;
let elements = []; // 직사각형 배열
let boundaries = [];
let mouseConstraint;
let canvas;

// 패턴 설정
let spacing = 50; // 간격
let rectThickness = 8; // 직사각형 두께
let rectLength = 100; // 직사각형 길이
let currentBackgroundColor = 0; // 검은색 배경

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0; // 중력 끔

  // 마우스 인터랙션
  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  let options = {
    mouse: canvasMouse,
    constraint: {
      stiffness: 0,
      render: {
        visible: false
      }
    }
  };
  mouseConstraint = MouseConstraint.create(engine, options);
  Composite.add(world, mouseConstraint);

  createCheckPattern();
  addBoundaries();
}

function createCheckPattern() {
  elements = []; // 초기화

  let cols = Math.ceil(width / spacing) + 2;
  let rows = Math.ceil(height / spacing) + 2;

  // 세로 긴 직사각형 생성 (열)
  for (let col = 0; col <= cols; col++) {
    let x = col * spacing;

    for (let row = 0; row <= rows; row++) {
      let y = row * spacing;

      let vRect = Bodies.rectangle(x, y, rectThickness, rectLength, {
        restitution: 0.5,
        friction: 0.1,
        frictionAir: 0.03,
        render: {
          fillStyle: '#F5F5DC'
        }
      });

      vRect.width = rectThickness;
      vRect.height = rectLength;

      elements.push(vRect);
      Composite.add(world, vRect);
    }
  }

  // 가로 긴 직사각형 생성 (행)
  for (let row = 0; row <= rows; row++) {
    let y = row * spacing;

    for (let col = 0; col <= cols; col++) {
      let x = col * spacing;

      let hRect = Bodies.rectangle(x, y, rectLength, rectThickness, {
        restitution: 0.5,
        friction: 0.1,
        frictionAir: 0.03,
        render: {
          fillStyle: '#F5F5DC'
        }
      });

      hRect.width = rectLength;
      hRect.height = rectThickness;

      elements.push(hRect);
      Composite.add(world, hRect);
    }
  }
}

function draw() {
  background(currentBackgroundColor);
  Engine.update(engine);

  // 모든 요소 그리기
  for (let body of elements) {
    let pos = body.position;
    let angle = body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    fill(body.render.fillStyle);
    noStroke();
    rect(0, 0, body.width, body.height);
    pop();
  }

  // 마우스 인터랙션
  applyRepulsion();
}

// 마우스/터치로 밀어내기
function applyRepulsion() {
  let pointerX = mouseX;
  let pointerY = mouseY;

  if (touches.length > 0) {
    pointerX = touches[0].x;
    pointerY = touches[0].y;
  }

  if (mouseIsPressed || touches.length > 0) {
    let forceMagnitude = 0.02;
    let influenceRadius = 120;

    elements.forEach(body => {
      if (mouseConstraint.body === body) return;

      let d = dist(pointerX, pointerY, body.position.x, body.position.y);
      if (d < influenceRadius) {
        let force = createVector(body.position.x - pointerX, body.position.y - pointerY);
        if (force.magSq() > 1) force.normalize();
        let strength = forceMagnitude * (1 - d / influenceRadius);
        force.mult(strength);

        MatterBody.applyForce(body, body.position, {
          x: force.x,
          y: force.y
        });
      }
    });
  }
}

function addBoundaries() {
  let thickness = 100;
  boundaries.push(Bodies.rectangle(width / 2, height + thickness / 2, width * 2, thickness, {
    isStatic: true
  }));
  boundaries.push(Bodies.rectangle(width / 2, -thickness / 2, width * 2, thickness, {
    isStatic: true
  }));
  boundaries.push(Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, {
    isStatic: true
  }));
  boundaries.push(Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, {
    isStatic: true
  }));
  Composite.add(world, boundaries);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 기존 요소들 제거
  Composite.remove(world, boundaries);
  boundaries = [];

  elements.forEach(body => {
    Composite.remove(world, body);
  });

  // 재생성
  createCheckPattern();
  addBoundaries();

  if (mouseConstraint.mouse) {
    Mouse.setScale(mouseConstraint.mouse, {
      x: 1,
      y: 1
    });
    Mouse.setOffset(mouseConstraint.mouse, {
      x: 0,
      y: 0
    });
  }
}

// p5 이벤트 기본 동작 방지
function mouseDragged() {
  return false;
}

function touchMoved() {
  return false;
}