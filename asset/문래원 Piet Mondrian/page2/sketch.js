const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;

let engine;
let world;
let canvas;
let initialBlocks = [];
let shatteredPieces = [];

let W, H;

let synth;

const colors = [
  [255, 0, 0],
  [255, 255, 0],
  [0, 0, 255],
];
const white = [255, 255, 255];
const black = [0, 0, 0];

const WALL_THICKNESS = 35;
const RESPAWN_DELAY = 4000;

if (typeof Tone === "undefined") {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js";
  document.head.appendChild(script);
  script.onload = () => {};
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  W = windowWidth;
  H = windowHeight;

  engine = Engine.create();
  world = engine.world;

  world.gravity.y = 1;

  if (typeof Tone !== "undefined") {
    synth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.01,
        amplitude: 1.5,
      },
    }).toDestination();
  }

  createInitialComposition();
}

function draw() {
  background(0);
  Engine.update(engine, 1000 / 60);
  renderFrame();

  for (let i = initialBlocks.length - 1; i >= 0; i--) {
    let block = initialBlocks[i];

    if (block.isVisible) {
      renderBody(block.body, block.color);
    } else if (millis() >= block.respawnTime) {
      block.isVisible = true;
      Body.setPosition(block.body, block.originalPosition);
      Body.setAngle(block.body, 0);
      Composite.add(world, block.body);

      shatteredPieces = shatteredPieces.filter((piece) => {
        if (piece.respawnTime === block.respawnTime) {
          Composite.remove(world, piece.body);
          return false;
        }
        return true;
      });
    }
  }

  for (let piece of shatteredPieces) {
    renderBody(piece.body, piece.color);
  }

  shatteredPieces = shatteredPieces.filter(
    (piece) => piece.body.position.y < H + 100
  );
}

function createInitialComposition() {
  Composite.clear(world, false);
  initialBlocks = [];
  shatteredPieces = [];

  createBoundaryWalls();

  const cw = W;
  const ch = H;
  const padding = 10;
  const p = padding / 2;

  const x1 = cw * 0.4;
  const x2 = cw * 0.65;
  const x3 = cw * 0.8;

  const y1 = ch * 0.33;
  const y2 = ch * 0.58;
  const y3 = ch * 0.8;

  addBlock(x1 / 2, y2 / 2, x1 - p * 2, y2 - p * 2, colors[0]);

  addBlock(x1 / 2, (y2 + ch) / 2, x1 - p * 2, ch - y2 - p * 2, white);

  addBlock((x1 + x2) / 2, y1 / 2, x2 - x1 - p * 2, y1 - p * 2, colors[1]);

  addBlock(
    (x1 + x2) / 2,
    (y1 + y3) / 2,
    x2 - x1 - p * 2,
    y3 - y1 - p * 2,
    colors[2]
  );

  addBlock(
    (x1 + x2) / 2,
    (y3 + ch) / 2,
    x2 - x1 - p * 2,
    ch - y3 - p * 2,
    white
  );

  addBlock((x2 + x3) / 2, y1 / 2, x3 - x2 - p * 2, y1 - p * 2, white);
  addBlock((x3 + cw) / 2, y1 / 2, cw - x3 - p * 2, y1 - p * 2, white);

  addBlock(
    (x2 + x3) / 2,
    (y1 + y2) / 2,
    x3 - x2 - p * 2,
    y2 - y1 - p * 2,
    colors[0]
  );
  addBlock(
    (x3 + cw) / 2,
    (y1 + y2) / 2,
    cw - x3 - p * 2,
    y2 - y1 - p * 2,
    white
  );

  addBlock(
    (x2 + x3) / 2,
    (y2 + y3) / 2,
    x3 - x2 - p * 2,
    y3 - y2 - p * 2,
    white
  );
  addBlock(
    (x3 + cw) / 2,
    (y2 + y3) / 2,
    cw - x3 - p * 2,
    y3 - y2 - p * 2,
    colors[1]
  );

  addBlock(
    (x2 + x3) / 2,
    (y3 + ch) / 2,
    x3 - x2 - p * 2,
    ch - y3 - p * 2,
    black
  );
  addBlock(
    (x3 + cw) / 2,
    (y3 + ch) / 2,
    cw - x3 - p * 2,
    ch - y3 - p * 2,
    colors[2]
  );
}

