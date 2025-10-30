//C452044 이예진
//파울 클레 - 음악으로 전하는 성경 이야기
//10가지 재앙

const Engine = Matter.Engine;
const Body = Matter.Body;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Constraint = Matter.Constraint;
const ropeGroup = Body.nextGroup(true);

let engine, world, canvas;
let mouse, mouseConstraint;
let myPiano, myPiano2;
let ropeBodies = [];
let keys = [];

let myhouse;
let houses = [];

let lines = [];

let soundFile;

/////////////////////
//preload
function preload() {
  soundFile = loadSound("asset/high-c-piano-c5-422108.mp3");
}

/////////////////////
//setup 함수
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  engine = Engine.create();
  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 1 },
  });
  Composite.add(engine.world, mouseConstraint);

  Composite.add(engine.world, [
    Bodies.rectangle(20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width - 20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width / 2, 20, width, 40, { isStatic: true }),
    Bodies.rectangle(width / 2, height - 20, width, 40, { isStatic: true }),
  ]);

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

  //줄
  let ropeY = height / 2;
  const stack = Composites.stack(0, ropeY, 50, 1, -40, 0, function (x, y) {
    let b = Bodies.circle(
      x,
      y,
      10,
      {
        collisionFilter: { group: ropeGroup },
        friction: 0.6,
        frictionStatic: 1.0,
        restitution: 0,
        frictionAir: 0.02,
        density: 0.003,
      },
      20
    );
    ropeBodies.push(b);
    return b;
  });

  Composites.chain(stack, 0.0, 0.5, 1.0, 0.5, {
    stiffness: 0.6,
    damping: 0.16,
    length: 0,
  });

  for (let c of stack.constraints) {
    c.length *= 0.9;
  }
  ropeBodies = stack.bodies;

  const leftPin = Constraint.create({
    bodyB: stack.bodies[0],
    pointA: { x: 0, y: ropeY - 10 },
    pointB: { x: 0, y: 0 },
    length: 0,
    stiffness: 1,
  });
  const rightPin = Constraint.create({
    bodyB: stack.bodies[stack.bodies.length - 1],
    pointA: { x: width, y: ropeY - 10 },
    pointB: { x: 0, y: 0 },
    length: 0,
    stiffness: 1,
  });

  Composite.add(engine.world, [stack, leftPin, rightPin]);

  //집
  for (let i = 0; i < 8; i++) {
    let y = height / 2 - 120;
    let x = random(20, width - 20);
    let housebodyh = random(50, 250);
    let houseroofh = housebodyh * 0.5;
    let housew = random(10, 30);

    houses.push(new House(x, y, housew, housebodyh, houseroofh));
  }
  //피아노 건반
  myPiano = new piano(0, 0, 5, 1, 0, 25, 45);
  myPiano2 = new piano(0, 0, 5, 3.4, 50, 10);

  let dy = 50;
  let baseY = (x) => height / 2;

  const angle = Math.atan2(dy, width);

  let ranges = [
    [125, 240],
    [325, 440],
    [525, 640],
    [725, 850],
    [925, 1050],
    [1125, 1250],
  ];

  for (let i = 0; i < ranges.length; i++) {
    let [X1, X6] = ranges[i];
    for (let x = X1; x < X6; x += 50) {
      let y = baseY(x) + 108;
      keys.push({ x, y, angle });
    }
  }
}

//////////////////
//draw 함수
function draw() {
  Engine.update(engine);
  background(255);

  //집

  //피아노 줄_ matter
  noFill();
  stroke(0);
  strokeWeight(2);
  beginShape();
  for (const b of ropeBodies) {
    vertex(b.position.x, b.position.y);
  }
  endShape();

  //피아노 건반
  push();
  noFill();
  stroke(0);
  strokeWeight(6);
  for (const k of keys) {
    push();
    translate(k.x, k.y);
    rect(0, 0, 40, 100, 10, 10, 10, 10);
    strokeWeight(1);
    fill(0);
    circle(-20, -50, 10);
    pop();
  }
  pop();

  //피아노 건반 드로잉
  push();
  translate(-100, height / 2 + 100);
  scale(0.5);
  for (let i = 0; i < 15; i++) {
    let keygroup1 = i * 400;
    for (let i = 0; i < 3; i++) {
      let x = keygroup1 + i * 100;
      myPiano.x = x;
      myPiano.y = 0;

      myPiano.display();
    }
  }
  pop();

  push();
  translate(-130, height / 2 + 90);
  scale(0.5);
  for (let i = 0; i < 15; i++) {
    let keygroup1 = i * (3 * (80 + 20) + 100);
    for (let i = 0; i < 3; i++) {
      let x = keygroup1 + i * 100;
      myPiano2.x = x;
      myPiano2.y = 0;

      myPiano2.display();
    }
  }
  pop();

  strokeWeight(2.5);
  line(0, height / 2, width, height / 2 + 50);
  strokeWeight(1.2);
  line(0, height / 2 + 20, width, height / 2);
  strokeWeight(0.8);
  line(0, height / 2 + 40, width, height / 2 + 25);

  for (let h of houses) {
    h.display();
  }

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

  for (let i = 0; i < 100000; i += 50) {
    stroke(0);
    strokeWeight(1);
    line(70 + i, width / 2.5, 70 + i, width);
    bezier(
      70 + i,
      width / 2.5,
      70 + i,
      width / 2.5 - 10,
      80 + i,
      width / 2.5,
      75 + i,
      width / 2.5
    );
  }
}

