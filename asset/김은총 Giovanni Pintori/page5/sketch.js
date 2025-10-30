// =======================================================
// 1. Matter.js 모듈 (변동 없음)
// =======================================================
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Constraint = Matter.Constraint;
const Vector = Matter.Vector;
const Composite = Matter.Composite;

// =======================================================
// 2. 전역 변수들 (✨ [수정됨])
// =======================================================
let engine;
let world;
let canvas;
let walls = [];
let circles = [];
let blueArcParts = [];
let greenArcParts = [];
let blueRadius, greenRadius; // ✨ [추가] 반원 반지름 전역 변수

let pintoriColors = {
  blue: "#f4c430", // (원래 코드에서 노란색)
  green: "#0077b6", // (원래 코드에서 파란색)
  black: "#000000",
};

let circleRadius;
let arcRadius;
let arcCenter;
let arcWallRadius;

let constantRotationSpeed = 0.1;
let rotationLerpSpeed = 0.5;

let draggedCircle = null;
let isDragging = false;

// =======================================================
// 3. p5.js setup() (✨ [수정됨])
// =======================================================
function setup() {
  console.log("Setup started: Dial Rotation - Interactive");
  canvas = createCanvas(windowWidth, windowHeight);

  let options = { passive: false, capture: true };
  canvas.elt.addEventListener("touchstart", preventTouchDefault, options);
  canvas.elt.addEventListener("touchmove", preventTouchDefault, options);
  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 1;

  calculateSizes();

  // ✨ [수정] arcCenter의 y 위치를 화면 하단(height) 기준으로 변경
  arcCenter = {
    x: width / 2,
    y: height - 50, // 화면 하단에서 50px 위
  };

  createWalls();

  // ✨ [수정] 'let'을 제거하여 전역 변수에 할당
  blueRadius = arcRadius - circleRadius * 2.0;
  greenRadius = arcRadius + circleRadius * 2.0;
  let arcSegments = 80;

  // 물리 바디 생성 (기존과 동일)
  blueArcParts = createArcWallWithCircles(
    arcCenter.x,
    arcCenter.y,
    blueRadius,
    arcSegments,
    arcWallRadius,
    pintoriColors.blue // 안쪽 원 (노란색)
  );
  greenArcParts = createArcWallWithCircles(
    arcCenter.x,
    arcCenter.y,
    greenRadius,
    arcSegments,
    arcWallRadius,
    pintoriColors.green // 바깥쪽 원 (파란색)
  );
  Composite.add(world, blueArcParts);
  Composite.add(world, greenArcParts);

  // 검은색 원 생성 (기존과 동일)
  let numCircles = 12;
  let angleRange = PI * 0.9;
  let angleStart = (PI - angleRange) / 2;
  let angleStep = angleRange / (numCircles - 1);
  for (let i = 0; i < numCircles; i++) {
    let angle = angleStart + angleStep * i;
    // ✨ [수정] 원 생성 위치도 arcCenter.y 변경에 맞춰 수정
    let x = arcCenter.x + arcRadius * cos(angle);
    let y = arcCenter.y - arcRadius * sin(angle);
    let circle = Bodies.circle(x, y, circleRadius, {
      frictionAir: 0.05,
      friction: 0.1,
      restitution: 0.4,
      density: 0.01,
    });
    circle.color = pintoriColors.black;
    circle.homeAngle = angle;
    circle.homePos = { x: x, y: y };
    circle.isEjected = false;

    let constraint = Constraint.create({
      pointA: arcCenter,
      bodyB: circle,
      length: arcRadius,
      stiffness: 1.0,
      damping: 0,
      render: { visible: false },
    });
    circle.constraint = constraint;
    circles.push(circle);
    Composite.add(world, [circle, constraint]);
  }
  console.log("Setup finished");
}

// =======================================================
// 4. calculateSizes() (변동 없음)
// =======================================================
function calculateSizes() {
  let baseSize = max(width * 0.45, height * 0.4);
  arcRadius = baseSize;
  circleRadius = arcRadius * 0.08;
  arcWallRadius = circleRadius * 1.1;
}

