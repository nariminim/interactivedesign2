function make2DArray(cols, rows) {
  let arr = new Array(cols);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(rows);
    for (let j = 0; j < arr[i].length; j++) arr[i][j] = 0;
  }
  return arr;
}

let grid, velocityGrid;
let w = 10;
let cols, rows;
let hueValue = 200;

function withinCols(i) {
  return i >= 0 && i <= cols - 1;
}
function withinRows(j) {
  return j >= 0 && j <= rows - 1;
}

const {
  Engine,
  World,
  Bodies,
  Body,
  Composite,
  Composites,
  Constraint,
  Mouse,
  MouseConstraint,
  Vector,
} = Matter;

let engine, world;
let mConstraint;

let particles = [];
const MAX_BODIES = 3000;
const SPAWN_LIMIT_PER_FRAME = 200;

let ground, wallL, wallR;

const RISE_DELAY_MS = 2200;
const RISE_RAMP_MS = 3000;
const BUOYANCY_MULT = 1.1;

const GRAVITY_DOWN = 1.8;
const FALL_AIR = 0.01;
const RISE_AIR = 0.3;

const MIN_FALL_PX = 140;

let canvas;

let sandSound;
let lastGrainAt = 0;
const SOUND_INTERVAL_MS = 40;
function preload() {
  sandSound = loadSound("sand.wav");
}

function maybePlaySand(grains = 1) {
  if (!sandSound) return;
  const now = millis();
  if (now - lastGrainAt < SOUND_INTERVAL_MS) return;

  const vol = constrain(0.12 + 0.03 * Math.sqrt(grains), 0.05, 0.4);
  const rate = random(0.9, 1.15);
  const pan = map(mouseX || 0, 0, width || 1, -0.6, 0.6, true);

  sandSound.setVolume(vol);
  sandSound.rate(rate);
  sandSound.pan(pan);

  sandSound.playMode("restart");
  sandSound.play();

  lastGrainAt = now;
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 255, 255);
  pixelDensity(2);
  noStroke();
  canvas.elt.style.touchAction = "none";

  cols = floor(width / w);
  rows = floor(height / w);
  grid = make2DArray(cols, rows);
  velocityGrid = make2DArray(cols, rows);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = GRAVITY_DOWN;

  const thickness = 60;
  ground = Bodies.rectangle(
    width / 2,
    height + thickness / 2,
    width,
    thickness,
    { isStatic: true }
  );
  wallL = Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, {
    isStatic: true,
  });
  wallR = Bodies.rectangle(
    width + thickness / 2,
    height / 2,
    thickness,
    height * 2,
    { isStatic: true }
  );
  World.add(world, [ground, wallL, wallR]);

  const mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.2,
      angularStiffness: 0.0,
      render: { visible: false },
    },
  });
  World.add(world, mConstraint);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  const newCols = floor(width / w);
  const newRows = floor(height / w);

  const newGrid = make2DArray(newCols, newRows);
  const newVel = make2DArray(newCols, newRows);

  const copyCols = min(cols, newCols);
  const copyRows = min(rows, newRows);
  for (let i = 0; i < copyCols; i++) {
    for (let j = 0; j < copyRows; j++) {
      newGrid[i][j] = grid[i][j];
      newVel[i][j] = velocityGrid[i][j];
    }
  }
  grid = newGrid;
  velocityGrid = newVel;
  cols = newCols;
  rows = newRows;

  Body.setPosition(ground, { x: width / 2, y: height + 30 });
  Body.setVertices(
    ground,
    Bodies.rectangle(width / 2, height + 30, width, 60, { isStatic: true })
      .vertices
  );

  Body.setPosition(wallL, { x: -30, y: height / 2 });
  Body.setVertices(
    wallL,
    Bodies.rectangle(-30, height / 2, 60, height * 2, { isStatic: true })
      .vertices
  );

  Body.setPosition(wallR, { x: width + 30, y: height / 2 });
  Body.setVertices(
    wallR,
    Bodies.rectangle(width + 30, height / 2, 60, height * 2, { isStatic: true })
      .vertices
  );
}

function mouseDragged() {
  let mouseCol = floor(mouseX / w);
  let mouseRow = floor(mouseY / w);

  let matrix = 5;
  let extent = floor(matrix / 2);
  for (let i = -extent; i <= extent; i++) {
    for (let j = -extent; j <= extent; j++) {
      if (random(1) < 0.75) {
        let col = mouseCol + i;
        let row = mouseRow + j;
        if (withinCols(col) && withinRows(row)) {
          grid[col][row] = hueValue;
          velocityGrid[col][row] = 1;
        }
      }
    }
  }
}

function applyBuoyancyForces() {
  const now = millis();

  for (let p of particles) {
    const b = p.body;
    const age = now - p.createdAt;

    b.frictionAir = FALL_AIR;

    const fellEnough = b.position.y - p.spawnY >= MIN_FALL_PX;
    if (age > RISE_DELAY_MS && fellEnough) {
      b.frictionAir = RISE_AIR;

      const t = constrain((age - RISE_DELAY_MS) / RISE_RAMP_MS, 0, 1);
      const ease = 1 - (1 - t) * (1 - t);

      const upward = b.mass * GRAVITY_DOWN * (BUOYANCY_MULT * ease);
      Body.applyForce(b, b.position, { x: 0, y: -upward });
    }
  }
}

function draw() {
  background("#f2f2ed");

  const spawnedThisFrame = convertGridToBodies();

  if (spawnedThisFrame > 0) {
    maybePlaySand(spawnedThisFrame);
  }

  applyBuoyancyForces();

  Engine.update(engine, 1000 / 60);

  noStroke();
  for (let p of particles) {
    const { position, angle } = p.body;
    push();
    translate(position.x, position.y);
    rotate(angle);
    fill(p.hue, 255, 255);
    circle(0, 0, p.diam);
    pop();
  }

  hueValue += 0.5;
  if (hueValue > 360) hueValue = 1;

  cleanupBodies();
}

function convertGridToBodies() {
  if (particles.length >= MAX_BODIES) return 0;

  let spawned = 0;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (grid[i][j] > 0) {
        if (
          spawned >= SPAWN_LIMIT_PER_FRAME ||
          particles.length >= MAX_BODIES
        ) {
          return spawned;
        }
        spawnMatterParticle(i, j, grid[i][j]);
        grid[i][j] = 0;
        velocityGrid[i][j] = 0;
        spawned++;
      }
    }
  }
  return spawned;
}

function spawnMatterParticle(ci, rj, hue) {
  const cx = ci * w + w * 0.5;
  const cy = rj * w + w * 0.5;
  const radius = w * 0.48;

  const body = Bodies.circle(cx, cy, radius, {
    restitution: 0.02,
    frictionStatic: 0.2,
    density: 0.0008,
    collisionFilter: { group: 0 },
  });

  World.add(world, body);
  particles.push({
    body,
    hue,
    diam: radius * 2,
    createdAt: millis(),
    spawnY: cy,
  });
}

function cleanupBodies() {
  const margin = 200;
  for (let i = particles.length - 1; i >= 0; i--) {
    const b = particles[i].body;
    if (
      b.position.y > height + margin ||
      b.position.y < -margin ||
      b.position.x < -margin ||
      b.position.x > width + margin
    ) {
      World.remove(world, b);
      particles.splice(i, 1);
    }
  }
}
