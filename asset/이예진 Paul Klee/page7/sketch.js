//C452044 이예진
//파울 클레 - 음악으로 전하는 성경 이야기
//창세기

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Constraint = Matter.Constraint;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine;
let world;
let canvas;
let mouse;
let mouseConstraint;

let soundFile;

let particles = [];
let springs = [];

let lines = [];

let d = 28;

let holeMode = 0;

let wasGrabbing = false;

////////////////////////////////
//preload 함수
function preload() {
  soundFile = loadSound("asset/guitar-apoggiatura3-97170.mp3");
}

////////////////////////////////
//setup 함수
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = "none";
  rectMode(CENTER);

  engine = Engine.create({ gravity: { x: 0, y: 1 } });
  world = engine.world;

  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, damping: 0.1 },
  });
  Composite.add(world, mouseConstraint);

  for (let k = 0; k < 10; k++) {
    let Bpoints = [];
    let distance = 200 * k;
    for (let i = 0; i < 200; i++) {
      let x = (i - 1) * 10;
      let y = random(-1, 1) + distance;
      Bpoints.push(createVector(x, y));
    }
    lines.push(Bpoints);
  }

  let stackw = 27 * d;
  let stackh = 5 * d;
  let sx = (width - stackw) / 2;
  let sy = height / 2 - stackh / 2;

  for (let i = 0; i < 6; i++) {
    particles[i] = [];
    for (let k = 0; k < 28; k++) {
      let x = sx + k * d;
      let y = sy + i * d;
      let b = Bodies.circle(x, y, 3.5, {
        frictionAir: 0.02,
        restitution: 0.05,
      });
      particles[i][k] = b;
      Composite.add(world, b);
    }
  }

  for (let i = 0; i < 6; i++) {
    for (let k = 0; k < 28; k++) {
      if (k < 27) {
        springs.push(
          Constraint.create({
            bodyA: particles[i][k],
            bodyB: particles[i][k + 1],
            length: d,
            stiffness: 0.9,
            damping: 0.12,
          })
        );
      }
      if (i < 5) {
        springs.push(
          Constraint.create({
            bodyA: particles[i][k],
            bodyB: particles[i + 1][k],
            length: d,
            stiffness: 0.9,
            damping: 0.12,
          })
        );
      }
    }
  }

  for (let i = 0; i < 6; i++) {
    springs.push(
      Constraint.create({
        pointA: { x: sx - 250, y: sy + i * d },
        bodyB: particles[i][0],
        pointB: { x: 0, y: 0 },
        length: 20,
        stiffness: 0.9,
        damping: 0.12,
      })
    );
    springs.push(
      Constraint.create({
        pointA: { x: sx + stackw + 250, y: sy + i * d },
        bodyB: particles[i][27],
        pointB: { x: 0, y: 0 },
        length: 20,
        stiffness: 0.9,
        damping: 0.12,
      })
    );
  }
  for (let i = 0; i < springs.length; i++) {
    Composite.add(world, springs[i]);
  }
}

////////////////////////////////
//draw 함수
function draw() {
  background(255);
  Engine.update(engine);

  //배경 그래픽
  for (let k = 0; k < lines.length; k++) {
    beginShape();
    fill(0, 0, 0, 90);
    strokeWeight(1);
    stroke(0, 0, 0, 50);
    for (let i = 0; i < lines[k].length; i++) {
      let bp = lines[k][i];
      let jX = bp.x;
      let jY = bp.y;
      curveVertex(jX, jY);
    }
    endShape();
  }

  for (let k = 0; k < lines.length; k++) {
    beginShape();
    strokeWeight(1);
    stroke(0, 0, 0, 50);
    for (let i = 0; i < lines[k].length; i++) {
      let bp = lines[k][i];
      let jX = bp.x;
      let jY = bp.y;
      curveVertex(jY, jX);
    }
    endShape();
  }

  noStroke();
  fill(0, 0, 0, 50);
  let r = min(width, height) * 0.3;
  let cx = width / 2;
  let cy = height / 2;

  noStroke();
  if (holeMode === 0) {
    fill(0, 0, 0, 50);
    circle(cx, cy, 2 * r);
  } else if (holeMode === 1) {
    fill(0, 120, 255);
    circle(cx, cy, 2 * r);
  } else if (holeMode === 2) {
    fill(255, 220, 0);
    circle(cx, cy, 2 * r);
  } else if (holeMode === 3) {
    fill(0, 120, 255);
    arc(cx, cy, 2 * r, 2 * r, HALF_PI, HALF_PI + PI, PIE);
    fill(255, 220, 0);
    arc(cx, cy, 2 * r, 2 * r, -HALF_PI, HALF_PI, PIE);
  }

  for (let i = 0; i < TWO_PI; i += 0.001) {
    let radius = noise(i) * 50 + 200;
    let x = cos(i) * radius;
    let y = sin(i) * radius;
    noStroke();
    fill(0);
    push();
    translate(width / 2, height / 2);
    circle(x, y, 2);
    circle(x + 10, y + 10, 1);
    circle(x + 20, y + 20, 3);
    pop();
  }

  stroke(0);
  noFill();
  strokeWeight(1);

  for (let i = 0; i < springs.length; i++) {
    const c = springs[i];
    const a = c.bodyA,
      b = c.bodyB;
    if (a && b) {
      line(a.position.x, a.position.y, b.position.x, b.position.y);
    } else if (a && c.pointB) {
      line(
        a.position.x,
        a.position.y,
        a.position.x + c.pointB.x,
        a.position.y + c.pointB.y
      );
    } else if (b && c.pointA) {
      line(b.position.x, b.position.y, c.pointA.x, c.pointA.y);
    }
  }

  //그래픽 장식
  line(0, 20, width, height / 2 + 20);
  line(180, 140, width, height / 2 + 20);
  circle(180, 140, 10);
  circle(width / 2 + 230, height / 2, 40);
  push();
  circle(width - 100, 80, 20);
  pop();
  strokeWeight(2);
  line(0, height - 40, width, height / 2);
  line(200, 200, width, height);
  strokeWeight(0.4);
  line(0, height - 40, width, 10);
  line(300, height - 100, width, 10);
  bezier(
    300,
    height - 100,
    290,
    height - 70,
    340,
    height - 100,
    320,
    height - 100
  );

  let isGrabbing = !!mouseConstraint.body;

  if (isGrabbing && !wasGrabbing) {
    holeMode = (holeMode + 1) % 4;
    soundFile.play();
  }

  wasGrabbing = isGrabbing;
}

function touchStarted() {}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
