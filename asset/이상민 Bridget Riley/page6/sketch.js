const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Constraint = Matter.Constraint;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Body = Matter.Body;

let engine, canvas, mouse, mouseConstraint;

// 레이아웃
const SIDE_MARGIN = 40;
const STRING_GAP_PX = 12;
const segmentCount = 8;
const wallThickness = 40;

// 비주얼
const LINE_WEIGHT = 20;
const PALETTE = [
  [246, 221, 139],
  [236, 105, 137],
  [113, 170, 237],
  [0, 141, 184],
  [64, 87, 121],
  [254, 167, 88],
  [199, 144, 212],
  [111, 184, 103],
  [255, 221, 238],
  [38, 94, 205],
];

const HIT_RADIUS = 60;
const FORCE_X = 0.02;
const DRAG_THRESHOLD = 10;
const PULL_FORCE_SCALE = 0.0005;

// 상태
let strings = [];
let activeDrags = [];
let pointerDown = false;
let lastPointerPos = { x: 0, y: 0 };

// 인접 줄과 같은 색 피하기
function pickColorDifferentFromPrev(prevColor) {
  if (!prevColor) return random(PALETTE);

  let candidates = PALETTE.filter(
    (c) =>
      !(c[0] === prevColor[0] && c[1] === prevColor[1] && c[2] === prevColor[2])
  );
  if (candidates.length === 0) candidates = [prevColor];
  return random(candidates);
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  engine = Engine.create();

  addWalls();

  strings = [];
  let prevColor = null;

  for (let x = SIDE_MARGIN; x <= width - SIDE_MARGIN; x += STRING_GAP_PX) {
    const col = pickColorDifferentFromPrev(prevColor);
    strings.push(createVerticalString(x, col));
    prevColor = col;
  }

  // Matter.js 마우스 컨트롤
  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();

  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false },
    },
  });

  Composite.add(engine.world, mouseConstraint);

  strokeCap(SQUARE);
  strokeJoin(MITER);
  noFill();
}

function draw() {
  background(27);

  Engine.update(engine);

  drawWalls(wallThickness);

  // 드래그 중이면 포인터 위치로 끌어당기는 힘 적용
  if (pointerDown) {
    applyPullForces();
  }

  // 배경 고정 라인
  for (let s of strings) {
    drawStaticLine(s);
  }

  // 실제로 흔들리는 라인
  for (let s of strings) {
    drawVerticalString(s);
  }

  // 위/아래 마스크 (라인 두께만큼 잘라주는 가로 바)
  if (strings.length > 0) {
    const maskTopY = strings[0].topY;
    const maskBottomY = strings[0].bottomY;

    stroke(27);
    strokeWeight(LINE_WEIGHT);
    strokeCap(SQUARE);
    strokeJoin(MITER);
    noFill();

    line(0, maskTopY, width, maskTopY);
    line(0, maskBottomY, width, maskBottomY);
  }
}

// 세로 줄 생성
function createVerticalString(xPos, col) {
  const topAnchorY = 80;
  const bottomAnchorY = height - 80;

  const bodies = [];

  // 위 고정 앵커
  const topAnchor = Bodies.circle(xPos, topAnchorY, 8, {
    isStatic: true,
    collisionFilter: { group: -1 },
    render: { visible: false },
  });

  // 중간 세그먼트
  for (let i = 0; i < segmentCount; i++) {
    const t = (i + 1) / (segmentCount + 1);
    const yPos = lerp(topAnchorY, bottomAnchorY, t);
    const seg = Bodies.circle(xPos, yPos, 8, {
      frictionAir: 0.02,
      restitution: 0.9,
      collisionFilter: { group: -1 },
      render: { visible: false },
    });
    bodies.push(seg);
  }

  // 아래 고정 앵커
  const bottomAnchor = Bodies.circle(xPos, bottomAnchorY, 8, {
    isStatic: true,
    collisionFilter: { group: -1 },
    render: { visible: false },
  });

  // 위→아래 스프링 체인
  const constraints = [];
  let prevBody = topAnchor;

  for (let i = 0; i < bodies.length; i++) {
    const c = Constraint.create({
      bodyA: prevBody,
      bodyB: bodies[i],
      stiffness: 0.9,
      damping: 0.1,
      render: { visible: false },
    });
    constraints.push(c);
    prevBody = bodies[i];
  }

  const lastConstraint = Constraint.create({
    bodyA: prevBody,
    bodyB: bottomAnchor,
    stiffness: 0.9,
    damping: 0.1,
    render: { visible: false },
  });
  constraints.push(lastConstraint);

  Composite.add(engine.world, [
    topAnchor,
    bottomAnchor,
    ...bodies,
    ...constraints,
  ]);

  return {
    top: topAnchor,
    bottom: bottomAnchor,
    bodies: bodies,
    constraints: constraints,
    color: col,
    baseX: xPos,
    topY: topAnchorY,
    bottomY: bottomAnchorY,
  };
}

