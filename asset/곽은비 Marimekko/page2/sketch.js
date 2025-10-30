// ===== Page 2: Smooth Chain + Center Obstacle (fixed add-tail, extra flexible) =====

let nodes = []; // {x,y,vx,vy,r,colorIndex}
let links = []; // [{a,b,len}]
let draggingIdx = -1;

const RADIUS = 28;
const SPACING = 6;
const START_CNT = 7;

// 더 부드럽게
const GRAVITY = 0.12; // 약한 중력
const AIR_DRAG = 0.998; // 감쇠 적게 → 유연
const ITER = 14; // 제약 반복(안정+유연)
const SOFTNESS = 0.2; // 스프링 보정 강도 (작을수록 흐물)
const BEND_SMOOTH = 0.35; // 곡률 스무딩 강도
const DRAG_LERP = 0.9; // 포인터로 끌리는 정도
const FLOOR_BOUNCE = -0.15;

const PALETTE = ["#000000", "#0C1B5E", "#F4E34C"];
let nextColor = 0;

// 중앙 고정 장애물
let obstacle = { x: 0, y: 0, r: 110 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  obstacle.x = width / 2;
  obstacle.y = height / 2;
  buildInitialChain();
}

function buildInitialChain() {
  nodes = [];
  links = [];
  const y = height * 0.33;
  let x = max(100, width * 0.15);
  for (let i = 0; i < START_CNT; i++) {
    nodes.push(makeNode(x, y, i % PALETTE.length));
    if (i > 0) links.push({ a: i - 1, b: i, len: RADIUS * 2 + SPACING });
    x += RADIUS * 2 + SPACING;
  }
}

function makeNode(x, y, colorIndex) {
  return { x, y, vx: 0, vy: 0, r: RADIUS, colorIndex };
}

function draw() {
  background(255);
  physicsStep();

  // 장애물
  noStroke();
  fill(235);
  circle(obstacle.x, obstacle.y, obstacle.r * 2);

  // 링크
  stroke(30, 30, 40, 40);
  strokeWeight(2);
  for (const L of links) {
    const a = nodes[L.a],
      b = nodes[L.b];
    line(a.x, a.y, b.x, b.y);
  }

  // 노드
  noStroke();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    fill(PALETTE[n.colorIndex]);
    circle(n.x, n.y, n.r * 2);
    if (i === draggingIdx) {
      noFill();
      stroke(0, 90);
      circle(n.x, n.y, n.r * 2 + 6);
      noStroke();
    }
  }
}

function physicsStep() {
  // 1) 속도/중력
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];

    if (i === draggingIdx) {
      n.x = lerp(n.x, pointerX(), DRAG_LERP);
      n.y = lerp(n.y, pointerY(), DRAG_LERP);
      n.vx = n.vy = 0;
    } else {
      n.vy += GRAVITY;
      n.vx *= AIR_DRAG;
      n.vy *= AIR_DRAG;
      n.x += n.vx;
      n.y += n.vy;
    }

    // 경계
    const floor = height - RADIUS - 2;
    if (n.y > floor) {
      n.y = floor;
      n.vy *= FLOOR_BOUNCE;
    }
    if (n.x < RADIUS + 2) {
      n.x = RADIUS + 2;
      n.vx *= -0.15;
    }
    if (n.x > width - RADIUS - 2) {
      n.x = width - RADIUS - 2;
      n.vx *= -0.15;
    }

    // 장애물 충돌
    resolveCircleCollision(n, obstacle.x, obstacle.y, obstacle.r);
  }

  // 2) 거리 제약 + 곡률 스무딩
  for (let k = 0; k < ITER; k++) {
    for (const L of links) {
      const a = nodes[L.a],
        b = nodes[L.b];
      let dx = b.x - a.x,
        dy = b.y - a.y;
      let d = Math.hypot(dx, dy) || 0.0001;
      let diff = (d - L.len) / d;

      if (L.a === draggingIdx && L.b !== draggingIdx) {
        b.x -= dx * diff * SOFTNESS;
        b.y -= dy * diff * SOFTNESS;
      } else if (L.b === draggingIdx && L.a !== draggingIdx) {
        a.x += dx * diff * SOFTNESS;
        a.y += dy * diff * SOFTNESS;
      } else {
        const offX = dx * 0.5 * diff * SOFTNESS;
        const offY = dy * 0.5 * diff * SOFTNESS;
        a.x += offX;
        a.y += offY;
        b.x -= offX;
        b.y -= offY;
      }
    }

    // 곡률 스무딩(중간 노드)
    for (let i = 1; i < nodes.length - 1; i++) {
      if (i === draggingIdx) continue;
      const prev = nodes[i - 1],
        cur = nodes[i],
        next = nodes[i + 1];
      const ax = (prev.x + next.x) * 0.5,
        ay = (prev.y + next.y) * 0.5;
      cur.x = lerp(cur.x, ax, BEND_SMOOTH);
      cur.y = lerp(cur.y, ay, BEND_SMOOTH);
      resolveCircleCollision(cur, obstacle.x, obstacle.y, obstacle.r);
    }
  }
}

function resolveCircleCollision(n, cx, cy, cr) {
  const dx = n.x - cx,
    dy = n.y - cy,
    dist = Math.hypot(dx, dy);
  const minDist = n.r + cr;
  if (dist < minDist) {
    const nx = dx / (dist || 0.0001),
      ny = dy / (dist || 0.0001);
    const push = minDist - dist + 0.6; // 살짝 여유
    n.x += nx * push;
    n.y += ny * push;
    n.vx *= 0.7;
    n.vy *= 0.7;
  }
}

/* ===== 입력 ===== */
// 드래그 반경을 작게(RADIUS*1.1) → 빈 곳 클릭 시 확실히 "추가"
function mousePressed() {
  const idx = findNearestNode(pointerX(), pointerY(), RADIUS * 1.1);
  if (idx !== -1) draggingIdx = idx;
  else addTailNode();
}
function touchStarted() {
  const idx = findNearestNode(pointerX(), pointerY(), RADIUS * 1.1);
  if (idx !== -1) {
    draggingIdx = idx;
    return false;
  } else {
    addTailNode();
    return false;
  }
}
function mouseReleased() {
  draggingIdx = -1;
}
function touchEnded() {
  draggingIdx = -1;
}

function findNearestNode(x, y, capture) {
  let best = -1,
    bestD = 1e9;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i],
      d = dist(x, y, n.x, n.y);
    if (d < bestD && d <= capture) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

function addTailNode() {
  if (nodes.length === 0) {
    nodes.push(makeNode(width * 0.5, height * 0.33, nextColor));
    nextColor = (nextColor + 1) % PALETTE.length;
    return;
  }
  const tail = nodes[nodes.length - 1];
  const gap = RADIUS * 2 + SPACING;
  let tx = tail.x + gap,
    ty = tail.y;
  if (tx > width - RADIUS - 40) {
    tx = max(80, width * 0.15);
    ty = min(ty + gap, height * 0.75);
  }
  nodes.push(makeNode(tx, ty, nextColor));
  nextColor = (nextColor + 1) % PALETTE.length;
  links.push({ a: nodes.length - 2, b: nodes.length - 1, len: gap });
}

function pointerX() {
  return touches && touches.length ? touches[0].x : mouseX;
}
function pointerY() {
  return touches && touches.length ? touches[0].y : mouseY;
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  obstacle.x = width / 2;
  obstacle.y = height / 2;
}
