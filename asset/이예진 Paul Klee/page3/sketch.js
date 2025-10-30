//C452044 이예진
//파울 클레 - 음악으로 전하는 성경 이야기
//가나의 기적

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let canvas;
let engine, world;
let mouse, mouseConstraint;
let ground, drum;
let respawn = false;

let lines = [];

let waters = [];

let drumtramp = false;
let soundFile;

let rw = 380;
let rh = 160;

let watertowine = false;
let revert = false;

//////////////////
//preload 함수
function preload() {
  soundFile = loadSound("asset/snare-drum-426042.mp3");
}

//////////////////
//setup 함수
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  engine = Engine.create();
  world = engine.world;

  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 1,
    },
  });
  engine.gravity.y = -0.1;

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

  //바닥
  Composite.add(engine.world, [
    Bodies.rectangle(20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width - 20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width / 2, 20, width, 40, { isStatic: true }),
    Bodies.rectangle(width / 2, height - 20, width, 40, { isStatic: true }),
  ]);
  //드럼
  drum = Bodies.rectangle(width / 2, height / 2 + rh / 2.3, rw, rh, {
    isStatic: true,
    restitution: 1.0,
    friction: 0.0,
    label: "drum",
    chamfer: { radius: [20, 20, 150, 150] },
  });
  Composite.add(world, [mouseConstraint, drum]);

  mydrumString4 = new drumString(width / 2, height / 2, 5, 3, 75);
  mydrumString = new drumString(width / 2, height / 2, 5, 0.8, 0);
  mydrumString2 = new drumString(width / 2 - 10, height / 2, 5, 2, -50);
  mydrumString3 = new drumString(width / 2 - 10, height / 2, 5, 0.4, -100);

  canvas.elt.style.touchAction = "none";

  //와인잔
  myglass = new Wineglass(width / 5, 200, 20);
  myglass2 = new Wineglass(width - width / 4, 600, 20);
  myglass3 = new Wineglass(width - width / 8, height / 7, 20);
  myglass4 = new Wineglass(width - width / 2, height / 7, 20);
  myglass5 = new Wineglass(width / 8, height - height / 7, 20);
}

