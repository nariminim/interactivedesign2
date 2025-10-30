const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine;
let blocks = [];
let w = 1200;
let h = 600;

let colors;

function setup() {
  createCanvas(w, h);
  engine = Engine.create();
  engine.gravity.y = -0.5;

  colors = [
    color(205, 118, 112, 50),
    color(188, 177, 149, 50),
    color(130, 193, 182, 50),
    color(80, 154, 121, 50),
  ];

  // walls
  let walls = [
    Bodies.rectangle(w / 2, 0, w, 40, { isStatic: true }),
    Bodies.rectangle(w / 2, h, w, 40, { isStatic: true }),
    Bodies.rectangle(0, h / 2, 40, h, { isStatic: true }),
    Bodies.rectangle(w, h / 2, 40, h, { isStatic: true }),
  ];
  Composite.add(engine.world, walls);

  // block
  for (let i = 0; i < 50; i++) {
    let type = random(["rect", "triangle", "circle"]);
    let size = random(40, 80);
    let b;
    if (type === "rect") {
      b = Bodies.rectangle(
        random(100, w - 100),
        random(100, h - 100),
        size,
        size,
        { restitution: 0.5, friction: 0.3 }
      );
    } else if (type === "triangle") {
      let vertices = [
        { x: 0, y: -size / 2 },
        { x: -size / 2, y: size / 2 },
        { x: size / 2, y: size / 2 },
      ];
      b = Bodies.fromVertices(
        random(100, w - 100),
        random(100, h - 100),
        vertices,
        { restitution: 0.5, friction: 0.3 }
      );
    } else {
      b = Bodies.circle(random(100, w - 100), random(100, h - 100), size / 2, {
        restitution: 0.5,
        friction: 0.3,
      });
    }
    b.color = random(colors);
    b.shape = type;
    b.size = size;
    blocks.push(b);
  }
  Composite.add(engine.world, blocks);

  // mc
  let canvasMouse = Mouse.create(canvas.elt);
  let mConstraint = MouseConstraint.create(engine, {
    mouse: canvasMouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  Composite.add(engine.world, mConstraint);
}

function draw() {
  fill(20, 30, 40, 10);
  noStroke();
  // rect(0, 0, width, height);

  Engine.update(engine);

  for (let b of blocks) {
    push();
    translate(b.position.x, b.position.y);
    rotate(b.angle);
    fill(b.color);

    stroke(72, 118, 103);
    strokeWeight(0.5);

    if (b.shape === "rect") {
      rectMode(CENTER);
      rect(0, 0, b.size, b.size);
    } else if (b.shape === "triangle") {
      beginShape();
      for (let v of b.vertices) {
        vertex(v.x - b.position.x, v.y - b.position.y);
      }
      endShape(CLOSE);
    } else if (b.shape === "circle") {
      ellipse(0, 0, b.size);
    }
    pop();
  }
}

//-------------------------
function mousePressed() {
  for (let b of blocks) {
    let force = p5.Vector.sub(
      createVector(b.position.x, b.position.y),
      createVector(mouseX, mouseY)
    );
    force.setMag(0.1);
    Body.applyForce(b, b.position, { x: force.x, y: force.y });
  }
}
