let Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Constraint = Matter.Constraint,
  Vector = Matter.Vector,
  Query = Matter.Query,
  Composite = Matter.Composite;

let engine;
let world;

let boxGrid = [];
let pintoriColors = ["#d90429", "#000000", "#ffb703", "#2a9d8f", "#0077b6"];

let cols = 10;
let rows = 10;
let boxSize = 30;
let gap = 4;
let bodySize = boxSize - gap;

let gridWidth, gridHeight;
let startX, startY;

let touchStartPos = null;
let isSwiping = false;

let systemState = "order";
let originalStiffness = 0.003; // 사용자가 디버깅한 값 유지

let walls = [];

//이벤트 가로채기 로직
function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);

  //"핵옵션 이벤트 리스너 강제 적용
  canvas.elt.style.zIndex = "9999"; // CSS로 최상단 보장
  // 템플릿보다 먼저 이벤트를 '가로채기'
  let options = { passive: false, capture: true };
  canvas.elt.addEventListener("touchstart", handleTouchStart, options);
  canvas.elt.addEventListener("touchmove", handleTouchMove, options);
  canvas.elt.addEventListener("touchend", handleTouchEnd, options);
  canvas.elt.addEventListener("touchcancel", handleTouchEnd, options);

  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;

  createWalls();

  gridWidth = cols * boxSize;
  gridHeight = rows * boxSize;
  startX = (width - gridWidth) / 2 + boxSize / 2;
  startY = (height - gridHeight) / 2 + boxSize / 2;

  for (let i = 0; i < rows; i++) {
    boxGrid[i] = [];
    for (let j = 0; j < cols; j++) {
      let x = startX + j * boxSize;
      let y = startY + i * boxSize;

      let options = { restitution: 0.5, friction: 0.1, density: 0.001 };

      let box = Bodies.rectangle(x, y, bodySize, bodySize, options);
      box.color = random(pintoriColors);

      let constraint = Constraint.create({
        bodyA: box,
        pointB: { x: x, y: y },
        stiffness: originalStiffness,
        damping: 0.05,
      });

      box.constraint = constraint;
      boxGrid[i][j] = box;

      Composite.add(world, [box, constraint]);
    }
  }
}

function createWalls() {
  let wallOptions = {
    isStatic: true,
    restitution: 0.5,
  };
  let sideOffset = 50;
  let topOffset = 100;
  if (walls.length > 0) {
    Composite.remove(world, walls);
    walls = [];
  }
  walls.push(
    Bodies.rectangle(width / 2, -topOffset / 2, width, topOffset, wallOptions)
  );
  walls.push(
    Bodies.rectangle(
      width / 2,
      height + sideOffset / 2,
      width,
      sideOffset,
      wallOptions
    )
  );
  walls.push(
    Bodies.rectangle(
      -sideOffset / 2,
      height / 2,
      sideOffset,
      height,
      wallOptions
    )
  );
  walls.push(
    Bodies.rectangle(
      width + sideOffset / 2,
      height / 2,
      sideOffset,
      height,
      wallOptions
    )
  );

  Composite.add(world, walls);
}

function draw() {
  background(245, 245, 240);
  Engine.update(engine);

  if (systemState === "order" && frameCount % 10 === 0) {
    updateGridOrder();
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let box = boxGrid[i][j];
      if (!box) continue;
      let pos = box.position;
      let angle = box.angle;
      push();
      translate(pos.x, pos.y);
      rotate(angle);
      rectMode(CENTER);
      noStroke();
      fill(box.color);
      rect(0, 0, bodySize, bodySize);
      pop();
    }
  }
}

function updateGridOrder() {
  let i1 = floor(random(rows));
  let j1 = floor(random(cols));
  let directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  let [di, dj] = random(directions);
  let i2 = i1 + di;
  let j2 = j1 + dj;
  if (i2 < 0 || i2 >= rows || j2 < 0 || j2 >= cols) return;
  let box1 = boxGrid[i1][j1];
  let box2 = boxGrid[i2][j2];
  if (!box1 || !box2) return;
  let target1 = box1.constraint.pointB;
  let target2 = box2.constraint.pointB;
  Body.setPosition(box1, target2);
  Body.setPosition(box2, target1);
  box1.constraint.pointB = target2;
  box2.constraint.pointB = target1;
  boxGrid[i1][j1] = box2;
  boxGrid[i2][j2] = box1;
}

function handleTouchStart(event) {
  //이벤트 중단
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (systemState === "chaos") return false;

  if (event.touches.length > 0) {
    let touch = event.touches[0];
    // p5 변수 대신 event 좌표 사용
    let touchX = touch.clientX;
    let touchY = touch.clientY;

    let minX = startX - boxSize / 2;
    let maxX = startX + gridWidth - boxSize / 2;
    let minY = startY - boxSize / 2;
    let maxY = startY + gridHeight - boxSize / 2;

    if (touchX > minX && touchX < maxX && touchY > minY && touchY < maxY) {
      touchStartPos = { x: touchX, y: touchY };
      isSwiping = false;
    } else {
      touchStartPos = null;
    }
  }
  return false;
}

