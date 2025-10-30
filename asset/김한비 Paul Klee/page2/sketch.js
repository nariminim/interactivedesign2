const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let w = 1200;
let h = 600;
let engine, canvas, mouse;
let ball;
let string;
let block1,
  block2,
  block3,
  block4,
  block5,
  block6,
  block7,
  block8,
  block9,
  block10,
  block11;
let block12,
  block13,
  block14,
  block15,
  block16,
  block17,
  block18,
  block19,
  block20,
  block21,
  block22;
let bar1, bar2, bar3, bar4, bar5;

function setup() {
  canvas = createCanvas(w, h);
  rectMode(CENTER);
  engine = Engine.create();
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

  ball = Bodies.circle(w * 0.65, h * 0.2, 50);
  string = Matter.Constraint.create({
    pointA: { x: w * 0.65, y: 0 },
    bodyB: ball,
    length: h * 0.2,
    stiffness: 0.2,
    damping: 0.9,
  });
  //block1~11
  block1 = Bodies.rectangle(100, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block2 = Bodies.rectangle(200, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block3 = Bodies.rectangle(300, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block4 = Bodies.rectangle(400, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block5 = Bodies.rectangle(500, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block6 = Bodies.rectangle(600, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block7 = Bodies.rectangle(700, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block8 = Bodies.rectangle(800, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block9 = Bodies.rectangle(900, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block10 = Bodies.rectangle(1000, h - 90, 90, 90, {
    restitution: 0.2,
  });
  block11 = Bodies.rectangle(1100, h - 90, 90, 90, {
    restitution: 0.2,
  });
  //block12~block22
  block12 = Bodies.rectangle(100, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block13 = Bodies.rectangle(200, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block14 = Bodies.rectangle(300, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block15 = Bodies.rectangle(400, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block16 = Bodies.rectangle(500, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block17 = Bodies.rectangle(600, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block18 = Bodies.rectangle(700, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block19 = Bodies.rectangle(800, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block20 = Bodies.rectangle(900, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block21 = Bodies.rectangle(1000, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  block22 = Bodies.rectangle(1100, h - 90 * 2, 90, 90, {
    restitution: 0.2,
  });
  //bar1~3
  bar1 = Bodies.rectangle(200, h - 90 * 3, 50, 140, {
    restitution: 0.9,
  });
  bar2 = Bodies.rectangle(300, h - 90 * 3, 50, 140, {
    restitution: 0.9,
  });
  bar3 = Bodies.rectangle(400, h - 90 * 3, 50, 140, {
    restitution: 0.9,
  });
  bar4 = Bodies.rectangle(500, h - 90 * 3, 50, 140, {
    restitution: 0.9,
  });
  bar5 = Bodies.rectangle(600, h - 90 * 3, 50, 140, {
    restitution: 0.9,
  });
  Composite.add(engine.world, [
    ball,
    string,
    block1,
    block2,
    block3,
    block4,
    block5,
    block6,
    block7,
    block8,
    block9,
    block10,
    block11,
    block12,
    block13,
    block14,
    block15,
    block16,
    block17,
    block18,
    block19,
    block20,
    block21,
    block22,
    bar1,
    bar2,
    bar3,
    bar4,
    bar5,
  ]);
}

function draw() {
  Engine.update(engine);
  background(105, 45, 34);

  //string
  noFill();
  stroke(105, 45, 34);
  // stroke(255);
  line(string.pointA.x, string.pointA.y, ball.position.x, ball.position.y);
  //ball
  noStroke();
  fill(173, 52, 23);
  circle(ball.position.x, ball.position.y, 100);
  //block1~11-----------------------------------------------
  strokeWeight(1);
  stroke(166, 155, 107);
  fill(26, 133, 173);
  rect(block1.position.x, block1.position.y, 90, 90);

  fill(200, 112, 106);
  rect(block2.position.x, block2.position.y, 90, 90);

  fill(232, 70, 35);
  rect(block3.position.x, block3.position.y, 90, 90);

  fill(181, 107, 33);
  rect(block4.position.x, block4.position.y, 90, 90);

  fill(62, 74, 66);
  rect(block5.position.x, block5.position.y, 90, 90);

  fill(72, 133, 73);
  rect(block6.position.x, block6.position.y, 90, 90);

  fill(218, 16, 9);
  rect(block7.position.x, block7.position.y, 90, 90);

  fill(194, 96, 39);
  rect(block8.position.x, block8.position.y, 90, 90);

  fill(174, 141, 102);
  rect(block9.position.x, block9.position.y, 90, 90);

  fill(79, 131, 69);
  rect(block10.position.x, block10.position.y, 90, 90);

  fill(207, 178, 106);
  rect(block11.position.x, block11.position.y, 90, 90);
  //block11~22-----------------------------------------------
  fill(26, 133, 173);
  rect(block22.position.x, block22.position.y, 90, 90);

  fill(200, 112, 106);
  rect(block21.position.x, block21.position.y, 90, 90);

  fill(232, 70, 35);
  rect(block20.position.x, block20.position.y, 90, 90);

  fill(181, 107, 33);
  rect(block19.position.x, block19.position.y, 90, 90);

  fill(62, 74, 66);
  rect(block18.position.x, block18.position.y, 90, 90);

  fill(72, 133, 73);
  rect(block17.position.x, block17.position.y, 90, 90);

  fill(218, 16, 9);
  rect(block16.position.x, block16.position.y, 90, 90);

  fill(194, 96, 39);
  rect(block15.position.x, block15.position.y, 90, 90);

  fill(174, 141, 102);
  rect(block14.position.x, block14.position.y, 90, 90);

  fill(79, 131, 69);
  rect(block13.position.x, block13.position.y, 90, 90);

  fill(207, 178, 106);
  rect(block12.position.x, block12.position.y, 90, 90);
  // bar1~5----------------------------------------
  fill(223, 42, 28);
  rect(bar1.position.x, bar1.position.y, 50, 140);
  fill(38, 64, 104);
  rect(bar2.position.x, bar2.position.y, 50, 140);
  fill(157, 182, 86);
  rect(bar3.position.x, bar3.position.y, 50, 140);
  fill(44, 119, 75);
  rect(bar4.position.x, bar4.position.y, 50, 140);
  fill(149, 139, 49);
  rect(bar5.position.x, bar5.position.y, 50, 140);
  // walls----------------------------------------
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
  fill(81, 38, 24);
  noStroke();
  rect(t / 2, height / 2, t, height);
  rect(width - t / 2, height / 2, t, height);
  rect(width / 2, t / 2, width, t);
  rect(width / 2, height - t / 2, width, t);
}
