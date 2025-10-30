const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;

let w = 1200;
let h = 600;

let engine;
let myBox;
let boxes = [];
let ground;
let redimage;
let greenimage;

function preload() {
  redimage = loadImage("asset/red.jpg");
  greenimage = loadImage("asset/green.jpg");
}

function setup() {
  createCanvas(w, h);

  rectMode(CENTER);
  engine = Engine.create();
  myBox = new Box(100, 100, 50, 50);
  ground = Bodies.rectangle(width / 2, h * 0.85, width, h * 0.35, {
    isStatic: true,
  });
  Composite.add(engine.world, ground);
}

function draw() {
  background(128, 125, 93);
  image(greenimage, 0, 0, 1200, h * 0.7);

  Engine.update(engine);

  noStroke();
  fill(161, 54, 65);
  rect(ground.position.x, ground.position.y, width, h * 0.35);
  image(redimage, 0, h * 0.65, 1200, 300);

  if (mouseIsPressed === true) {
    boxes.push(new Box(mouseX, mouseY, random(40), random(40)));

    let point1 = w / 5;
    let point2 = (w * 3) / 5;
    let range = 100;
    if (abs(mouseX - point1) < range || abs(mouseX - point2) < range) {
      for (let i = 0; i < 10; i++) {
        boxes.push(
          new Box(
            mouseX + random(-10, 10),
            mouseY + random(-10, 10),
            random(40),
            random(40)
          )
        );
      }
    }
  }

  for (let b of boxes) {
    b.display();
  }
}

class Box {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.c = color(216, random(48, 234), 54, random(50, 255));
    this.body = Bodies.rectangle(this.x, this.y, this.w, this.h);
    Composite.add(engine.world, this.body);
  }

  display() {
    let pos = this.body.position;
    let angle = this.body.angle;

    push();
    translate(pos.x, pos.y);
    // rotate(angle);

    stroke(80, 59, 29);
    strokeWeight(1.5);
    fill(this.c);
    rect(0, 0, this.w, this.h);
    pop();
  }
}
