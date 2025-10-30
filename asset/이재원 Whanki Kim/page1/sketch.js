const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Constraint = Matter.Constraint;
const Body = Matter.Body;

let engine;
let canvas;
let colorA, colorB;
let noiseBackground;

let berries = [];
const berryOptions = {
  size: 30,
  maxYRatio: 0.45,
  maxXRatio: 0.95,
  stemLength: 10,
  gravityScale: 2.5,
  velocityScale: 0.5,
  numMin: 60,
  numMax: 71,
  color: [200, 200, 200],
};

let interaction = {
  selectedBerry: null,
  totalShake: 0,
  shakeThreshold: 25,
  lastMovementX: 0,
  lastMovementY: 0,
};

const moonOptions = {
  xRatio: 54 / 56,
  yRatio: 1.25 / 24,
  rotation: 5,
  fill: "#688fca",
  stroke: "#60b8dc",
  strokeWeight: 4,
  baseRatioW: 0.4,
  baseRatioH: 0.36,
  maxW: 500,
  maxH: 450,
  wobbleStrength: 16,
  noiseSeed: 100,
  noiseFrequency: 3,
};

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.addEventListener("pointerdown", onPointerDown);
  canvas.elt.addEventListener("pointermove", onPointerMove);
  canvas.elt.addEventListener("pointerup", onPointerUp);
  noStroke();

  engine = Engine.create();
  engine.world.gravity.y = 1;

  colorA = color("#3864ad");
  colorB = color("#42b7c8");

  drawNoiseBackground();
  createBerries();
}

function createWalls() {
  let wallThickness = 40;
  let options = { isStatic: true };
  Composite.add(engine.world, [
    Bodies.rectangle(
      width / 2,
      height + wallThickness / 2,
      width,
      wallThickness,
      options
    ),
    Bodies.rectangle(
      -wallThickness / 2,
      height / 2,
      wallThickness,
      height,
      options
    ),
    Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height,
      options
    ),
  ]);
}

function createBerries() {
  Composite.clear(engine.world, false);
  berries = [];
  createWalls();

  let numBerries = floor(random(berryOptions.numMin, berryOptions.numMax));
  let radius = berryOptions.size / 2;

  let spawnY_start = radius;
  let spawnY_end = min(height * berryOptions.maxYRatio, height - radius);
  let spawnX_start = radius;
  let spawnX_end = width * berryOptions.maxXRatio - radius;

  let maxAttemptsPerBerry = 5;

  //줄기 (매달려야하니...)
  // let stemLength = 10;

  for (let i = 0; i < numBerries; i++) {
    if (spawnY_start >= spawnY_end || spawnX_start >= spawnX_end) break;

    let anchorX, anchorY, isOverlapping;
    for (let attempt = 0; attempt < maxAttemptsPerBerry; attempt++) {
      anchorX = random(spawnX_start, spawnX_end);
      anchorY = random(spawnY_start, spawnY_end);
      isOverlapping = false;
      for (let b of berries) {
        let d = dist(anchorX, anchorY, b.anchor.x, b.anchor.y);
        if (d < berryOptions.size) {
          isOverlapping = true;
          break;
        }
      }
      if (!isOverlapping) break;
    }

    let berryBody = Bodies.circle(
      anchorX,
      anchorY + berryOptions.stemLength,
      radius,
      {
        frictionAir: random(0.05, 0.15),
        restitution: 0.2,
        collisionFilter: {
          group: -1,
        },
      }
    );

    let stem = Constraint.create({
      pointA: { x: anchorX, y: anchorY },
      bodyB: berryBody,
      length: berryOptions.stemLength,
      stiffness: 0.01,
      damping: 0.1,
    });

    Composite.add(engine.world, [berryBody, stem]);

    berries.push({
      body: berryBody,
      col: color(berryOptions.color), //최초색상
      anchor: { x: anchorX, y: anchorY },
      stem: stem,
      isHanging: true,
    });
  }
}

