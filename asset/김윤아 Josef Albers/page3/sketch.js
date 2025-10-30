const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Events = Matter.Events;

let engine;
let stack;
let canvas;
let mouse, mouseConstraint;

///////////////////////////////////////////// Matter

let palette = [
  "#1c1c1f",
  "#13315c",
  "#29427a",
  "#1a4356",
  "#498e9e",
  "#6ac7e2",
  "#468d77",
  "#3e4540",
  "#28322c",
  "#4a7a30",
  "#5caa4c",
  "#a7b08f",
  "#d3e2b9",
  "#dee5ca",
  "#342d27",
  "#4a2f1a",
  "#652f31",
  "#6c625d",
  "#333011",
  "#77581c",
  "#a06221",
  "#9e8d3f",
  "#ddc170",
  "#ebd9a0",
  "#f3e8ba",
  "#ddde72",
  "#7f769c",
  "#b0b0ad",
  "#cbcbc7",
  "#e5e2e0",
];

let movers = [];
let shapes = [];
let centerX, centerY;
let gridCountW, glassW;
let gridW, gridH;
let gap;
let gridCountCol, gridCountRow;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  engine = Engine.create();
  engine.world.gravity.y = -0.3;
  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.5, angularStiffness: 0.5 },
  });
  Composite.add(engine.world, mouseConstraint);

  let thickness = 100;
  let ground = Bodies.rectangle(
    width / 2,
    height + thickness / 2,
    width,
    thickness + 5,
    { isStatic: true }
  );
  let ceiling = Bodies.rectangle(
    width / 2,
    -thickness / 2,
    width,
    thickness + 5,
    {
      isStatic: true,
    }
  );
  let leftWall = Bodies.rectangle(
    -thickness / 2,
    height / 2,
    thickness + 5,
    height,
    { isStatic: true }
  );
  let rightWall = Bodies.rectangle(
    width + thickness / 2,
    height / 2,
    thickness + 5,
    height,
    { isStatic: true }
  );
  Composite.add(engine.world, [ground, ceiling, leftWall, rightWall]);

  //////////////////////////////////////// p5

  centerX = width / 2;
  centerY = height / 2;
  gridCountW = min(width, height) * 0.05;
  glassW = gridCountW;
  gap = (gridCountW - glassW) / 2;

  gridCountCol = width / gridCountW;
  gridCountRow = height / gridCountW;

  gridW = gridCountW * gridCountCol;
  gridH = gridCountW * gridCountRow;

  createGrid(centerX, centerY, gridW, gridH);
}

function createGrid(x, y, w, h) {
  let cellW = gridCountW;
  for (let i = 0; i < gridCountRow; i++) {
    for (let j = 0; j < gridCountCol; j++) {
      let cellX = j * gridCountW + gridCountW / 2 + x - w / 2;
      let cellY = i * gridCountW + gridCountW / 2 + y - h / 2;
      shapes.push({
        x: cellX,
        y: cellY,
        w: glassW,
        c: color("#fafafa"),
      });
    }
  }
}

function draw() {
  background("#0a0a0a");
  Engine.update(engine);

  noStroke();
  for (let i of shapes) {
    // let c = colorize(i.c, 0.9, 0.9, 0.9);
    fill(i.c);
    rect(i.x, i.y, i.w - 0.1);
  }

  for (let i = movers.length - 1; i >= 0; i--) {
    let m = movers[i];
    m.run();

    if (m.isDone) {
      movers.splice(i, 1);
    }
  }

  drawMatterBodies();
}

function drawMatterBodies() {
  noStroke();
  const allBodies = Composite.allBodies(engine.world);

  for (let body of allBodies) {
    if (body.isStatic) continue;

    push();
    fill(body.render?.fillStyle || "#999");
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    rectMode(CENTER);
    rect(0, 0, glassW, glassW);

    // 내부 사각형 그리기

    let base = color(body.render.fillStyle);
    let [r1, g1, b1] = body.render.colorShift;
    let c = colorize(base, r1, g1, b1);
    fill(c);
    rect(0, 3, glassW * 0.8, glassW * 0.8);

    let [r2, g2, b2] = body.render.colorShift2;
    let c2 = colorize(base, r2, g2, b2);
    fill(c2);
    rect(0, 4, glassW * 0.5, glassW * 0.5);

    pop();
  }
}

function colorize(col, amt1 = 1.2, amt2 = 1.2, amt3 = 1.2) {
  let c = color(col);
  return color(
    min(red(c) * amt1, 255),
    min(green(c) * amt2, 255),
    min(blue(c) * amt3, 255)
  );
}

////////////////////////////////////////////////////// functions

function easeInOutQuint(x) {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

function createMoverAt(mx, my) {
  let creationRadius = gridCountW * 1;

  for (let shape of shapes) {
    let d = dist(mx, my, shape.x, shape.y);

    if (d < creationRadius) {
      let alreadyExists = false;
      for (let m of movers) {
        if (m.x === shape.x && m.y === shape.y) {
          alreadyExists = true;
          break;
        }
      }

      if (!alreadyExists) {
        movers.push(new Mover(shape.x, shape.y, glassW, mx, my));
      }
    }
  }
}

function mousePressed() {
  if (mouseConstraint.body) return;
  createMoverAt(mouseX, mouseY);
}

function mouseDragged() {
  if (mouseConstraint.body) return;
  createMoverAt(mouseX, mouseY);
}

function touchStarted() {
  if (mouseConstraint.body) return;
  for (let i = 0; i < touches.length; i++) {
    let t = touches[i];
    createMoverAt(t.x, t.y);
  }
}

function touchMoved() {
  if (mouseConstraint.body) return;
  for (let i = 0; i < touches.length; i++) {
    let t = touches[i];
    createMoverAt(t.x, t.y);
  }
}
