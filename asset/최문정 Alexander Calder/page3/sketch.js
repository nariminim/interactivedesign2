// ----------------------------------------------------
// 🕸️ Dynamic Node Web (Matter.js)
// 🎵 Sound: 새 노드 생성 시 / 4손가락 터치 시 맑은 톤 발생
// ----------------------------------------------------

const {
  Engine,
  World,
  Bodies,
  Body,
  Composite,
  Constraint,
  Mouse,
  MouseConstraint,
} = Matter;

const getAudioContext = p5.prototype.getAudioContext; // Safari용

let engine, world;
let nodes = [];
let links = [];
let walls = [];
let mouseConstraint;

const NODE_COUNT = 22;
const LINK_STIFF = 0.035;
const LINK_DAMP = 0.06;

let prevPinchDist = null;
let prevPinchAngle = null;

let addShapeIndex = 0;
let lastTapTime = 0;
let audioStarted = false;

// ----------------------------------------------------
// 🎵 오디오 초기화
// ----------------------------------------------------
function touchStarted() {
  if (!audioStarted) {
    if (getAudioContext().state !== "running") getAudioContext().resume();
    userStartAudio();
    audioStarted = true;
  }

  // 🎵 4손가락 터치 시 맑은 소리
  if (touches.length === 4 && audioStarted) {
    const avgX = touches.reduce((sum, t) => sum + t.x, 0) / 4;
    const avgY = touches.reduce((sum, t) => sum + t.y, 0) / 4;
    const freq = map(avgY, 0, height, 1000, 300);
    const pan = map(avgX, 0, width, -1, 1);
    playTone(freq, pan);
  }
}

function mousePressed() {
  if (!audioStarted) {
    if (getAudioContext().state !== "running") getAudioContext().resume();
    userStartAudio();
    audioStarted = true;
  }
}

// ----------------------------------------------------
// ⚙️ 세팅 및 물리 구조
// ----------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  engine = Engine.create();
  world = engine.world;
  engine.gravity.y = 0;

  makeWalls();

  for (let i = 0; i < NODE_COUNT; i++) {
    const x = width * (0.25 + 0.5 * noise(i));
    const y = height * (0.25 + 0.5 * noise(i + 100));
    nodes.push(makeRandomBody(x, y, i));
  }
  Composite.add(world, nodes);

  for (let i = 0; i < nodes.length - 1; i++) {
    const c = Constraint.create({
      bodyA: nodes[i],
      bodyB: nodes[i + 1],
      length: random(60, 120),
      stiffness: LINK_STIFF,
      damping: LINK_DAMP,
    });
    links.push(c);
  }

  for (let i = 0; i < nodes.length - 6; i += 3) {
    const c = Constraint.create({
      bodyA: nodes[i],
      bodyB: nodes[i + 5],
      length: random(90, 180),
      stiffness: LINK_STIFF * 0.9,
      damping: LINK_DAMP * 0.8,
    });
    links.push(c);
  }
  Composite.add(world, links);

  const m = Mouse.create(canvas.elt);
  m.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: m,
    constraint: { stiffness: 0.2 },
  });
  Composite.add(world, mouseConstraint);
}

// ----------------------------------------------------
// 🎨 렌더링
// ----------------------------------------------------
function draw() {
  background(255);
  Engine.update(engine);
  handleTouches();

  // 링크
  stroke(0, 100);
  strokeWeight(1);
  for (const l of links) {
    const a = l.bodyA.position;
    const b = l.bodyB.position;
    line(a.x, a.y, b.x, b.y);

    push();
    noFill();
    stroke(0);
    strokeWeight(1);
    circle(a.x, a.y, 4);
    circle(b.x, b.y, 4);
    pop();
  }

  // 노드
  noStroke();
  for (const n of nodes) {
    push();
    translate(n.position.x, n.position.y);
    rotate(n.angle);
    fill(0);
    if (n.circleRadius) {
      circle(0, 0, n.circleRadius * 2);
      fill(255);
      circle(0, 0, max(2, n.circleRadius * 0.6));
    } else {
      const w = n.renderW || 14;
      const h = n.renderH || 14;
      rectMode(CENTER);
      rect(0, 0, w, h);
      fill(0);
      circle(w * 0.5, 0, 3);
      circle(-w * 0.5, 0, 3);
    }
    pop();
  }

  noFill();
  stroke(0, 25);
  rect(0, 0, width, height);
}

