const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine, canvas, mouse;

let rectangles = [];

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  angleMode(DEGREES);
  engine = Engine.create();

  engine.gravity.x = 0;
  engine.gravity.y = 0;

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
}

function draw() {
  Engine.update(engine);
  background("#f2ebdb");
  // walls
  drawWall(20);

  for (let box of rectangles) {
    push();
    translate(box.position.x, box.position.y);
    rotate(degrees(box.angle));
    noStroke();
    fill(box.render.fillStyle);
    rect(0, 0, box.w, box.h);
    pop();
  }
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

function touchStarted() {
  let w = random(50, 200);
  let h = random(10, 80);
  let colors = [
    "#1d7c41",
    "#f2bc00",
    "#f18d00",
    "#db4b1f",
    "#e49f8f",
    "#19275e",
    "#290917",
    "#0c0c08",
  ];

  let col = random(colors);

  let box = Bodies.rectangle(touches[0].x, touches[0].y, w, h, {
    frictionAir: 0.02,
    restitution: 0.8,
    render: { fillStyle: col },
  });

  Matter.Body.setAngle(box, -Math.PI / 4);

  // 사용자 정의 값 기억
  box.w = w;
  box.h = h;

  Composite.add(engine.world, box);
  rectangles.push(box);
}
