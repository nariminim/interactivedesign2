// page5: Vertical Bands – Recompose
// 세로 밴드 5열 기준으로 원들이 정렬/해체를 반복

let Engine, World, Bodies, Body_, Composite;
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

let dots = [],
  mode = 1; // 1=정렬(모으기), -1=해체(흩어짐)
const COLS = 5,
  ROWS = 10;

function setup() {
  createCanvas(windowWidth, windowHeight);
  ({ Engine, World, Bodies, Body, Composite } = Matter);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;
  makeBounds();

  // 타겟 격자 생성(세로 밴드)
  const marginX = width * 0.08;
  const marginY = height * 0.1;
  const gw = width - marginX * 2;
  const gh = height - marginY * 2;

  const colX = [];
  for (let c = 0; c < COLS; c++) colX.push(marginX + (gw / (COLS - 1)) * c);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = random(width),
        y = random(height); // 처음엔 랜덤 위치
      const b = Bodies.circle(x, y, random(10, 18), { frictionAir: 0.03 });
      b.render = { fillStyle: PALETTE[(c + r) % PALETTE.length] };
      b.target = {
        x: colX[c],
        y: marginY + (gh / (ROWS - 1)) * r + (c % 2 ? 8 : -8), // 살짝 어긋나게
      };
      World.add(world, b);
      dots.push(b);
    }
  }
}

function draw() {
  background(247);
  Engine.update(engine, 1000 / 60);

  // 정렬/해체 힘 적용
  for (const p of dots) {
    const to =
      mode > 0
        ? p.target
        : {
            x:
              p.position.x +
              (noise(p.position.y * 0.005, frameCount * 0.003) - 0.5) * 60,
            y:
              p.position.y +
              (noise(p.position.x * 0.005, frameCount * 0.003 + 7) - 0.5) * 60,
          };
    const dx = to.x - p.position.x,
      dy = to.y - p.position.y;
    const len = Math.hypot(dx, dy) + 1e-6;
    const k = mode > 0 ? 0.00018 : 0.00005; // 모으기일 때 더 강하게
    Body.applyForce(p, p.position, { x: (dx / len) * k, y: (dy / len) * k });

    noStroke();
    fill(p.render.fillStyle || 230);
    circle(p.position.x, p.position.y, p.circleRadius * 2);
  }

  // 밴드 가이드(아주 옅게)
  push();
  noStroke();
  for (let c = 0; c < COLS; c++) {
    const x = lerp(width * 0.08, width - width * 0.08, c / (COLS - 1));
    fill(0, 8);
    rect(x - 2, 0, 4, height);
  }
  pop();
}

function touchStarted() {
  mode *= -1;
}

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
