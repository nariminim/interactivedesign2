//C452044 이예진
//파울 클레 - 음악으로 전하는 성경 이야기
//동방박사, 성탄절

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Constraint = Matter.Constraint;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Collision = Matter.Collision;

let engine;
let world;
let canvas;
let mouse, mouseConstraint;

const Svg = Matter.Svg;
let customShape;
let starColor;

let lines = [];

let windchimes = [];

let backs = [];

let soudnFile;

//////////////////
//preload 함수
function preload() {
  soundFile = loadSound("asset/slow-chime-1-104570.mp3");
}

//////////////////
//setup 함수
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = "none";
  rectMode(CENTER);

  engine = Engine.create();
  world = engine.world;

  starColor = color(255, 255, 255, 0);

  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      damping: 0.1,
    },
  });

  Composite.add(world, mouseConstraint);

  Matter.Common.setDecomp(decomp);

  let pathElement = document.getElementById("myShape");
  let verts = Svg.pathToVertices(pathElement, 10);
  customShape = Bodies.fromVertices(width / 6, height / 4, verts, {
    label: "star",
    isStatic: true,
  });
  Body.scale(customShape, 0.4, 0.4);
  Composite.add(world, customShape);

  //배경
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

  for (let i = 0; i < width; i += 40) {
    let len = map(i, 0, width / 1.2, 600, 40);
    windchimes.push(new Windchimes(400 + i, 0, len, 8));
  }

  Matter.Events.on(mouseConstraint, "startdrag", changeColor);

  mystar = new stargraphic(width / 2, height / 2, 160, 6, 2);
  mystar2 = new stargraphic(width / 2, height / 2, 160, 6, 2);

  for (let i = 0; i < 100; i++) {
    let x = random(width);
    let y = random(height);
    backs.push(new back(x, y));
  }
}

/////////////////////////////////
//색깔변화
function changeColor(event) {
  print("start drag");
  print(event);
  if (event.body && event.body.label === "star") {
    starColor = color(random(255), random(255), random(255));
  }
}

/////////////////////////////////
//draw함수
function draw() {
  background(255);
  Engine.update(engine);

  for (let w of windchimes) {
    w.display();
  }

  /////////////////////////////////
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

  //custom shape
  if (customShape) {
    noFill();
    noStroke();

    push();
    beginShape();
    for (let v of customShape.vertices) {
      vertex(v.x, v.y);
    }
    endShape(CLOSE);
    pop();

    push();
    fill(starColor);
    stroke(0);
    if (customShape.parts && customShape.parts.length > 1) {
      for (let i = 1; i < customShape.parts.length; i++) {
        let part = customShape.parts[i];
        beginShape();
        for (let v of part.vertices) {
          vertex(v.x, v.y);
        }
        endShape(CLOSE);
      }
    }
    pop();
  }
  //////////////////////////
  //충돌 이펙트
  //ai(chatGPT)참고
  if (customShape) {
    let parts;
    if (customShape.parts && customShape.parts.length > 1) {
      parts = customShape.parts.slice(1);
    } else {
      parts = [customShape];
    }

    for (let i = 0; i < windchimes.length; i++) {
      let bar = windchimes[i].Wchime;

      for (let j = 0; j < parts.length; j++) {
        let p = parts[j];
        let result = Collision.collides(p, bar);

        if (result && result.collided) {
          print("부딪혔습니다.");
          starColor = color(0, 0, 0, random(0, 80));
          return;
        } else {
          starcolor = color(0, 0, 0, 0);
        }
      }
    }
  }
  //////////////////////////
  push();
  translate(-100, 0);
  scale(0.5);
  mystar.display();
  pop();

  push();
  rotate(0.1);
  translate(width / 2 - 80, -20);
  scale(-1, 1);
  scale(0.5);
  mystar2.display();
  pop();

  stroke(0);
  line(width / 6 - 90, height / 4 + 70, width / 6 + 100, height / 4 - 10);
  push();
  translate(width / 6 - 90, height / 4 + 70);
  rotate(-1);
  line(0, 0, 200, -10);
  pop();

  for (let b of backs) {
    b.display();
  }
}

//////////////////////////
//class함수
class Windchimes {
  constructor(x, y, len, w) {
    this.x = x;
    this.y = y;
    this.len = len;
    this.w = w;

    this.pinBody = Bodies.circle(this.x, this.y, 3, { isStatic: true });

    this.pin = Bodies.circle(x, y + len, 12, {
      friction: 0.1,
      restitution: 0.2,
      density: 0.001,
    });

    this.Wchime = Bodies.rectangle(
      this.x,
      this.y + this.len / 2,
      this.w,
      this.len,
      {
        friction: 0.2,
        frictionAir: 0.005,
        restitution: 0.1,
        density: 0.0018,
      }
    );

    this.p1 = Constraint.create({
      bodyA: this.pinBody,
      pointA: { x: 0, y: 0 },
      bodyB: this.Wchime,
      pointB: { x: 0, y: -this.len / 2 },
      length: 0,
      stiffness: 0.98,
      damping: 0.06,
    });

    this.p2 = Constraint.create({
      bodyA: this.Wchime,
      pointA: { x: 0, y: this.len / 2 },
      bodyB: this.pin,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 0.98,
      damping: 0.06,
    });

    Composite.add(world, [
      this.pinBody,
      this.Wchime,
      this.pin,
      this.p1,
      this.p2,
    ]);

    this.Wchime.label = "bar";
  }

  display() {
    push();
    translate(this.Wchime.position.x, this.Wchime.position.y);
    rotate(this.Wchime.angle);
    stroke(0);
    noFill();
    rect(0, 0, this.w, this.len, 2);
    pop();

    stroke(0);
    noFill();
    circle(this.pinBody.position.x, this.pinBody.position.y, 6);

    stroke(0);
    noFill();
    circle(this.pin.position.x, this.pin.position.y, 24);
  }
}

class stargraphic {
  constructor(x, y, size, j, w) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.j = j;
    this.w = w;
    this.c = color(0);
    this.offset = random(100);
  }
  display() {
    noFill();
    push();
    stroke(this.c);

    let pressure = map(sin(0.02), -1, 1, 0.8, 2.2);
    strokeWeight(this.bW * pressure);

    let s = this.size;
    let p1 = createVector(this.x, this.y - s);
    let p2 = createVector(this.x - s * 0.8, this.y + s * 0.9);
    let p3 = createVector(this.x + s * 0.4, this.y + s * 0.5);

    let points = [p1, p2, p3, p1];

    for (let i = 0; i < 3; i++) {
      beginShape();
      for (let t = 0; t <= 1.1; t += 0.05) {
        let x = lerp(points[i].x, points[i + 1].x, t);
        let y = lerp(points[i].y, points[i + 1].y, t);

        let n = noise(i * 20 + t * 20);
        let jx = map(n, 0, 1, -this.j, this.j);
        let jy = map(n, 0, 1, -this.j, this.j);

        vertex(x + jx, y + jy);
      }
      endShape();
    }

    pop();
  }
}

class back {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  display() {
    push();
    stroke(0, 0, 0, 90);
    strokeWeight(0.8);
    bezier(
      this.x,
      this.y,
      this.x + 10,
      this.y,
      this.x + 5,
      this.y - 20,
      this.x,
      this.y - 10
    );
    pop();
  }
}

function touchStarted() {
  soundFile.play();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