// 배경 레이어: 직선
function drawStaticLine(stringObj) {
  stroke(stringObj.color[0], stringObj.color[1], stringObj.color[2]);
  strokeWeight(LINE_WEIGHT);
  noFill();

  beginShape();
  vertex(stringObj.baseX, stringObj.topY);
  vertex(stringObj.baseX, stringObj.bottomY);
  endShape();
}

// 앞 레이어: 실제로 휘어진 줄
function drawVerticalString(stringObj) {
  const pts = [
    stringObj.top.position,
    ...stringObj.bodies.map((b) => b.position),
    stringObj.bottom.position,
  ];

  stroke(stringObj.color[0], stringObj.color[1], stringObj.color[2]);
  strokeWeight(LINE_WEIGHT);
  noFill();

  beginShape();
  curveVertex(pts[0].x, pts[0].y);
  curveVertex(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length - 1; i++) {
    curveVertex(pts[i].x, pts[i].y);
  }

  const last = pts[pts.length - 1];
  curveVertex(last.x, last.y);
  curveVertex(last.x, last.y);

  endShape();
}

// 가장 가까운 줄/세그먼트 찾기
function findClosestStringInfo(px, py) {
  let best = null;

  for (let s of strings) {
    const dInfo = distanceFromPointToVerticalString(px, py, s);
    if (!best || dInfo.dist < best.dist) {
      best = { stringObj: s, ...dInfo };
    }
  }

  return best; // { stringObj, dist, closestBody }
}

// 현재 포인터 근처의 줄 activeDrags에 등록
function addOrActivateStringAt(px, py) {
  const best = findClosestStringInfo(px, py);
  if (!best || best.dist > HIT_RADIUS) return;

  const exist = activeDrags.find((d) => d.stringObj === best.stringObj);
  if (exist) {
    exist.lastX = px;
    exist.lastY = py;
    return;
  }

  activeDrags.push({
    stringObj: best.stringObj,
    body: best.closestBody,
    startX: px,
    startY: py,
    lastX: px,
    lastY: py,
    movedEnough: false,
  });
}

// 드래그 중 포인터 쪽으로 끌어당기는 힘
function applyPullForces() {
  for (let d of activeDrags) {
    if (!d.body) continue;

    const pullX = d.lastX - d.body.position.x;
    const pullY = d.lastY - d.body.position.y;

    Body.applyForce(
      d.body,
      { x: d.body.position.x, y: d.body.position.y },
      { x: pullX * PULL_FORCE_SCALE, y: pullY * PULL_FORCE_SCALE }
    );
  }
}

// 포인터 시작
function startPointer(px, py) {
  pointerDown = true;
  lastPointerPos.x = px;
  lastPointerPos.y = py;

  activeDrags = [];
  addOrActivateStringAt(px, py);
}

