/**
 * Matter: Moving Body object
 * p5 Math: random, noise
 */
const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;
let r = 50;
let balls = [];
let movingBall;
let t = 0;
let canvas;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.addEventListener("pointermove", pointerMove);
  engine = Engine.create();
  movingBall = Bodies.circle(0, height / 2, r); //  { frictionAir: 0 }
  // 관성모멘트가 클수록 회전하기 힘듬. 회전못하게 고정.
  Body.setInertia(movingBall, Infinity);
  Composite.add(engine.world, movingBall);
}

function draw() {
  background(0);
  Engine.update(engine);
  //if (mouseIsPressed === true) balls.push(new Ball(mouseX, mouseY, random(10)));
  // balls.push(new Ball(mouseX, mouseY, random(10)));

  let x = movingBall.position.x;
  let y = movingBall.position.y;

  Body.setVelocity(movingBall, { x: 1, y: 0 });
  Body.setPosition(movingBall, {
    x: x,
    //y: height / 2,
    y: sin(t) * 100 + height / 2,
  });
  if (x - r > width) {
    Body.setPosition(movingBall, {
      x: -r,
      y: height / 2,
    });
  }
  t += 0.1;
  stroke(0, 200, 255);
  noFill();
  circle(movingBall.position.x, movingBall.position.y, r * 2);

  for (let b of balls) {
    b.display();
  }
}

function pointerMove(e) {
  balls.push(new Ball(e.offsetX, e.offsetY, random(10)));
}

class Ball {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.c = color(0, random(255), 255);
    this.body = Bodies.circle(this.x, this.y, this.r, {
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
    circle(pos.x, pos.y, this.r * 2);
  }
}
