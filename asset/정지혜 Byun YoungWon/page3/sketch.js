// page3: Circular Colony – Spawn, Gather & Flash Burst ver.
// 터치할수록 화면 밖에서 공이 날아오며 중심으로 모이고, 너무 모이면 밝게 번쩍하며 일부 흩어짐

let Engine, World, Bodies, Body, Composite;
let engine, world;
const PALETTE = [
  "#F5F1E8",
  "#DDEBE5",
  "#E7F1F4",
  "#F3E8ED",
  "#CFE7E2",
  "#DCE8FF",
  "#9BC7E7",
  "#7AB9A3",
  "#E9D4E8",
];

let modules = [];
let anchor;
let tight = 0.6;
let flashAlpha = 0; // 번쩍임 투명도
const MAX_MODULES = 300; // 너무 많이 쌓이지 않게 제한

function setup() {
  createCanvas(windowWidth, windowHeight);
  ({ Engine, World, Bodies, Body, Composite } = Matter);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;
  makeBounds();

  anchor = createVector(width / 2, height / 2);
  spawnInitial(90); // 초기 군집
}

function draw() {
  background(247);

  Engine.update(engine, 1000 / 60);
  const t = millis() * 0.00035;

  // 군집 업데이트
  for (const m of modules) {
    const dx = anchor.x - m.position.x;
    const dy = anchor.y - m.position.y;
    const distToAnchor = Math.hypot(dx, dy) + 1e-6;

    // 중심으로 끌리는 힘 (tight가 클수록 강해짐)
    const k = 0.00012 * tight;
    Body.applyForce(m, m.position, {
      x: (dx / distToAnchor) * k,
      y: (dy / distToAnchor) * k,
    });

    // 미세한 진동 (유기적 움직임)
    const nx = noise(m.position.y * 0.003, t) - 0.5;
    const ny = noise(m.position.x * 0.003, t + 3) - 0.5;
    Body.applyForce(m, m.position, { x: nx * 0.00008, y: ny * 0.00008 });

    // 중심 가까울수록 팽창
    const proximity = map(distToAnchor, 0, width * 0.4, 1.0, 3.5);
    const eased = pow(1 / proximity, 1.3);
    const scale = lerp(1, 3.2, eased);

    noStroke();
    fill(m.render.fillStyle || 230);
    circle(m.position.x, m.position.y, m.circleRadius * 2 * scale);
  }

  // ⚡ 번쩍임 효과
  if (flashAlpha > 0) {
    fill(255, 255, 255, flashAlpha);
    rect(0, 0, width, height);
    flashAlpha -= 8;
  }

  // 💥 군집 과밀 시 자동 폭발/리셋
  if (modules.length > MAX_MODULES) triggerBurst();
}

// 🟢 터치 시 더 강한 흡입력 + 외부에서 공 생성
function touchStarted() {
  tight = constrain(tight + 0.4, 0.5, 4.0);
  spawnOutside(30); // 터치마다 30개 날아오게
  anchor.set(mouseX, mouseY);
}
function touchMoved() {
  anchor.set(mouseX, mouseY);
}

// 💥 화면 밖에서 랜덤하게 공 생성 → 중심으로 향함
function spawnOutside(n) {
  for (let i = 0; i < n; i++) {
    const side = floor(random(4));
    let x, y;
    if (side === 0) (x = random(width)), (y = -50);
    else if (side === 1) (x = random(width)), (y = height + 50);
    else if (side === 2) (x = -50), (y = random(height));
    else (x = width + 50), (y = random(height));

    const b = Bodies.circle(x, y, random(6, 12), {
      restitution: 0.2,
      frictionAir: 0.02,
    });
    b.render = { fillStyle: random(PALETTE) };
    World.add(world, b);
    modules.push(b);

    // 중심으로 향하는 초기 힘
    const dir = createVector(anchor.x - x, anchor.y - y)
      .normalize()
      .mult(0.05);
    Body.applyForce(b, b.position, { x: dir.x, y: dir.y });
  }
}

// 💫 초기 생성
function spawnInitial(n) {
  const radius = min(width, height) * 0.35;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + random(-0.03, 0.03);
    const r = radius * random(0.35, 1);
    const x = anchor.x + cos(a) * r;
    const y = anchor.y + sin(a) * r;
    const b = Bodies.circle(x, y, random(6, 12), {
      restitution: 0.2,
      frictionAir: 0.02,
    });
    b.render = { fillStyle: random(PALETTE) };
    World.add(world, b);
    modules.push(b);
  }
}

// ⚡ 군집이 너무 많아지면 “번쩍 + 흩어짐”
function triggerBurst() {
  flashAlpha = 180; // 밝게 번쩍
  tight = 0.6; // 결집력 리셋

  // 일부 공 흩어지게
  for (let i = modules.length - 1; i >= 0; i--) {
    if (random() < 0.5) {
      const m = modules[i];
      const angle = random(TAU);
      const force = random(0.003, 0.009);
      Body.applyForce(m, m.position, {
        x: cos(angle) * force,
        y: sin(angle) * force,
      });
    }
  }

  // 너무 많은 공 제거
  modules = modules.slice(-MAX_MODULES / 2);
}

// 경계
function makeBounds() {
  const th = 80;
  World.add(world, [
    Matter.Bodies.rectangle(width / 2, -th / 2, width, th, { isStatic: true }),
    Matter.Bodies.rectangle(width / 2, height + th / 2, width, th, {
      isStatic: true,
    }),
    Matter.Bodies.rectangle(-th / 2, height / 2, th, height, {
      isStatic: true,
    }),
    Matter.Bodies.rectangle(width + th / 2, height / 2, th, height, {
      isStatic: true,
    }),
  ]);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  Composite.allBodies(world)
    .filter((b) => b.isStatic)
    .forEach((b) => Composite.remove(world, b));
  makeBounds();
}