// 포인터 이동 (멀티 선택 가능)
function movePointer(px, py) {
  if (!pointerDown) return;

  lastPointerPos.x = px;
  lastPointerPos.y = py;

  addOrActivateStringAt(px, py);

  for (let d of activeDrags) {
    const dragDist = dist(px, py, d.startX, d.startY);
    if (dragDist > DRAG_THRESHOLD) {
      d.movedEnough = true;
    }
    d.lastX = px;
    d.lastY = py;
  }
}

// 포인터 해제 (반동)
function endPointer(px, py) {
  if (!pointerDown) return;

  for (let d of activeDrags) {
    if (!d.body) continue;
    if (d.movedEnough) {
      Body.applyForce(
        d.body,
        { x: d.body.position.x, y: d.body.position.y },
        { x: FORCE_X, y: 0 }
      );
    }
  }

  pointerDown = false;
  activeDrags = [];
}

/* p5 이벤트 → 위 제스처 핸들러 */
function mousePressed() {
  startPointer(mouseX, mouseY);
}

function mouseDragged() {
  movePointer(mouseX, mouseY);
}

function mouseReleased() {
  endPointer(mouseX, mouseY);
}

function touchStarted() {
  if (touches && touches.length > 0) {
    startPointer(touches[0].x, touches[0].y);
  }
  return false;
}

function touchMoved() {
  if (touches && touches.length > 0) {
    movePointer(touches[0].x, touches[0].y);
  }
  return false;
}

function touchEnded() {
  endPointer(lastPointerPos.x, lastPointerPos.y);
  return false;
}

// 포인터와 줄 사이 최소 거리 + 가장 가까운 body
function distanceFromPointToVerticalString(px, py, stringObj) {
  const pts = [
    stringObj.top.position,
    ...stringObj.bodies.map((b) => b.position),
    stringObj.bottom.position,
  ];

  let minDist = Infinity;
  let closestBody = null;

  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i];
    const B = pts[i + 1];
    const d = pointSegmentDistance(px, py, A.x, A.y, B.x, B.y);
    if (d < minDist) {
      minDist = d;
      closestBody = guessClosestBodyOnSegment(stringObj, A, B);
    }
  }

  return { dist: minDist, closestBody: closestBody };
}

// 점-선분 최소 거리
function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;

  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return dist(px, py, x1, y1);

  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return dist(px, py, x2, y2);

  const t = c1 / c2;
  const projX = x1 + t * vx;
  const projY = y1 + t * vy;
  return dist(px, py, projX, projY);
}

// 선분 근처에서 조작할 실제 body 추정
function guessClosestBodyOnSegment(stringObj, A, B) {
  let bestBody = null;
  let bestD = Infinity;
  for (let b of stringObj.bodies) {
    const dA = dist(b.position.x, b.position.y, A.x, A.y);
    const dB = dist(b.position.x, b.position.y, B.x, B.y);
    const d = min(dA, dB);
    if (d < bestD) {
      bestD = d;
      bestBody = b;
    }
  }
  return bestBody;
}

// 월 추가
function addWalls() {
  const w = wallThickness;

  const topWall = Bodies.rectangle(width / 2, -w / 2, width, w, {
    isStatic: true,
    render: { visible: false },
  });
  const bottomWall = Bodies.rectangle(width / 2, height + w / 2, width, w, {
    isStatic: true,
    render: { visible: false },
  });
  const leftWall = Bodies.rectangle(-w / 2, height / 2, w, height, {
    isStatic: true,
    collisionFilter: { group: -1 },
    render: { visible: false },
  });
  const rightWall = Bodies.rectangle(width + w / 2, height / 2, w, height, {
    isStatic: true,
    collisionFilter: { group: -1 },
    render: { visible: false },
  });

  Composite.add(engine.world, [topWall, bottomWall, leftWall, rightWall]);
}

// 테두리 시각화
function drawWalls(t) {
  fill(30);
  noStroke();
  rect(t / 2, height / 2, t, height);
  rect(width - t / 2, height / 2, t, height);
  rect(width / 2, t / 2, width, t);
  rect(width / 2, height - t / 2, width, t);
}

// 리사이즈 시 캔버스만 조정 (물리 셋업은 그대로)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
