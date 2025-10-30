const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine, canvas, mouse, mouseConstraint;
let square;

let paletteOuter = ["#475236ff", "#1d5b6aff", "#873c3cff"];
let paletteMiddle = ["#301f15ff", "#262b50ff", "#8b7e71ff"];
let paletteInner = ["#1daa8cff", "#d92f18ff", "#ffca39ff"];

let currentOuter, currentMiddle, currentInner;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  engine = Engine.create();
  engine.world.gravity.y = 1;

  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.1 },
  });
  Composite.add(engine.world, mouseConstraint);
  createWall(40);

  changeColor();

  let size = 200;
  square = Bodies.rectangle(width / 2, height / 2, size, size, {
    restitution: 0.4,
    friction: 0.3,
  });

  Body.setAngularVelocity(square, -0.07);

  Composite.add(engine.world, [
    square,
    Bodies.rectangle(width / 2, height, width, 50, { isStatic: true }),
  ]);

  Matter.Events.on(mouseConstraint, "startdrag", (event) => {
    if (event.body === square) {
      changeColor();
    }
  });
}

function changeColor(event) {
  currentOuter = color(random(paletteOuter));
  currentMiddle = color(random(paletteMiddle));
  currentInner = color(random(paletteInner));
}

function draw() {
  background("#cbbaadff");
  Engine.update(engine);
  drawWall(20);

  noStroke();
  push();
  translate(square.position.x, square.position.y);
  rotate(square.angle);

  noStroke();

  fill(currentOuter);
  rect(0, 0, 200, 200);

  fill(currentMiddle);
  rect(0, 0, 140, 140);

  fill(currentInner);
  rect(0, 0, 80, 80);

  pop();
}

function createWall(t) {
  Composite.add(engine.world, [
    Bodies.rectangle(0, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width - t / 2, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width / 2, t / 2, width, t, { isStatic: true }),
    Bodies.rectangle(width / 2, height - t / 2, width, t, { isStatic: true }),
  ]);
}

function drawWall(t) {
  fill("#ffffffff");
  noStroke();
  rect(t / 2, height / 2, t, height);
  rect(width - t / 2, height / 2, t, height);
  rect(width / 2, t / 2, width, t);
  rect(width / 2, height - t / 2, width, t);
}
