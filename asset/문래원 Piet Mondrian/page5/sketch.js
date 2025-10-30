const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;

let engine;
let world;
let W, H;

let isDrawing = false;
let startX, startY;
let currentX, currentY;

let blocks = [];
let ground;

const WALL_THICKNESS = 20;
const BLOCK_MIN_SIZE = 10;
const BLOCK_MAX_SIZE = 300;

const MONDRIAAN_COLORS = [
  [255, 0, 0],
  [0, 0, 255],
  [255, 255, 0],
  [255, 255, 255],
];

function setup() {
  W = windowWidth - 1;
  H = windowHeight - 1;

  const canvas = createCanvas(W, H);
  canvas.style("display", "block");
  canvas.parent(select("main"));

  rectMode(CENTER);
  angleMode(RADIANS);

  engine = Engine.create({ render: { visible: false } });
  world = engine.world;
  world.gravity.y = 1;

  createGround();
}

function draw() {
  background(255);

  Engine.update(engine);

  renderBlocks();
  drawDragPreview();
  renderFrame();
  cleanupOffScreenBlocks();
}

function createGround() {
  const groundThickness = WALL_THICKNESS * 2;
  if (ground && world) {
    Composite.remove(world, ground);
  }
  ground = Bodies.rectangle(
    W / 2,
    H + groundThickness / 2 - 10,
    W * 1.5,
    groundThickness,
    {
      isStatic: true,
      label: "Ground",
      render: { visible: false },
    }
  );
  Composite.add(world, ground);
}

function createDraggedBlock(centerX, startY, blockW, blockH) {
  blockW = constrain(blockW, BLOCK_MIN_SIZE, BLOCK_MAX_SIZE);
  blockH = constrain(blockH, BLOCK_MIN_SIZE, BLOCK_MAX_SIZE);

  const creationY = startY - blockH / 2 - 10;

  const colorIndex = floor(random(MONDRIAAN_COLORS.length));
  const blockColor = MONDRIAAN_COLORS[colorIndex];

  let blockOptions = {
    density: 0.002,
    frictionAir: 0.005,
    restitution: 0.3,
    friction: 0.7,
    label: "MondrianBlock",
    isStatic: false,
  };

  switch (colorIndex) {
    case 0:
      blockOptions.restitution = 1.1;
      blockOptions.friction = 0.1;
      blockOptions.density = 0.0015;
      break;
    case 1:
      blockOptions.density = 0.05;
      blockOptions.friction = 0.95;
      blockOptions.restitution = 0.01;
      break;
    case 2:
      blockOptions.friction = 0.005;
      blockOptions.restitution = 0.7;
      blockOptions.density = 0.001;
      break;
    case 3:
      break;
  }

  const block = Bodies.rectangle(
    centerX,
    creationY,
    blockW,
    blockH,
    blockOptions
  );

  block.color = blockColor;
  block.w = blockW;
  block.h = blockH;

  blocks.push(block);
  Composite.add(world, block);
}

function mousePressed() {
  if (mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H) {
    startX = mouseX;
    startY = mouseY;
    currentX = mouseX;
    currentY = mouseY;
    isDrawing = true;
  }
}
function mouseDragged() {
  if (isDrawing) {
    currentX = mouseX;
    currentY = mouseY;
  }
}
function mouseReleased() {
  if (isDrawing) {
    isDrawing = false;

    const sx = min(startX, currentX);
    const sy = min(startY, currentY);
    const rectW = abs(currentX - startX);
    const rectH = abs(currentY - startY);

    if (rectW > 5 && rectH > 5) {
      const centerX = sx + rectW / 2;
      createDraggedBlock(centerX, sy, rectW, rectH);
    }
  }
}
function touchStarted() {
  if (touches.length > 0) {
    const touchX = touches[0].x;
    const touchY = touches[0].y;
    if (touchX >= 0 && touchX <= W && touchY >= 0 && touchY <= H) {
      startX = touchX;
      startY = touchY;
      currentX = touchX;
      currentY = touchY;
      isDrawing = true;
    }
    return false;
  }
}
function touchMoved() {
  if (isDrawing && touches.length > 0) {
    currentX = touches[0].x;
    currentY = touches[0].y;
  }
  return false;
}
function touchEnded() {
  mouseReleased();
  return false;
}

function renderBlocks() {
  rectMode(CENTER);
  blocks.forEach((block) => {
    push();
    const pos = block.position;
    const angle = block.angle;

    translate(pos.x, pos.y);
    rotate(angle);

    fill(block.color[0], block.color[1], block.color[2]);
    stroke(0);
    strokeWeight(4);

    rect(0, 0, block.w, block.h);

    pop();
  });
}

function drawDragPreview() {
  if (isDrawing) {
    push();
    rectMode(CORNER);
    fill(150, 150, 150, 100);
    stroke(0);
    strokeWeight(2);
    const sx = min(startX, currentX);
    const sy = min(startY, currentY);
    const rectW = abs(currentX - startX);
    const rectH = abs(currentY - startY);
    rect(sx, sy, rectW, rectH);
    pop();
  }
}
function renderFrame() {
  push();
  noFill();
  strokeWeight(WALL_THICKNESS);
  stroke(0);
  rectMode(CENTER);
  rect(W / 2, H / 2, W, H);
  pop();
}

function cleanupOffScreenBlocks() {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].position.y > H + 100) {
      Composite.remove(world, blocks[i]);
      blocks.splice(i, 1);
    }
  }
}

function windowResized() {
  W = windowWidth - 1;
  H = windowHeight - 1;
  resizeCanvas(W, H);

  Composite.clear(world, false);
  blocks = [];

  if (ground && world.bodies.includes(ground)) {
    Composite.remove(world, ground);
  }
  createGround();
}
