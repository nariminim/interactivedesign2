const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Events = Matter.Events;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Body = Matter.Body;

let engine;
let world;
let W, H;
let mouseConstraint;

let blocks = [];
let particles = [];
let bottomWall;

const MONDRIAAN_COLORS = [
  [255, 0, 0],
  [0, 0, 255],
  [255, 255, 0],
];
const WALL_THICKNESS = 10;

let flashColor = null;
let flashAlpha = 0;
const FLASH_DECAY_RATE = 25;

function setup() {
  const canvas = createCanvas(windowWidth - 1, windowHeight - 1);
  W = windowWidth - 1;
  H = windowHeight - 1;

  canvas.style("display", "block");
  background(255);

  rectMode(CENTER);

  engine = Engine.create({
    render: { visible: false },
  });
  world = engine.world;
  world.gravity.y = 1;

  createBoundaryWalls();
  setupCollisionListener();
  setupMouseInteraction(canvas);
}

function setupMouseInteraction(canvas) {
  const mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();

  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false,
      },
    },
  });

  Composite.add(world, mouseConstraint);
}

function draw() {
  background(255);
  renderFlashEffect();
  Engine.update(engine);
  renderBlocks();
  updateAndRenderParticles();
  renderFrame();
  cleanupOffScreenBlocks();
}

function createBoundaryWalls() {
  const t = WALL_THICKNESS * 2;
  const wallOptions = {
    isStatic: true,
    render: { fillStyle: 0 },
    label: "Wall",
  };

  bottomWall = Bodies.rectangle(W / 2, H + t / 2, W, t, {
    isStatic: true,
    render: { fillStyle: 0 },
    label: "BottomWall",
  });

  Composite.add(world, [
    bottomWall,
    Bodies.rectangle(W / 2, -t / 2, W, t, wallOptions),
    Bodies.rectangle(-t / 2, H / 2, t, H, wallOptions),
    Bodies.rectangle(W + t / 2, H / 2, t, H, wallOptions),
  ]);
}

function createRandomBlock(x, y) {
  const size = random(80, 160);
  const color = MONDRIAAN_COLORS[floor(random(MONDRIAAN_COLORS.length))];

  const block = Bodies.rectangle(x, y, size, size, {
    density: 0.001,
    frictionAir: 0.01,
    restitution: 0.1,
    friction: 0.5,
    label: "FallingBlock",
  });

  block.color = color;
  block.w = size;
  block.h = size;

  blocks.push(block);
  Composite.add(world, block);
}

function mousePressed() {
  if (!mouseConstraint.body) {
    if (mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H) {
      createRandomBlock(mouseX, mouseY);
    }
  }
}

function touchStarted() {
  if (touches.length > 0) {
    const touchX = touches[0].x;
    const touchY = touches[0].y;

    if (
      !mouseConstraint.body &&
      touchX >= 0 &&
      touchX <= W &&
      touchY >= 0 &&
      touchY <= H
    ) {
      createRandomBlock(touchX, touchY);
    }
    return false;
  }
}

function setupCollisionListener() {
  Events.on(engine, "collisionStart", (event) => {
    const pairs = event.pairs;

    pairs.forEach((pair) => {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      let block = null;
      let other = null;

      if (bodyA.label === "FallingBlock" && bodyB.label === "BottomWall") {
        block = bodyA;
        other = bodyB;
      } else if (
        bodyB.label === "FallingBlock" &&
        bodyA.label === "BottomWall"
      ) {
        block = bodyB;
        other = bodyA;
      }

      if (block && other.label === "BottomWall") {
        explodeBlock(block);
        startFlashEffect(block.color);
        removeBlock(block);
      }
    });
  });
}

function removeBlock(block) {
  Composite.remove(world, block);
  const index = blocks.findIndex((b) => b.id === block.id);
  if (index !== -1) {
    blocks.splice(index, 1);
  }
}

function cleanupOffScreenBlocks() {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (block.position.y > H + 50) {
      removeBlock(block);
    }
  }
}

class Particle {
  constructor(x, y, color) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-5, 5), random(-5, -1));
    this.acc = createVector(0, 0.1);
    this.life = 255;
    this.size = random(3, 8);
    this.color = color;
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.life -= 4;
  }

  render() {
    push();
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], this.life);
    ellipse(this.pos.x, this.pos.y, this.size);
    pop();
  }

  isFinished() {
    return this.life < 0;
  }
}

function explodeBlock(block) {
  const explosionCount = 20;
  const blockColor = block.color;

  for (let i = 0; i < explosionCount; i++) {
    particles.push(
      new Particle(block.position.x, block.position.y, blockColor)
    );
  }
}

function updateAndRenderParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.render();

    if (p.isFinished()) {
      particles.splice(i, 1);
    }
  }
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
    rotate(block.angle);
    rect(0, 0, block.w, block.h);
    pop();
  }
}

function startFlashEffect(color = null) {
  if (color) {
    flashColor = color;
  } else {
    flashColor = MONDRIAAN_COLORS[floor(random(MONDRIAAN_COLORS.length))];
  }
  flashAlpha = 255;
}

function renderFlashEffect() {
  if (flashColor && flashAlpha > 0) {
    push();
    noStroke();
    fill(flashColor[0], flashColor[1], flashColor[2], flashAlpha);
    rect(W / 2, H / 2, W, H);
    pop();

    flashAlpha -= FLASH_DECAY_RATE;
    if (flashAlpha < 0) {
      flashAlpha = 0;
      flashColor = null;
    }
  }
}

function renderFrame() {
  stroke(0);
  strokeWeight(WALL_THICKNESS);
  noFill();
  rectMode(CENTER);
  rect(W / 2, H / 2, W - WALL_THICKNESS, H - WALL_THICKNESS);

  strokeWeight(1);
  line(0, H - WALL_THICKNESS, W, H - WALL_THICKNESS);
}

function windowResized() {
  resizeCanvas(windowWidth - 1, windowHeight - 1);
  W = windowWidth - 1;
  H = windowHeight - 1;

  Composite.clear(world, true);
  blocks = [];
  particles = [];

  createBoundaryWalls();
}