function addBlock(x, y, w, h, color) {
  if (w < 10 || h < 10) return;

  const blockBody = Bodies.rectangle(x, y, w, h, {
    isStatic: true,
    friction: 0.8,
    collisionFilter: { group: -1 },
  });
  Composite.add(world, blockBody);
  initialBlocks.push({
    body: blockBody,
    color: color,
    isVisible: true,
    originalPosition: { x: x, y: y },
    w: w,
    h: h,
    respawnTime: 0,
  });
}

function explodeBlock(x, y) {
  if (typeof Tone !== "undefined") {
    if (Tone.context.state !== "running") {
      Tone.start();
    }
  }

  let targetBlock = null;

  for (let i = 0; i < initialBlocks.length; i++) {
    const block = initialBlocks[i];
    if (
      block.isVisible &&
      Matter.Bounds.contains(block.body.bounds, { x: x, y: y })
    ) {
      targetBlock = block;
      break;
    }
  }

  if (targetBlock) {
    if (synth) {
      synth.triggerAttackRelease("8n");
    }
    targetBlock.isVisible = false;
    targetBlock.respawnTime = millis() + RESPAWN_DELAY;
    Composite.remove(world, targetBlock.body);

    const pieceCount = 20 + Math.floor(targetBlock.w / 20);
    const explosionCenter = targetBlock.body.position;
    const explosionForce = 0.5;

    for (let i = 0; i < pieceCount; i++) {
      const pieceW = random(5, 15);
      const pieceH = random(5, 15);
      const pieceBody = Bodies.rectangle(
        explosionCenter.x,
        explosionCenter.y,
        pieceW,
        pieceH,
        {
          friction: 0.5,
          restitution: 0.6,
          density: 0.01,
          collisionFilter: { group: -1 },
        }
      );

      const angle = random(0, TWO_PI);
      const force = {
        x: explosionForce * cos(angle),
        y: explosionForce * sin(angle) - 0.5,
      };
      Body.applyForce(pieceBody, explosionCenter, force);

      Composite.add(world, pieceBody);
      shatteredPieces.push({
        body: pieceBody,
        color: targetBlock.color,
        respawnTime: targetBlock.respawnTime,
      });
    }
  }
}

function mousePressed() {
  if (mouseX > 0 && mouseX < W && mouseY > 0 && mouseY < H) {
    explodeBlock(mouseX, mouseY);
  }
}

function touchStarted() {
  if (touches.length > 0) {
    const touchX = touches[0].x;
    const touchY = touches[0].y;
    if (touchX > 0 && touchX < W && touchY > 0 && touchY < H) {
      explodeBlock(touchX, touchY);
    }
    return false;
  }
}

function renderBody(body, color) {
  const vertices = body.vertices;
  fill(color[0], color[1], color[2]);

  stroke(0);
  strokeWeight(2);

  beginShape();
  for (let i = 0; i < vertices.length; i++) {
    vertex(vertices[i].x, vertices[i].y);
  }
  endShape(CLOSE);
}

function createBoundaryWalls() {
  const w = W;
  const h = H;
  const t = WALL_THICKNESS;

  const wallOptions = { isStatic: true, render: { fillStyle: 0 } }; // "#000000" -> 0

  Composite.add(world, Bodies.rectangle(w / 2, h + t / 2, w, t, wallOptions));
  Composite.add(world, Bodies.rectangle(w / 2, -t / 2, w, t, wallOptions));
  Composite.add(world, Bodies.rectangle(-t / 2, h / 2, t, h, wallOptions));
  Composite.add(world, Bodies.rectangle(w + t / 2, h / 2, t, h, wallOptions));
}

function renderFrame() {
  stroke(0);
  strokeWeight(WALL_THICKNESS);
  noFill();
  rect(0, 0, W, H);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  W = windowWidth;
  H = windowHeight;
  createInitialComposition();
}
