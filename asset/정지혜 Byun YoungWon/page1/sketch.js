// page1: Soft Circles – Drop (Click to spawn + stacking)

let Engine, World, Bodies, Body, Composite, Mouse, MouseConstraint, Events;
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

function setup() {
  createCanvas(windowWidth, windowHeight);
  initMatter();

  // 초기에 몇 개만 떨어져 있는 상태로 시작
  for (let i = 0; i < 10; i++) spawn(random(width), random(-200, -40));
}

function draw() {
  background(247);
  Engine.update(engine, 1000 / 60);

  noStroke();
  const bodies = Composite.allBodies(world).filter((b) => !b.isStatic);

  // 공 그리기
  for (const b of bodies) {
    push();
    translate(b.position.x, b.position.y);
    rotate(b.angle);
    fill(b.render?.fillStyle || 230);
    circle(0, 0, (b.circleRadius || 10) * 2);
    pop();
  }

  // 너무 멀리 아래로 간 공은 제거 (성능 보호)
  for (const b of bodies) {
    if (b.position.y > height * 3) {
      Composite.remove(world, b);
    }
  }
}

// 🟡 클릭(터치) 시 새 공 생성
function mousePressed() {
  spawn(mouseX, mouseY);
}

// 🟣 터치 디바이스 대응 (모바일)
function touchStarted() {
  spawn(mouseX, mouseY);
  return false;
}

function spawn(x, y) {
  const r = random(14, 36);
  const c = Bodies.circle(x, y, r, {
    restitution: 0.15,
    frictionAir: 0.03,
  });
  c.render = { fillStyle: random(PALETTE) };
  World.add(world, c);
}

function initMatter() {
  ({ Engine, World, Bodies, Body, Composite, Mouse, MouseConstraint, Events } =
    Matter);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0.35; // 부드러운 낙하
  makeBounds();

  // 마우스로 공 잡기 (선택적으로 끌기 가능)
  const mouse = Mouse.create(canvas.elt);
  const mc = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2 },
  });
  World.add(world, mc);

  // 기울기(모바일)로 중력 방향 변경
  if (window.DeviceOrientationEvent) {
    window.addEventListener(
      "deviceorientation",
      (e) => {
        const gx = constrain(e.gamma || 0, -30, 30) / 30;
        const gy = constrain(e.beta || 0, -30, 30) / 30;
        world.gravity.x = gx;
        world.gravity.y = 0.35 + gy * 0.35;
      },
      true
    );
  }
}

function makeBounds() {
  const thick = 80;
  const ground = Bodies.rectangle(width / 2, height + thick / 2, width, thick, {
    isStatic: true,
  });
  const ceil = Bodies.rectangle(width / 2, -thick / 2, width, thick, {
    isStatic: true,
  });
  const left = Bodies.rectangle(-thick / 2, height / 2, thick, height * 2, {
    isStatic: true,
  });
  const right = Bodies.rectangle(
    width + thick / 2,
    height / 2,
    thick,
    height * 2,
    {
      isStatic: true,
    }
  );
  World.add(world, [ground, ceil, left, right]);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 기존 경계 제거 후 재생성
  Composite.allBodies(world)
    .filter((b) => b.isStatic)
    .forEach((b) => Composite.remove(world, b));
  makeBounds();
}
