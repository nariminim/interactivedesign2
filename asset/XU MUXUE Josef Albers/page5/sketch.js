const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;

let engine;
let mySquare;
let squares = [];
let t = 0;
let windDirection = 0;

function setup() {
  canvas = createCanvas(700, 700);
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
  let x = (windowWidth - width) / 2;
  let y = (windowHeight - height) / 2;
  canvas.position(x, y);
  rectMode(CENTER);
  engine = Engine.create();
  engine.gravity.y = -1;
  Composite.add(engine.world, [
    Bodies.rectangle(20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width - 20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width / 2, 20, width, 40, { isStatic: true }),
    Bodies.rectangle(width / 2, height - 20, width, 40, { isStatic: true }),
  ]);

  mySquare = new Square(100, 100, 50);
}

function draw() {
  Engine.update(engine);
  background("#e3dbd4ff");

  noStroke();
  let centers = [
    [width / 4, height / 4],
    [(width * 3) / 4, height / 4],
    [width / 4, (height * 3) / 4],
    [(width * 3) / 4, (height * 3) / 4],
  ];

  let colorSets = [
    ["#c02a2a", "#7c2035ff", "#ff6858ff"],
    ["#204a48ff", "#4ea39f", "#f1d371ff"],
    ["#e7ae3bff", "#bf9970ff", "#ffef3dff"],
    ["#9db15aff", "#988a83ff", "#414d80ff"],
  ];

  for (let i = 0; i < centers.length; i++) {
    drawNestedSquare(centers[i][0], centers[i][1], 250, colorSets[i]);
  }
  drawWall();
}

function drawNestedSquare(cx, cy, size, colors) {
  rectMode(CENTER);
  for (let i = 0; i < colors.length; i++) {
    fill(colors[i]);
    let s = size * (1 - i * 0.3);
    rect(cx, cy, s, s);
  }

  mySquare.display();
  windDirection = sin(t) * 0.001; // -1 ~ 1
  t = t + 0.01;

  for (let i = 0; i < squares.length; i++) {
    squares[i].display();
    squares[i].checkDeath();

    if (squares[i].done === true) {
      squares.splice(i, 1);
    }

    let b = squares[i];
    Body.applyForce(b.body, b.body.position, { x: windDirection, y: 0 });
  }
  print("body size: " + Composite.allBodies(engine.world).length);
  print("square size: " + squares.length);
}

function pointerDown() {}
function pointerUp() {}
function pointerMove() {
  squares.push(new Square(touches[0].x, touches[0].y, random(5, 20)));
}

function drawWall() {
  let t = 20;
  fill("#574841ff");
  noStroke();
  rect(t / 2, height / 2, t, height);
  rect(width - t / 2, height / 2, t, height);
  rect(width / 2, t / 2, width, t);
  rect(width / 2, height - t / 2, width, t);
}