function handleTouchMove(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (!touchStartPos) return;

  let touch = event.touches[0];
  let currentPos = { x: touch.clientX, y: touch.clientY };
  let distance = dist(
    touchStartPos.x,
    touchStartPos.y,
    currentPos.x,
    currentPos.y
  );
  if (distance > 10) {
    isSwiping = true;
  }
  return false;
}

function handleTouchEnd(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (touchStartPos) {
    if (isSwiping) {
      triggerSwipeExplosion();
    } else {
      triggerShockwave(touchStartPos.x, touchStartPos.y);
    }
  }
  touchStartPos = null;
  isSwiping = false;
  return false;
}

function mousePressed() {
  if (systemState === "chaos") return false;
  let minX = startX - boxSize / 2;
  let maxX = startX + gridWidth - boxSize / 2;
  let minY = startY - boxSize / 2;
  let maxY = startY + gridHeight - boxSize / 2;
  if (mouseX > minX && mouseX < maxX && mouseY > minY && mouseY < maxY) {
    touchStartPos = { x: mouseX, y: mouseY };
    isSwiping = false;
  } else {
    touchStartPos = null;
  }
  return false;
}
function mouseDragged() {
  if (!touchStartPos) return;
  let distance = dist(touchStartPos.x, touchStartPos.y, mouseX, mouseY);
  if (distance > 10) {
    isSwiping = true;
  }
  return false;
}
function mouseReleased() {
  if (touchStartPos) {
    if (isSwiping) {
      triggerSwipeExplosion();
    } else {
      triggerShockwave(touchStartPos.x, touchStartPos.y);
    }
  }
  touchStartPos = null;
  isSwiping = false;
  return false;
}

function triggerShockwave(x, y) {
  let point = { x: x, y: y };
  let shockwaveRadius = 100;
  let maxForce = 0.07;
  let allBoxes = Composite.allBodies(world).filter((b) => b.constraint);
  let bodiesInRadius = Query.region(allBoxes, {
    min: { x: point.x - shockwaveRadius, y: point.y - shockwaveRadius },
    max: { x: point.x + shockwaveRadius, y: point.y + shockwaveRadius },
  });
  for (let box of bodiesInRadius) {
    let distance = dist(point.x, point.y, box.position.x, box.position.y);
    if (distance < shockwaveRadius) {
      let forceVector = Vector.sub(box.position, point);
      forceVector = Vector.normalise(forceVector);
      let forceMagnitude =
        ((shockwaveRadius - distance) / shockwaveRadius) * maxForce;
      forceVector = Vector.mult(forceVector, forceMagnitude);
      Body.applyForce(box, box.position, forceVector);
    }
  }
}

function triggerSwipeExplosion() {
  if (systemState === "chaos") return;
  systemState = "chaos";
  engine.world.gravity.y = 0.5; // 중력 켜기

  let gridCenter = {
    x: startX + gridWidth / 2 - boxSize / 2,
    y: startY + gridHeight / 2 - boxSize / 2,
  };
  let allBoxes = Composite.allBodies(world).filter((b) => b.constraint);

  let explosionForce = 0.4; // 폭발의 기본 힘

  for (let box of allBoxes) {
    box.constraint.stiffness = 0; // 스프링 풀기

    let outwardForce = Vector.sub(box.position, gridCenter);
    outwardForce = Vector.normalise(outwardForce);
    outwardForce = Vector.mult(
      outwardForce,
      explosionForce * 0.5 + random(-0.1, 0.1)
    );

    let upwardForce = {
      x: 0,
      y: -(explosionForce * 0.8 + random(0, 0.05)), // 사용자가 디버깅한 값
    };

    let totalForce = Vector.add(outwardForce, upwardForce);

    Body.applyForce(box, box.position, totalForce);
  }

  setTimeout(startRecovery, 6000);
}

function startRecovery() {
  if (systemState === "order") return;
  systemState = "order";
  engine.world.gravity.y = 0; // 중력 끄기
  let allBoxes = Composite.allBodies(world).filter((b) => b.constraint);
  for (let box of allBoxes) {
    box.constraint.stiffness = originalStiffness; // 스프링 복원
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  createWalls();

  let oldCenterX = startX - boxSize / 2 + gridWidth / 2;
  let oldCenterY = startY - boxSize / 2 + gridHeight / 2;

  let newCenterX = width / 2;
  let newCenterY = height / 2;

  let dx = newCenterX - oldCenterX;
  let dy = newCenterY - oldCenterY;

  let allBoxes = Composite.allBodies(world).filter((b) => b.constraint);
  for (let box of allBoxes) {
    Body.setPosition(box, {
      x: box.position.x + dx,
      y: box.position.y + dy,
    });

    box.constraint.pointB.x += dx;
    box.constraint.pointB.y += dy;
  }

  startX += dx;
  startY += dy;
}
