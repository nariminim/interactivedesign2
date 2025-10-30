/**
 * Page 3: humushrooms (Frame 6)
 *
 * Constraint를 사용해 여러 바디를 연결하고, 마우스로 분리/결합 시도
 */

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const MatterBody = Matter.Body; // 이름 변경
const Constraint = Matter.Constraint; // Constraint 모듈 추가
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine;
let world;
let mushrooms = []; // 버섯 객체들을 담을 배열
let boundaries = [];
let mouseConstraint;
let canvas;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  // --- Matter.js 설정 ---
  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 1; // 일반 중력

  // 마우스 인터랙션
  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  let options = {
    mouse: canvasMouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false
      }
    }
  };
  mouseConstraint = MouseConstraint.create(engine, options);
  Composite.add(world, mouseConstraint);

  // 화면 경계 (바닥만)
  addBoundaries();

  // --- 버섯 생성 ---
  createMushroom(width / 2 - 150, height / 2);
  createMushroom(width / 2 + 150, height / 2);
  createMushroom(width / 2 + 150, height / 2);
}

// 버섯 생성 함수
function createMushroom(x, y) {
  let group = MatterBody.nextGroup(true); // 파트끼리 충돌 안하게

  // 1. 머리 (Cap) - 반원 모양을 만들기 위해 polygon 사용
  let capRadius = 60;
  let capSides = 10; // 반원을 10개 세그먼트로 근사
  let capVertices = [];
  for (let i = 0; i < capSides; i++) {
    let angle = PI / (capSides - 1) * i + PI; // 180도 (위쪽 반원)
    capVertices.push({
      x: cos(angle) * capRadius,
      y: sin(angle) * capRadius
    });
  }
  let cap = Bodies.polygon(x, y - 30, capSides, capRadius, {
    vertices: capVertices,
    collisionFilter: {
      group: group
    },
    render: {
      fillStyle: '#E74C3C',
      strokeStyle: '#C0392B'
    } // 빨간색
  });

  // 2. 기둥 (Stem) - 사각형
  let stemWidth = 30;
  let stemHeight = 60;
  let stem = Bodies.rectangle(x, y + (stemHeight / 2) - 30, stemWidth, stemHeight, {
    collisionFilter: {
      group: group
    },
    chamfer: {
      radius: 2
    },
    render: {
      fillStyle: '#F5E9D9',
      strokeStyle: '#D8C8B4'
    } // 아이보리색
  });

  // 3. 뿌리 (Base) - 사다리꼴 (polygon)
  let baseWidth = 40;
  let baseHeight = 20;
  let base = Bodies.trapezoid(x, y + stemHeight - 30 + baseHeight / 2, baseWidth, baseHeight, 0.3, {
    collisionFilter: {
      group: group
    },
    render: {
      fillStyle: '#F5E9D9',
      strokeStyle: '#D8C8B4'
    }
  });

  // 4. Constraint로 연결
  let options = {
    stiffness: 0.4, // 뻣뻣하게 연결
    length: 0,
    render: {
      visible: false
    }
  };

  // 머리 <-> 기둥
  let constraintCapStem = Constraint.create({
    ...options,
    bodyA: cap,
    bodyB: stem,
    pointA: {
      x: 0,
      y: capRadius * 0.5
    }, // 머리 아랫부분
    pointB: {
      x: 0,
      y: -stemHeight / 2
    } // 기둥 윗부분
  });

  // 기둥 <-> 뿌리
  let constraintStemBase = Constraint.create({
    ...options,
    bodyA: stem,
    bodyB: base,
    pointA: {
      x: 0,
      y: stemHeight / 2
    }, // 기둥 아랫부분
    pointB: {
      x: 0,
      y: -baseHeight / 2
    } // 뿌리 윗부분
  });

  // 하나의 버섯 객체로 묶기 (렌더링 편의를 위해)
  let mushroom = {
    cap: cap,
    stem: stem,
    base: base,
    constraints: [constraintCapStem, constraintStemBase]
  };
  mushrooms.push(mushroom);

  // 월드에 추가
  Composite.add(world, [cap, stem, base, constraintCapStem, constraintStemBase]);
}

function draw() {
  background(255); // 흰색 배경
  Engine.update(engine);

  // --- p5.js로 버섯 그리기 ---
  for (let mushroom of mushrooms) {
    // 각 파트 그리기
    drawBody(mushroom.cap);
    drawBody(mushroom.stem);
    drawBody(mushroom.base);

    // 버섯 갓 점 그리기 (물리와 무관)
    drawMushroomDots(mushroom.cap);

    // 버섯 뿌리 선 그리기 (물리와 무관)
    drawMushroomBaseLines(mushroom.base);
  }
}

// Matter 바디를 p5.js 도형으로 그리는 함수
function drawBody(body) {
  push();
  fill(body.render.fillStyle);
  stroke(body.render.strokeStyle);
  strokeWeight(2);

  // 
  beginShape();
  for (let v of body.vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
  pop();
}

// 버섯 갓 위에 점 그리기 (p5 전용)
function drawMushroomDots(capBody) {
  push();
  translate(capBody.position.x, capBody.position.y);
  rotate(capBody.angle);

  let radius = capBody.circleRadius; // polygon은 circleRadius가 없음, 근사값 사용
  let approxRadius = (capBody.bounds.max.x - capBody.bounds.min.x) / 2;

  fill(255); // 흰색 점
  noStroke();

  //5개의 점을 갓 위에 배치
  let dotSize = 8;
  ellipse(0, -approxRadius * 0.5, dotSize, dotSize);
  ellipse(-approxRadius * 0.4, -approxRadius * 0.4, dotSize, dotSize);
  ellipse(approxRadius * 0.4, -approxRadius * 0.4, dotSize, dotSize);
  ellipse(-approxRadius * 0.6, -approxRadius * 0.2, dotSize, dotSize);
  ellipse(approxRadius * 0.6, -approxRadius * 0.2, dotSize, dotSize);

  pop();
}

// 버섯 뿌리(base)에 선 그리기 (p5 전용)
function drawMushroomBaseLines(baseBody) {
  push();
  translate(baseBody.position.x, baseBody.position.y);
  rotate(baseBody.angle);

  let w = baseBody.width; // trapezoid는 width/height가 없음, 근사값 사용
  let h = baseBody.height;
  let approxW = baseBody.bounds.max.x - baseBody.bounds.min.x;
  let approxH = baseBody.bounds.max.y - baseBody.bounds.min.y;

  stroke(200, 180, 160);
  strokeWeight(1.5);

  let bottomY = approxH / 2;
  let topY = -approxH / 2;

  // 5개의 선
  line(0, topY, 0, bottomY);
  line(-approxW * 0.15, topY, -approxW * 0.3, bottomY);
  line(approxW * 0.15, topY, approxW * 0.3, bottomY);
  line(-approxW * 0.3, topY, -approxW * 0.5, bottomY);
  line(approxW * 0.3, topY, approxW * 0.5, bottomY);

  pop();
}

function addBoundaries() {
  let thickness = 50;
  boundaries.push(Bodies.rectangle(width / 2, height + thickness / 2, width * 2, thickness, {
    isStatic: true,
    label: "ground"
  }));
  Composite.add(world, boundaries);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  Composite.remove(world, boundaries);
  boundaries = [];
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