//////////////////
//draw함수
function draw() {
  background(255);
  Engine.update(engine);

  strokeWeight(4);
  circle(width / 2, height / 2, 23);
  strokeWeight(2);
  circle(width / 2 - 80, height / 2, 18);
  circle(width / 2 + 130, height / 2, 18);
  strokeWeight(2.8);
  circle(width / 2 - 130, height / 2, 27);
  circle(width / 2 + 80, height / 2, 27);
  strokeWeight(1);
  circle(width / 2 - 180, height / 2, 27);
  circle(width / 2 + 180, height / 2, 27);

  push();
  translate(-80, 0);
  mydrumString.display();
  mydrumString2.display();
  mydrumString3.display();
  mydrumString4.display();

  push();
  translate(width + 180, 0);
  scale(-1, 1);
  mydrumString.display();
  mydrumString2.display();
  mydrumString3.display();
  pop();
  pop();

  //드럼
  noFill();
  stroke(0);
  strokeWeight(8);
  beginShape();
  for (let v of drum.vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);

  strokeWeight(2.5);
  ellipse(width / 2, height / 2, rw, rh / 2);
  strokeWeight(1.2);
  ellipse(width / 2 + 10, height / 2 + 30, rw, rh / 3);

  //드럼기둥
  stroke(0);

  push();
  strokeWeight(3.5);
  line(width / 2, height / 2 + rh - 30, width / 2, height);
  fill(0);
  circle(width / 2 + 10, height / 2 + rh - 30, 10);
  strokeWeight(8);
  line(width / 2 + 10, height / 2 + rh - 30, width / 2 - 10, height);
  fill(0);
  circle(width / 2 - 20, height / 2 + rh - 30, 10);
  strokeWeight(1.3);
  line(width / 2 - 20, height / 2 + rh - 30, width / 2 + 30, height);
  fill(0);
  circle(width / 2, height / 2 + rh - 30, 10);
  pop();

  //물(와인) 드랍
  for (let w of waters) {
    w.display();
  }

  //물 튀어오름
  if (drumtramp) {
    for (let w of waters) {
      Body.applyForce(w.body, w.body.position, {
        x: random(-0.01, 0.01),
        y: -0.02,
      });
    }
    drumtramp = false;
  }

  //배경 그래픽
  for (let k = 0; k < lines.length; k++) {
    push();
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
    pop();
  }

  for (let k = 0; k < lines.length; k++) {
    push();
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
    pop();
  }

  line(0, height / 2 + 30, width, height / 2 + 60);
  strokeWeight(0.5);
  line(0, height / 2 + 70, width, height / 2 + 40);

  //와인잔
  myglass.display();
  myglass2.display();
  myglass3.display();
  myglass4.display();
  myglass5.display();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

//터치 감지
function touchStarted() {
  let tx, ty;
  if (touches && touches.length > 0) {
    tx = touches[0].x;
    ty = touches[0].y;
  } else {
    tx = touchX;
    ty = touchY;
  }

  touchpoint(tx, ty);
  return false;
}

function touchpoint(px, py) {
  if (insideRect(px, py, drum.position.x, drum.position.y, rw, rh)) {
    print("터치되었습니다.");

    soundFile.play();

    if (revert) {
      watertowine = false;
      revert = false;
      engine.gravity.y = -1;
    } else {
      if (random(0, 1) < 0.1) {
        watertowine = true;
        revert = true;
        engine.gravity.y = 1;
      } else {
        watertowine = false;
        engine.gravity.y = -1;
      }
    }

    let wx = width / 2;
    let wy = height / 2;
    let a = rw / 2;
    let b = rh / 2;

    for (let i = 0; i < 12; i++) {
      let rm = random(TWO_PI);
      let r = random(1);
      let x = wx + a * 0.1;
      let y = wy + b * 0.1;
      let size = random(6, 16);

      waters.push(new Water(x, y, size));
    }

    drumtramp = true;
  }
}

function insideRect(px, py, cx, cy, w, h) {
  return Math.abs(px - cx) <= w / 2 && Math.abs(py - cy) <= h / 2;
}

//////////////////
//드럼 줄 class
class drumString {
  constructor(x, y, j, bw, a) {
    this.x = x;
    this.y = y;
    this.bW = bw;
    this.j = j;
    this.c = color(0);
    this.offset = random(100);
    this.a = a;
  }

  display() {
    noFill();
    push();
    stroke(this.c);
    this.pressure = map(sin(0.03), -1, 1, 0.6, 2.5);

    stroke(0);
    strokeWeight(this.bW * this.pressure);

    beginShape();
    for (let k = 0; k <= 1; k += 0.05) {
      let x = bezierPoint(
        this.x + this.a,
        this.x + 50,
        this.x + 50 + this.a,
        this.x + 90,
        k
      );
      let y = bezierPoint(this.y, this.y, this.y + 160, this.y + 160, k);

      let nx = noise(this.offset + k * 5 + 0.02);
      let ny = noise(this.offset + k * 5 + 100 + 0.02);
      let jX = map(nx, 0, 1, -this.j, this.j);
      let jY = map(ny, 0, 1, -this.j, this.j);

      vertex(x + jX, y + jY);
    }
    endShape();

    pop();
  }
}

//물 class
class Water {
  constructor(x, y, r) {
    this.body = Bodies.circle(x, y, r, {
      restitution: 0.6,
      friction: 0.2,
      label: "water",
    });
    Composite.add(world, this.body);
  }
  display() {
    this.pos = this.body.position;
    push();
    if (watertowine) {
      fill(255, 0, 0, 50);
    } else {
      fill(0, 0, 255, 50);
      stroke(0);
    }
    circle(this.pos.x, this.pos.y, this.body.circleRadius);
    pop();
  }
}

//와인잔 class
class Wineglass {
  constructor(x, y, d) {
    this.x = x;
    this.y = y;
    this.d = d;
    rectMode(CENTER);
    this.body = Bodies.rectangle(this.x + this.d / 2, this.y, 40, 1, {
      isStatic: true,
    });
    this.body1 = Bodies.rectangle(
      this.x + this.d / 2 - 20,
      this.y - 20,
      1,
      40,
      { isStatic: true }
    );
    this.body2 = Bodies.rectangle(
      this.x + this.d / 2 + 20,
      this.y - 20,
      1,
      40,
      { isStatic: true }
    );

    this.pos = this.body.position;
    this.pos1 = this.body1.position;
    this.pos2 = this.body2.position;
    Composite.add(engine.world, this.body, this.body1, this.body2);
  }
  display() {
    bezier(
      this.x + this.d / 2,
      this.y,
      this.x - this.d,
      this.y,
      this.x,
      this.y - this.d * 2,
      this.x - this.d,
      this.y - this.d * 2
    );
    push();
    translate(this.x, 0);
    scale(-1, 1);
    translate(-this.x - this.d, 0);
    bezier(
      this.x + this.d / 2,
      this.y,
      this.x - this.d,
      this.y,
      this.x,
      this.y - this.d * 2,
      this.x - this.d,
      this.y - this.d * 2
    );
    pop();

    push();
    strokeWeight(2);
    line(
      this.x + this.d / 2,
      this.y - 10,
      this.x + this.d / 2 + 2,
      this.y + this.d
    );
    pop();

    push();
    strokeWeight(2.5);
    line(this.x - this.d, this.y + 10, this.x + this.d * 2, this.y + 20);
    pop();
    circle(this.x + this.d / 2, this.y - 10, 7);
    push();
    noStroke();
    fill(0);
    circle(this.x + this.d * 2, this.y + 20, 7);
    circle(this.x - this.d, this.y - this.d * 2, 5);
    pop();

    push();

    noFill();
    rect(this.pos.x, this.pos.y, 40, 1);
    rect(this.pos1.x, this.pos1.y, 1, 40);
    rect(this.pos2.x, this.pos2.y, 1, 40);
    pop();
  }
}