function onPointerDown(event) {
  let closestBerry = null;
  let minDistance = Infinity;

  for (let b of berries) {
    if (!b.isHanging) continue;
    let d = dist(
      event.offsetX,
      event.offsetY,
      b.body.position.x,
      b.body.position.y
    );
    if (d < minDistance) {
      minDistance = d;
      closestBerry = b;
    }
  }

  if (closestBerry && minDistance < berryOptions.size / 2) {
    interaction.selectedBerry = closestBerry;
    interaction.totalShake = 0;
    console.log("Berry selected");
  } else {
    interaction.selectedBerry = null;
    changeHangingBerryColors();
  }
}

function onPointerMove(event) {
  event.preventDefault();
  if (interaction.selectedBerry) {
    interaction.lastMovementX = event.movementX;
    interaction.lastMovementY = event.movementY;
    interaction.totalShake += abs(event.movementX) + abs(event.movementY);
    if (interaction.totalShake > interaction.shakeThreshold) {
      let b = interaction.selectedBerry;
      let vX = interaction.lastMovementX * berryOptions.velocityScale;
      let vY = interaction.lastMovementY * berryOptions.velocityScale;

      Body.set(b.body, "frictionAir", 0.01);
      Body.setVelocity(b.body, { x: vX, y: vY });
      Body.set(b.body, "gravityScale", berryOptions.gravityScale);

      Composite.remove(engine.world, b.stem);
      b.isHanging = false;
      interaction.selectedBerry = null;
    }
  }
}

function onPointerUp(event) {
  interaction.selectedBerry = null;
  interaction.totalShake = 0;
}

function changeHangingBerryColors() {
  let newColor = color(random(255), random(255), random(255));
  for (let b of berries) {
    if (b.isHanging) {
      b.col = newColor;
    }
  }
}

function draw() {
  //바람 세기 조절하기
  let wind = map(noise(frameCount * 0.015), 0, 1, -1, 1);
  engine.world.gravity.x = wind;
  Engine.update(engine);

  image(noiseBackground, 0, 0);
  drawMoon();
  drawBerries();
}

function drawMoon() {
  push();
  translate(width * moonOptions.xRatio, height * moonOptions.yRatio);
  rotate(radians(moonOptions.rotation));
  fill(moonOptions.fill);
  stroke(moonOptions.stroke);
  strokeWeight(moonOptions.strokeWeight);

  let proportionalW = width * moonOptions.baseRatioW;
  let proportionalH = width * moonOptions.baseRatioH;
  let ellipseW = min(proportionalW, moonOptions.maxW);
  let ellipseH = min(proportionalH, moonOptions.maxH);

  let rW = ellipseW / 2;
  let rH = ellipseH / 2;
  let anchorX = -ellipseW / 2;
  let anchorY = ellipseH / 2;

  beginShape();
  for (let a = 0; a < TWO_PI; a += 0.1) {
    let noiseVal = noise(
      (cos(a) + 1) * moonOptions.noiseFrequency,
      (sin(a) + 1) * moonOptions.noiseFrequency,
      moonOptions.noiseSeed
    );
    let wobble = map(
      noiseVal,
      0,
      1,
      -moonOptions.wobbleStrength,
      moonOptions.wobbleStrength
    );

    let x = (rW + wobble) * cos(a);
    let y = (rH + wobble) * sin(a);
    vertex(x + anchorX, y + anchorY);
  }
  endShape(CLOSE);
  pop();
}

function drawBerries() {
  for (let b of berries) {
    let pos = b.body.position;
    fill(b.col);
    circle(pos.x, pos.y, berryOptions.size);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createBerries();
  drawNoiseBackground();
}

function drawNoiseBackground() {
  noiseBackground = createGraphics(width, height);

  let noiseScale = 0.4;
  let gap = 4;

  noiseBackground.noStroke();
  for (let x = 0; x < width; x += gap) {
    for (let y = 0; y < height; y += gap) {
      let noiseVal = noise(x * noiseScale, y * noiseScale);

      if (noiseVal < 0.35) {
        noiseBackground.fill("#5e80c0");
      } else if (noiseVal < 0.665) {
        noiseBackground.fill(colorA);
      } else {
        noiseBackground.fill(colorB);
      }
      noiseBackground.rect(x, y, gap, gap);
    }
  }
}