// =======================================================
// 5. createWalls() (변동 없음)
// =======================================================
function createWalls() {
  let wallOptions = {
    isStatic: true,
    restitution: 0.5,
  };
  let sideOffset = 50;
  let topOffset = height;
  if (walls.length > 0) {
    Composite.remove(world, walls);
    walls = [];
  }
  walls.push(
    Bodies.rectangle(
      width / 2,
      -topOffset / 2,
      width * 1.5,
      topOffset,
      wallOptions
    )
  );
  walls.push(
    Bodies.rectangle(
      width / 2,
      height + sideOffset / 2,
      width * 1.5,
      sideOffset,
      wallOptions
    )
  );
  Composite.add(world, walls);
}

// =======================================================
// 6. createArcWallWithCircles() (변동 없음)
// =======================================================
function createArcWallWithCircles(cx, cy, radius, segments, partRadius, color) {
  let parts = [];
  let segmentAngle = PI / segments;
  for (let i = 0; i <= segments; i++) {
    let angle = i * segmentAngle;
    let x = cx + radius * cos(angle);
    let y = cy - radius * sin(angle); // y 좌표 계산 수정 (위쪽 반원)
    let part = Bodies.circle(x, y, partRadius, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.3,
    });
    part.color = color;
    part.radius = partRadius;
    parts.push(part);
  }
  return parts;
}

// =======================================================
// 7. p5.js draw() (✨ [수정됨] - arc() 사용)
// =======================================================
function draw() {
  background(245, 245, 240);
  Engine.update(engine);

  let targetAV = constantRotationSpeed;

  // 검은색 원 복귀 및 회전 로직 (기존과 동일)
  for (let circle of circles) {
    if (circle.isEjected) {
      let currentDist = dist(
        circle.position.x,
        circle.position.y,
        arcCenter.x,
        arcCenter.y
      );
      let snapThreshold = circleRadius * 3.0;
      if (
        abs(currentDist - arcRadius) < snapThreshold &&
        (!isDragging || circle !== draggedCircle)
      ) {
        console.log("Circle Restored!");
        Body.setVelocity(circle, { x: 0, y: 0 });
        Body.setAngularVelocity(circle, 0);
        Body.setPosition(circle, circle.homePos);
        let constraint = Constraint.create({
          pointA: arcCenter,
          bodyB: circle,
          length: arcRadius,
          stiffness: 1.0,
          damping: 0,
          render: { visible: false },
        });
        Composite.add(world, constraint);
        circle.constraint = constraint;
        circle.isEjected = false;
      }
    }

    if (!circle.isEjected && circle.constraint) {
      let radiusVector = Vector.sub(circle.position, arcCenter);
      let tangentVector = { x: -radiusVector.y, y: radiusVector.x };
      tangentVector = Vector.normalise(tangentVector);
      let currentTangentialSpeed = Vector.dot(circle.velocity, tangentVector);
      let targetTangentialSpeed = targetAV * arcRadius;
      let newTangentialSpeed = lerp(
        currentTangentialSpeed,
        targetTangentialSpeed,
        rotationLerpSpeed
      );
      let newVelocity = Vector.mult(tangentVector, newTangentialSpeed);
      Body.setVelocity(circle, newVelocity);
    }
  }

  // 드래그 중인 원 위치 설정 (기존과 동일)
  if (isDragging && draggedCircle) {
    Body.setPosition(draggedCircle, { x: mouseX, y: mouseY });
    Body.setVelocity(draggedCircle, { x: 0, y: 0 });
  }

  checkScreenWrap();

  // ✨ [수정] 반원 그리기 (arc() 사용)
  push();
  noFill();
  strokeCap(ROUND);

  // 1. 바깥쪽 원 (Green = 코드상 파란색)
  stroke(pintoriColors.green);
  strokeWeight(arcWallRadius * 2);
  arc(arcCenter.x, arcCenter.y, greenRadius * 2, greenRadius * 2, PI, TWO_PI);

  // 2. 안쪽 원 (Blue = 코드상 노란색)
  stroke(pintoriColors.blue);
  strokeWeight(arcWallRadius * 2);
  arc(arcCenter.x, arcCenter.y, blueRadius * 2, blueRadius * 2, PI, TWO_PI);

  pop();

  // 검은색 원 그리기 (기존과 동일)
  push();
  noStroke();
  for (let circle of circles) {
    if (circle === draggedCircle) {
      fill(255, 70, 70);
    } else {
      fill(pintoriColors.black);
    }
    ellipse(circle.position.x, circle.position.y, circleRadius * 2);
  }
  pop();
}

