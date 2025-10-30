const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;

let w = 1200;
let h = 600;
let myBox;
let boxes = [];
let ground;
let colorss;
let skyimage, seaimage;

function preload() {
  skyimage = loadImage("asset/sky.jpg");
  seaimage = loadImage("asset/sea.jpg");
}

function setup() {
  createCanvas(w, h);
  rectMode(CENTER);
  engine = Engine.create();

  colorss = [
    color(164, 118, 106),
    color(240, 87, 86),
    color(232, 143, 105),
    color(235, 196, 152),
    color(243, 229, 218),
  ];

  myBox = new Box(100, 100, 50, 50);
  ground = Bodies.rectangle(width / 2, height / 2, width, 5, {
    isStatic: true,
  });
  Composite.add(engine.world, ground);
}

function draw() {
  background(255);
  Engine.update(engine);
  //   myBox.display();
  //배경
  image(skyimage, 0, 0, 1200, 300);
  image(seaimage, 0, h / 2, 1200, 300);
  //ground
  noStroke();
  fill(0, 0);
  rect(ground.position.x, ground.position.y, width, 5);
  stroke(81, 67, 51);
  strokeWeight(1);
  //상단박스
  if (mouseIsPressed === true) {
    boxes.push(new Box(mouseX, mouseY, random(40), random(40)));
  }

  //반사
  for (let b of boxes) {
    b.display();
    b.displayReflection(); // 반사 그리기
  }
}

class Box {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.c = random(colorss);
    this.body = Bodies.rectangle(this.x, this.y, this.w, this.h);
    Composite.add(engine.world, this.body);
  }

  display() {
    let pos = this.body.position;
    let angle = this.body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    fill(this.c);
    rect(0, 0, this.w, this.h);
    pop();
  }

  displayReflection() {
    let pos = this.body.position;
    let angle = this.body.angle;

    // 상하!!
    let mirrorY = ground.position.y + (ground.position.y - pos.y);

    push();
    translate(pos.x, mirrorY);
    rotate(-angle);
    fill(red(this.c), green(this.c), blue(this.c), 75);
    rect(0, 0, this.w, this.h);
    pop();
  }
}
