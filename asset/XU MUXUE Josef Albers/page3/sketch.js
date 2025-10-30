const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;
let squares = [];
let canvas;
let ground;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.addEventListener("pointermove", pointerMove);
  engine = Engine.create();
  ground = Bodies.rectangle(width / 2, height - 20, width, 40, {
    isStatic: true,
  });
  Composite.add(engine.world, ground);
}

function draw() {
  background("#cbbaadff");
  Engine.update(engine);

  fill("#f5c64fff");
  noStroke();
  rectMode(CENTER);
  rect(ground.position.x, ground.position.y, width, 40);

  if (mouseIsPressed === true) {
    squares.push(new Square(mouseX, random(40), random(40)));
  }
  for (let b of squares) {
    b.display();
  }
}

function pointerMove(e) {
  squares.push(new Square(e.offsetX, e.offsetY, random(10, 60)));
}

class Square {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.done = false;
    let colors = [
      "#e2cd12ff",
      "#c93113ff",
      "#175851ff",
      "#bfbdaeff",
      "#293f86ff",
      "#294b35ff",
      "#84a752ff",
      "#28221dff",
      "#968884ff",
      "#8f5e2eff",
      "#ffffffff",
    ];
    this.c = random(colors);
    this.body = Bodies.rectangle(this.x, this.y, this.size, this.size, {
      restitution: 0.8,
      mass: 5,
      friction: 5,
    });
    Composite.add(engine.world, this.body);
  }
  display() {
    let pos = this.body.position;
    fill(this.c);
    noStroke();
    rectMode(CENTER);
    rect(pos.x, pos.y, this.size, this.size);
  }
}