// ----------------------------------------------------
// 🎵 맑은 톤 함수
// ----------------------------------------------------
function playTone(freq, pan) {
  const osc = new p5.Oscillator("triangle");
  osc.freq(freq);
  osc.pan(pan);
  osc.amp(0.7, 0);
  osc.start();
  osc.amp(0, 0.3, 0.05);
  setTimeout(() => osc.stop(), 400);
}

// ----------------------------------------------------
// 🔧 기타 보조 함수 (노드 생성 시 사운드 추가)
// ----------------------------------------------------
function touchEnded() {
  const now = millis();
  const isDouble = now - lastTapTime < 250;
  lastTapTime = now;

  const tx = mouseX;
  const ty = mouseY;

  if (isDouble) {
    if (nodes.length === 0) return;
    let best = 0,
      bestD = 1e9;
    for (let i = 0; i < nodes.length; i++) {
      const d = dist(tx, ty, nodes[i].position.x, nodes[i].position.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    Composite.remove(world, nodes[best]);
    nodes.splice(best, 1);

    if (nodes.length < 3) rebuildLinks();
  } else {
    let b;
    if (addShapeIndex === 0) {
      b = Bodies.circle(tx, ty, random(6, 11), {
        frictionAir: 0.02,
        restitution: 0.85,
      });
    } else if (addShapeIndex === 1) {
      const w = random(10, 22),
        h = random(8, 18);
      b = Bodies.rectangle(tx, ty, w, h, {
        frictionAir: 0.025,
        restitution: 0.6,
      });
      b.renderW = w;
      b.renderH = h;
    } else {
      b = Bodies.polygon(tx, ty, 6, random(8, 12), {
        frictionAir: 0.02,
        restitution: 0.7,
      });
    }
    addShapeIndex = (addShapeIndex + 1) % 3;
    nodes.push(b);
    Composite.add(world, b);

    // 🎵 새 노드 생성 시 소리
    if (audioStarted) {
      const freq = map(ty, 0, height, 1000, 400);
      const pan = map(tx, 0, width, -1, 1);
      playTone(freq, pan);
    }

    // 안전한 최근접 링크 추가
    const nearestIdx = getNearestIndices(b.position, 2) || [];
    for (const idx of nearestIdx) {
      if (nodes[idx]) {
        const c = Constraint.create({
          bodyA: b,
          bodyB: nodes[idx],
          length: random(60, 120),
          stiffness: LINK_STIFF,
          damping: LINK_DAMP,
        });
        links.push(c);
        Composite.add(world, c);
      }
    }
  }
}

// ----------------------------------------------------
// 🧭 가장 가까운 노드 찾기 (위로 이동함)
// ----------------------------------------------------
function getNearestIndices(pos, k = 2) {
  const arr = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const n = nodes[i];
    const d = dist(pos.x, pos.y, n.position.x, n.position.y);
    arr.push({ i, d });
  }
  arr.sort((a, b) => a.d - b.d);
  return arr.slice(0, k).map((o) => o.i);
}

// ----------------------------------------------------
// ⚙️ 물리 보조 함수들
// ----------------------------------------------------
function makeWalls() {
  if (walls.length) Composite.remove(world, walls);
  const B = 80;
  walls = [
    Bodies.rectangle(width / 2, -B / 2, width + 2 * B, B, { isStatic: true }),
    Bodies.rectangle(width / 2, height + B / 2, width + 2 * B, B, {
      isStatic: true,
    }),
    Bodies.rectangle(-B / 2, height / 2, B, height + 2 * B, { isStatic: true }),
    Bodies.rectangle(width + B / 2, height / 2, B, height + 2 * B, {
      isStatic: true,
    }),
  ];
  Composite.add(world, walls);
}

function makeRandomBody(x, y, seed = 0) {
  const t = seed % 3;
  if (t === 0) {
    const r = random(5, 12);
    return Bodies.circle(x, y, r, { frictionAir: 0.02, restitution: 0.85 });
  } else if (t === 1) {
    const w = random(10, 24);
    const h = random(8, 18);
    const b = Bodies.rectangle(x, y, w, h, {
      frictionAir: 0.025,
      restitution: 0.6,
    });
    b.renderW = w;
    b.renderH = h;
    return b;
  } else {
    const r = random(7, 12);
    return Bodies.polygon(x, y, 6, r, { frictionAir: 0.02, restitution: 0.7 });
  }
}

// ----------------------------------------------------
// ✋ 터치 제스처 (핀치/회전/멀티터치 동작 복원)
// ----------------------------------------------------
function handleTouches() {
  if (touches.length === 0) {
    prevPinchDist = null;
    prevPinchAngle = null;
    return;
  }

  // 한 손가락: 인력 효과
  if (touches.length === 1) {
    const t = touches[0];
    const p = createVector(t.x, t.y);
    for (const node of nodes) {
      const v = createVector(node.position.x, node.position.y);
      const d = p5.Vector.dist(p, v);
      if (d < 170) {
        const dir = p5.Vector.sub(p, v).setMag(0.0009);
        Body.applyForce(node, node.position, { x: dir.x, y: dir.y });
      }
    }
    prevPinchDist = null;
    prevPinchAngle = null;
  }

  // 두 손가락: 확대/축소 + 회전 제스처
  if (touches.length === 2) {
    const t1 = createVector(touches[0].x, touches[0].y);
    const t2 = createVector(touches[1].x, touches[1].y);
    const mid = p5.Vector.add(t1, t2).mult(0.5);
    const curDist = p5.Vector.dist(t1, t2);
    const curAngle = Math.atan2(t2.y - t1.y, t2.x - t1.x);

    // 🔹 핀치 (확대/축소)
    if (prevPinchDist !== null) {
      const dd = curDist - prevPinchDist;
      const s = constrain(dd * 0.00002, -0.002, 0.002);
      for (const node of nodes) {
        const v = createVector(node.position.x, node.position.y);
        const dir = p5.Vector.sub(mid, v).setMag(s);
        Body.applyForce(node, node.position, { x: dir.x, y: dir.y });
      }
    }
    prevPinchDist = curDist;

    // 🔹 회전 (두 손가락 비틀기)
    if (prevPinchAngle !== null) {
      let dTheta = curAngle - prevPinchAngle;
      if (dTheta > PI) dTheta -= TWO_PI;
      if (dTheta < -PI) dTheta += TWO_PI;
      for (const node of nodes) {
        const v = createVector(node.position.x, node.position.y);
        const r = p5.Vector.sub(v, mid);
        if (r.mag() < 260) {
          const tangential = createVector(-r.y, r.x).setMag(dTheta * 0.0008);
          Body.applyForce(node, node.position, {
            x: tangential.x,
            y: tangential.y,
          });
        }
      }
    }
    prevPinchAngle = curAngle;

    // 🔹 시각적 가이드라인 (두 손가락 연결선)
    push();
    stroke(0, 80);
    strokeWeight(1);
    line(t1.x, t1.y, t2.x, t2.y);
    noStroke();
    fill(0);
    circle(t1.x, t1.y, 4);
    circle(t2.x, t2.y, 4);
    pop();
  }

  // 세 손가락 이상: 랜덤 펄스
  if (touches.length >= 3) {
    for (const node of nodes) {
      const kick = p5.Vector.random2D().mult(0.0025);
      Body.applyForce(node, node.position, { x: kick.x, y: kick.y });
    }
    prevPinchDist = null;
    prevPinchAngle = null;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeWalls();
}
