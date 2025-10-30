const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;
const Events = Matter.Events;
const Vector = Matter.Vector;

let engine;
let world;
let W, H;

let blocks = [];

const MONDRIAAN_COLORS = [
  [255, 0, 0],
  [0, 0, 255],
  [255, 255, 0],
];
const WALL_THICKNESS = 10;
const SPONTANEOUS_FORCE_MAGNITUDE = 0.0001;
const REPULSION_VELOCITY = 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  W = windowWidth;
  H = windowHeight;
  rectMode(CENTER);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;

  createBoundaryWalls();
  createInitialBlocks(4);
  setupCollisionListener();
}

function draw() {
  background(255);

  applySpontaneousForce();
  Engine.update(engine);
  renderBlocks();
  renderFrame();
}

function createBoundaryWalls() {
  const t = WALL_THICKNESS * 2;
  const wallOptions = {
    isStatic: true,
    restitution: 1.0,
    friction: 0.0,
    render: { fillStyle: 0 },
    label: "Wall",
  };

  Composite.add(world, [
    Bodies.rectangle(W / 2, H + t / 2, W, t, wallOptions),
    Bodies.rectangle(W / 2, -t / 2, W, t, wallOptions),
    Bodies.rectangle(-t / 2, H / 2, t, H, wallOptions),
    Bodies.rectangle(W + t / 2, H / 2, t, H, wallOptions),
  ]);
}

function createRandomBlock(x, y) {
  const size = random(50, 150);
  const color = MONDRIAAN_COLORS[floor(random(MONDRIAAN_COLORS.length))];

  const block = Bodies.rectangle(x, y, size, size, {
    density: 0.001,
    frictionAir: 0.001,
    restitution: 1.0,
    friction: 0.0,
    label: "FloatingBlock",
    inertia: Infinity,
  });

  block.color = color;
  block.w = size;
  block.h = size;

  blocks.push(block);
  Composite.add(world, block);
}

function createInitialBlocks(count) {
  for (let i = 0; i < count; i++) {
    const x = random(W * 0.2, W * 0.8);
    const y = random(H * 0.2, H * 0.8);
    createRandomBlock(x, y);
  }
}

function mousePressed() {
  if (
    mouseX >= WALL_THICKNESS &&
    mouseX <= W - WALL_THICKNESS &&
    mouseY >= WALL_THICKNESS &&
    mouseY <= H - WALL_THICKNESS
  ) {
    createRandomBlock(mouseX, mouseY);
  }
}

function touchStarted() {
  if (touches.length > 0) {
    const touchX = touches[0].x;
    const touchY = touches[0].y;
    if (
      touchX >= WALL_THICKNESS &&
      touchX <= W - WALL_THICKNESS &&
      touchY >= WALL_THICKNESS &&
      touchY <= H - WALL_THICKNESS
    ) {
      createRandomBlock(touchX, touchY);
    }
    return false;
  }
}

function applySpontaneousForce() {
  blocks.forEach((block) => {
    const forceX = random(-1, 1) * SPONTANEOUS_FORCE_MAGNITUDE;
    const forceY = random(-1, 1) * SPONTANEOUS_FORCE_MAGNITUDE;

    Body.applyForce(block, block.position, {
      x: forceX * block.mass,
      y: forceY * block.mass,
    });
  });
}

function setupCollisionListener() {
  Events.on(engine, "collisionStart", (event) => {
    const pairs = event.pairs;

    pairs.forEach((pair) => {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      let blockToInteract = null;
      let otherBody = null;

      if (bodyA.label === "FloatingBlock") {
        blockToInteract = bodyA;
        otherBody = bodyB;
      } else if (bodyB.label === "FloatingBlock") {
        blockToInteract = bodyB;
        otherBody = bodyA;
      }

      if (blockToInteract && otherBody.label === "FloatingBlock") {
        const newColorA =
          MONDRIAAN_COLORS[floor(random(MONDRIAAN_COLORS.length))];
        const newColorB =
          MONDRIAAN_COLORS[floor(random(MONDRIAAN_COLORS.length))];
        const blockObjA = blocks.find((b) => b.id === bodyA.id);
        const blockObjB = blocks.find((b) => b.id === bodyB.id);

        // 1페이지의 'color' 속성명과 일치
        if (blockObjA) blockObjA.color = newColorA; // 'p5Color' -> 'color'
        if (blockObjB) blockObjB.color = newColorB; // 'p5Color' -> 'color'

        const vecDirectionA = Vector.sub(bodyA.position, bodyB.position);
        const vecDirectionB = Vector.sub(bodyB.position, bodyA.position);

        if (Vector.magnitudeSquared(vecDirectionA) < 0.01) return;

        const normalizedDirectionA = Vector.normalise(vecDirectionA);
        const normalizedDirectionB = Vector.normalise(vecDirectionB);

        const currentVelocityA = bodyA.velocity;
        const newVelocityA = Vector.add(
          currentVelocityA,
          Vector.mult(normalizedDirectionA, REPULSION_VELOCITY)
        );
        Body.setVelocity(bodyA, newVelocityA);

        const currentVelocityB = bodyB.velocity;
        const newVelocityB = Vector.add(
          currentVelocityB,
          Vector.mult(normalizedDirectionB, REPULSION_VELOCITY)
        );
        Body.setVelocity(bodyB, newVelocityB);
      } else if (blockToInteract && otherBody.label === "Wall") {
      }
    });
  });
}

function renderBlocks() {
  rectMode(CENTER);
  for (let block of blocks) {
    push();
    const c = block.color;
    fill(c[0], c[1], c[2], 255);
    stroke(0);
    strokeWeight(4);
    translate(block.position.x, block.position.y);
    rect(0, 0, block.w, block.h);
    pop();
  }
}

function renderFrame() {
  stroke(0);
  strokeWeight(WALL_THICKNESS);
  noFill();
  rectMode(CENTER);
  rect(W / 2, H / 2, W - WALL_THICKNESS, H - WALL_THICKNESS);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  W = windowWidth;
  H = windowHeight;

  Composite.clear(world, true);
  blocks = [];
  createBoundaryWalls();
  createInitialBlocks(4);
}
