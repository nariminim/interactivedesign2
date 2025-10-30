const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const MouseConstraint = Matter.MouseConstraint;

let engine, canvas, mouse;
let squares = [];

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  engine = Engine.create();

  createWall(40);
}

function draw() {
  Engine.update(engine);
  background("#f2ebdb");

  // walls
  drawWall(20);

  for (let i = 0; i < squares.length; i++) {
    squares[i].display();
    squares[i].checkDeath();
    if (squares[i].done === true) {
      squares.splice(i, 1);
    }
  }
}

function touchStarted() {
  let s = new Square(
    touches[0].x,
    touches[0].y,
    random(10, 20),
    random(10, 20)
  );
  squares.push(s);
  Composite.add(engine.world, s.body);
}
function touchMoved() {
  let s = new Square(
    touches[0].x,
    touches[0].y,
    random(10, 20),
    random(10, 20)
  );
  squares.push(s);
  Composite.add(engine.world, s.body);
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
  fill(50);
  noStroke();
  rect(t / 2, height / 2, t, height);
  rect(width - t / 2, height / 2, t, height);
  rect(width / 2, t / 2, width, t);
  rect(width / 2, height - t / 2, width, t);
}
