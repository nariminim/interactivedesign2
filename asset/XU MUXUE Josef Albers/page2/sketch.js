const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine, canvas, mouse;
let soundFile;

let square, box;

function preload() {
  soundFile = loadSound("asset/sound.mp3");
}

function setup() {
  canvas = createCanvas(500, 500);
  let x = (windowWidth - width) / 2;
  let y = (windowHeight - height) / 2;
  canvas.position(x, y);
  rectMode(CENTER);
  engine = Engine.create();
  canvas.elt.addEventListener("pointerdown", () => {
    userStartAudio();
  });

  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 1,
    },
  });

  Composite.add(engine.world, mouseConstraint);
  createWall(40);

  square = Bodies.rectangle(width / 2, 150, 50, 50);
  box = Bodies.rectangle(width / 2, height / 2, 100, 100);
  Composite.add(engine.world, [square, box]);
}

function mousePressed() {
  userStartAudio();
}
function draw() {
  noStroke();

  fill("#c02a2aff");
  rect(width / 4, height / 4, width / 2, height / 2);

  fill("#2b736fff");
  rect((width * 3) / 4, height / 4, width / 2, height / 2);

  fill("#FFD166");
  rect(width / 4, (height * 3) / 4, width / 2, height / 2);

  fill("#9e887fff");
  rect((width * 3) / 4, (height * 3) / 4, width / 2, height / 2);

  Engine.update(engine);

  if (Matter.Collision.collides(square, box)) {
    if (!soundFile.isPlaying()) {
      soundFile.play();
    }
  }

  fill(255, 100, 50, 100);
  rect(square.position.x, square.position.y, 50, 50);
  fill(100, 100, 255, 100);
  rect(box.position.x, box.position.y, 100, 100);

  drawWall(20);
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
  fill("#d5cdc8ff");
  noStroke();
  rect(t / 2, height / 2, t, height);
  rect(width - t / 2, height / 2, t, height);
  rect(width / 2, t / 2, width, t);
  rect(width / 2, height - t / 2, width, t);
}