function touchStarted() {
  for (let t of touches) {
    let tx = t.x;
    let ty = t.y;

    for (let k of keys) {
      if (hitRotRect(tx, ty, k.x, k.y, k.angle, 40, 100)) {
        exciteRope(tx, 0.25);
        soundFile.play();
      }
    }
  }
  return false;
}

///////////////////////////////////
//ai(Chat Gpt) 참고
function hitRotRect(px, py, cx, cy, angle, w, h) {
  const dx = px - cx;
  const dy = py - cy;
  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  const rx = dx * cosA - dy * sinA;
  const ry = dx * sinA + dy * cosA;
  return Math.abs(rx) <= w * 0.5 && Math.abs(ry) <= h * 0.5;
}

function exciteRope(xWorld, power = 0.05) {
  if (!ropeBodies.length) return;

  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ropeBodies.length; i++) {
    const d = Math.abs(ropeBodies[i].position.x - xWorld);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  const spread = 4;
  for (let di = -spread; di <= spread; di++) {
    const idx = best + di;
    if (idx < 0 || idx >= ropeBodies.length) continue;

    const falloff = Math.exp(-0.35 * Math.pow(di, 2));
    const f = power * falloff;

    Matter.Body.applyForce(ropeBodies[idx], ropeBodies[idx].position, {
      x: 0,
      y: -f,
    });
  }

  if (myhouse) {
    myhouse.bounce(power * 0.6);
  }
}
/////////////////////////////////////

/////////////////
//piano class

class piano {
  constructor(x, y, j, bw, a, p1, p2) {
    this.x = x;
    this.y = y;
    this.bW = bw;
    this.j = j;
    this.c = color(0);
    this.offset = random(100);
    this.a = a;
    this.kW = 80;
    this.kH = 160;
    this.p1 = p1;
    this.p2 = p2;
  }
  display() {
    noFill();
    push();
    stroke(this.c);
    this.pressure = map(sin(0.03), -1, 1, 0.6, 2.5);
    stroke(0);
    strokeWeight(this.bW * this.pressure);
    let xl = this.x + this.a;
    let xr = xl + this.kW;
    let yt = this.y - this.kH / 2;
    let yb = this.y + this.kH / 2;
    let p1 = this.p1;
    let p2 = this.p1;
    beginShape();
    for (let k = 0; k <= 1; k += 0.05) {
      let x = lerp(xl - p1, xr + p2, k);
      let y = yt;
      let nx = noise(this.offset + k * 5);
      let ny = noise(this.offset + k * 5 + 100);
      let jX = map(nx, 0, 1, -this.j, this.j);
      let jY = map(ny, 0, 1, -this.j, this.j);
      vertex(x + jX, y + jY);
    }
    endShape();
    beginShape();
    for (let k = 0; k <= 1; k += 0.05) {
      let x = xr;
      let y = lerp(yt - p1, yb + p1, k);
      let nx = noise(this.offset + k * 5 + 50);
      let ny = noise(this.offset + k * 5 + 150);
      let jX = map(nx, 0, 1, -this.j, this.j);
      let jY = map(ny, 0, 1, -this.j, this.j);
      vertex(x + jX, y + jY);
    }
    endShape();
    beginShape();
    for (let k = 0; k <= 1; k += 0.05) {
      let x = lerp(xr + p2, xl - p2, k);
      let y = yb;
      let nx = noise(this.offset + k * 5 + 200);
      let ny = noise(this.offset + k * 5 + 300);
      let jX = map(nx, 0, 1, -this.j, this.j);
      let jY = map(ny, 0, 1, -this.j, this.j);
      vertex(x + jX, y + jY);
    }
    endShape();
    beginShape();
    for (let k = 0; k <= 1; k += 0.05) {
      let x = xl;
      let y = lerp(yb + p2, yt - p1, k);
      let nx = noise(this.offset + k * 5 + 400);
      let ny = noise(this.offset + k * 5 + 500);
      let jX = map(nx, 0, 1, -this.j, this.j);
      let jY = map(ny, 0, 1, -this.j, this.j);
      vertex(x + jX, y + jY);
    }
    endShape();
    pop();
  }
}

class House {
  constructor(x, y, housew, housebodyh, houseroofh) {
    this.x = x;
    this.y = y;
    this.w = housew;
    this.h = housebodyh;

    this.rh = houseroofh;

    const housebody = Bodies.rectangle(this.x, this.y, this.w, this.h, {
      chamfer: 8,
      friction: 0.7,
      frictionStatic: 1.0,
      restitution: 0,
      frictionAir: 0.02,
      density: 0.003,
    });

    const houseroof = Bodies.polygon(
      this.x,
      this.y - this.h * 0.5 - this.rh * 0.5,
      3,
      this.rh,
      {
        friction: 0.7,
        frictionStatic: 1.0,
        restitution: 0.0,
        frictionAir: 0.2,
        density: 0.002,
      }
    );

    this.body = Body.create({
      parts: [houseroof, housebody],
      friction: 0.7,
      frictionStatic: 1.0,
    });

    Composite.add(engine.world, this.body);
  }
  display() {
    this.pos = this.body.position;
    this.a = this.body.angle;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.a);

    noFill();
    stroke(0);
    rectMode(CENTER);
    rect(0, 0, this.w, this.h);

    beginShape();
    vertex(-this.w / 2 - 10, -this.h / 2 + 10);
    vertex(0, -this.h / 2 - this.rh);
    vertex(this.w / 2 + 10, -this.h / 2 + 10);
    endShape(CLOSE);

    pop();
  }

  bounce(power = 0.05) {
    Matter.Body.applyForce(this.body.position, { x: 0, y: -power });
  }
}