// =======================================================
// 8. checkScreenWrap() (변동 없음)
// =======================================================
function checkScreenWrap() {
  let buffer = circleRadius * 2;
  for (let circle of circles) {
    if (circle.isEjected) continue;

    if (circle.position.x > width + buffer) {
      Body.setPosition(circle, { x: -buffer, y: circle.position.y });
      Body.setVelocity(circle, circle.velocity);
    } else if (circle.position.x < -buffer) {
      Body.setPosition(circle, { x: width + buffer, y: circle.position.y });
      Body.setVelocity(circle, circle.velocity);
    }
  }
}

// =======================================================
// 9. 터치/마우스 핸들러 (변동 없음)
// =======================================================
function touchStarted() {
  handlePress(mouseX, mouseY);
  return false;
}

function mousePressed() {
  handlePress(mouseX, mouseY);
  return false;
}

function handlePress(x, y) {
  for (let circle of circles) {
    let d = dist(x, y, circle.position.x, circle.position.y);

    if (d < circleRadius) {
      console.log("Circle grabbed!");
      draggedCircle = circle;
      isDragging = true;

      if (circle.constraint) {
        World.remove(world, circle.constraint);
        circle.constraint = null;
        circle.isEjected = true;
      }
      break;
    }
  }
}

function touchMoved() {
  return false;
}

function mouseDragged() {
  return false;
}

function touchEnded() {
  handleRelease();
  return false;
}

function mouseReleased() {
  handleRelease();
  return false;
}

function handleRelease() {
  if (draggedCircle) {
    console.log("Circle released!");

    let releaseVelocity = {
      x: (mouseX - pmouseX) * 0.5,
      y: (mouseY - pmouseY) * 0.5,
    };
    Body.setVelocity(draggedCircle, releaseVelocity);

    draggedCircle = null;
    isDragging = false;
  }
}

// =======================================================
// 10. windowResized (✨ [수정됨])
// =======================================================
function windowResized() {
  let options = { passive: false, capture: true };
  if (canvas) {
    canvas.elt.removeEventListener("touchstart", preventTouchDefault, options);
    canvas.elt.removeEventListener("touchmove", preventTouchDefault, options);
  }

  resizeCanvas(windowWidth, windowHeight);

  // 이전 객체들 클리어
  World.clear(world);
  engine.events = {};
  walls = [];
  circles = [];
  blueArcParts = [];
  greenArcParts = [];
  draggedCircle = null;
  isDragging = false;

  calculateSizes();

  // ✨ [수정] arcCenter y 위치 재계산
  arcCenter = {
    x: width / 2,
    y: height - 50,
  };
  createWalls();

  // ✨ [수정] 전역 변수 사용
  blueRadius = arcRadius - circleRadius * 2.0;
  greenRadius = arcRadius + circleRadius * 2.0;
  let arcSegments = 80;

  // 객체 재생성
  blueArcParts = createArcWallWithCircles(
    arcCenter.x,
    arcCenter.y,
    blueRadius,
    arcSegments,
    arcWallRadius,
    pintoriColors.blue
  );
  greenArcParts = createArcWallWithCircles(
    arcCenter.x,
    arcCenter.y,
    greenRadius,
    arcSegments,
    arcWallRadius,
    pintoriColors.green
  );
  Composite.add(world, blueArcParts);
  Composite.add(world, greenArcParts);

  let numCircles = 12;
  let angleRange = PI * 0.9;
  let angleStart = (PI - angleRange) / 2;
  let angleStep = angleRange / (numCircles - 1);
  for (let i = 0; i < numCircles; i++) {
    let angle = angleStart + angleStep * i;
    // ✨ [수정] y 좌표 계산 수정
    let x = arcCenter.x + arcRadius * cos(angle);
    let y = arcCenter.y - arcRadius * sin(angle);
    let circle = Bodies.circle(x, y, circleRadius, {
      frictionAir: 0.05,
      friction: 0.1,
      restitution: 0.4,
      density: 0.01,
    });
    circle.color = pintoriColors.black;
    circle.homeAngle = angle;
    circle.homePos = { x: x, y: y };
    circle.isEjected = false;

    let constraint = Constraint.create({
      pointA: arcCenter,
      bodyB: circle,
      length: arcRadius,
      stiffness: 1.0,
      damping: 0,
      render: { visible: false },
    });
    circle.constraint = constraint;
    circles.push(circle);
    Composite.add(world, [circle, constraint]);
  }
}

// =======================================================
// 11. preventTouchDefault (변동 없음)
// =======================================================
function preventTouchDefault(event) {
  event.preventDefault();
}
