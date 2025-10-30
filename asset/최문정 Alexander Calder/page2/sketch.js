const {
  Engine,
  World,
  Bodies,
  Runner,
  Mouse,
  MouseConstraint,
  Composite,
  Body,
  Query,
} = Matter;

let engine;
let world;
let shapes = [];
let metaballGraphics;

let mConstraint;

const METABALL_STROKE_WEIGHT = 13;
const CRISP_STROKE_WEIGHT = 2;
const BLUR_RADIUS = 3;
const THRESHOLD_VAL = 0.3;
const INITIAL_SHAPE_RADIUS_MIN = 70;
const INITIAL_SHAPE_RADIUS_MAX = 200;

const MAX_SHAPES = 50;
const BUFFER_SCALE = 0.5;
const INITIAL_SHAPE_COUNT = 15;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);

  metaballGraphics = createGraphics(
    windowWidth * BUFFER_SCALE,
    windowHeight * BUFFER_SCALE
  );

  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;

  const wallOptions = { isStatic: true, label: "wall" };
  Composite.add(world, [
    Bodies.rectangle(width / 2, height + 30, width, 60, wallOptions),
    Bodies.rectangle(width / 2, -30, width, 60, wallOptions),
    Bodies.rectangle(-30, height / 2, 60, height, wallOptions),
    Bodies.rectangle(width + 30, height / 2, 60, height, wallOptions),
  ]);

  for (let i = 0; i < INITIAL_SHAPE_COUNT; i++) {
    addShape(random(50, width - 50), random(50, height - 50));
  }

  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  let options = {
    mouse: canvasMouse,
  };
  mConstraint = MouseConstraint.create(engine, options);
  Composite.add(world, mConstraint);

  Runner.run(Runner.create(), engine);
}

function draw() {
  background(255);

  drawMetaballBuffer();

  image(metaballGraphics, 0, 0, width, height);

  drawCrispOutlines();
}

function drawMetaballBuffer() {
  metaballGraphics.background(255);
  metaballGraphics.noFill();
  metaballGraphics.stroke(0);
  metaballGraphics.strokeWeight(METABALL_STROKE_WEIGHT * BUFFER_SCALE);

  for (let shape of shapes) {
    if (shape.label === "wall") continue;

    metaballGraphics.beginShape();
    for (let vert of shape.vertices) {
      metaballGraphics.vertex(vert.x * BUFFER_SCALE, vert.y * BUFFER_SCALE);
    }
    metaballGraphics.endShape(CLOSE);
  }

  metaballGraphics.filter(BLUR, BLUR_RADIUS);
  metaballGraphics.filter(THRESHOLD, THRESHOLD_VAL);
}

function drawCrispOutlines() {
  for (let shape of shapes) {
    if (shape.label === "wall") continue;

    if (shape.renderProps && shape.renderProps.isFilled) {
      fill(shape.renderProps.fillColor);
      stroke(0);
      strokeWeight(CRISP_STROKE_WEIGHT);
    } else {
      noFill();
      stroke(0);
      strokeWeight(CRISP_STROKE_WEIGHT);
    }

    beginShape();
    for (let vert of shape.vertices) {
      vertex(vert.x, vert.y);
    }
    endShape(CLOSE);
  }
}

function touchStarted() {
  if (mConstraint.body) {
    return;
  }

  let wasPopped = popShape(mouseX, mouseY);

  if (!wasPopped) {
    addShape(mouseX, mouseY);
  }

  return false;
}

function addShape(x, y) {
  if (shapes.length > MAX_SHAPES) {
    let oldestShape = null;
    for (let s of shapes) {
      if (s.label !== "wall") {
        oldestShape = s;
        break;
      }
    }
    if (oldestShape) {
      Composite.remove(world, oldestShape);
      shapes.splice(shapes.indexOf(oldestShape), 1);
    }
  }

  let r = random(INITIAL_SHAPE_RADIUS_MIN, INITIAL_SHAPE_RADIUS_MAX);

  let options = {
    friction: 0.1,
    restitution: 0.7,
    frictionAir: 0.01,
    label: "shape",
  };

  let shape;
  let rand = random(1);

  if (rand < 0.5) {
    shape = Bodies.circle(x, y, r, options);
  } else if (rand < 0.8) {
    shape = Bodies.rectangle(x, y, r * 1.2, r * 1.2, options);
  } else {
    shape = Bodies.polygon(x, y, 3, r, options);
  }

  shape.renderProps = {};
  if (random(1) < 0.5) {
    shape.renderProps.isFilled = true;

    shape.renderProps.fillColor = color(random(30, 100), random(50, 150), 220);
  } else {
    shape.renderProps.isFilled = false;
    shape.renderProps.fillColor = null;
  }

  Composite.add(world, shape);
  shapes.push(shape);

  Body.setVelocity(shape, {
    x: random(-2, 2),
    y: random(-2, 2),
  });
}

function popShape(x, y) {
  let bodiesAtPoint = Query.point(shapes, { x: x, y: y });

  for (let body of bodiesAtPoint) {
    if (body.label !== "wall") {
      Composite.remove(world, body);
      shapes.splice(shapes.indexOf(body), 1);
      return true;
    }
  }

  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  metaballGraphics.remove();
  metaballGraphics = createGraphics(
    windowWidth * BUFFER_SCALE,
    windowHeight * BUFFER_SCALE
  );
}
