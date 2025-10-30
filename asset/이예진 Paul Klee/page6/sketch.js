//C452044 이예진
//파울 클레 - 음악으로 전하는 성경 이야기
//십자가

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Constraint = Matter.Constraint;

let engine, canvas, mouse;
let lines = [];

let crosses = [];

let soundFile;
let lastSoundMs = 0;
const SOUND_COOLDOWN = 150;

///////////////////////////////
//preload
function preload() {
  soundFile = loadSound("asset/xylophone-a-45818.mp3");
}

///////////////////////////////
//set up
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  canvas.elt.style.touchAction = "none";
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
  if (soundFile) {
    soundFile.setVolume(0.6);
    soundFile.playMode("restart");
  }
  /////////////////////////////
  // Matter
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
  ]);

  myfivelines = new Fivelines(width / 3, height / 4, width * 0.6, 6);
  myfivelines2 = new Fivelines(
    width - width / 3,
    height - height / 1.8,
    width * 0.5,
    6
  );
  myfivelines3 = new Fivelines(width / 3, height - height / 6, width * 0.3, 6);
  myfivelines4 = new Fivelines(
    width - width / 4,
    height - height / 6,
    width * 0.25,
    6
  );
}

///////////////////////////////
//draw
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

  myfivelines.display();
  myfivelines2.display();
  myfivelines3.display();
  myfivelines4.display();

  for (let i = 0; i < crosses.length; i++) {
    crosses[i].display();
  }
  for (let k = 0; k < 100; k++) {
    for (let i = 0; i < 100; i++) {
      strokeWeight(1);
      line(i * 100, k * 200, 40 + i * 100, 40 + k * 200);
    }

    for (let i = 0; i < 100; i++) {
      strokeWeight(1);
      line(70 + i * 100, k * 200, 40 + i * 100, 60 + k * 200);
    }
  }

  const allLines = [
    ...myfivelines.lines,
    ...myfivelines2.lines,
    ...myfivelines3.lines,
    ...myfivelines4.lines,
  ];
  for (let cross of crosses) {
    let collided = false;
    for (let line of allLines) {
      let collisions = Matter.Query.collides(cross.body, [line]);
      if (collisions.length > 0) {
        collided = true;
        break;
      }
    }
    //ai(chatgpt)참고
    if (collided && !cross.wasColliding) {
      let now = millis();
      if (now - lastSoundMs > SOUND_COOLDOWN && soundFile?.isLoaded()) {
        soundFile.play();
        lastSoundMs = now;
      }
    }
    cross.wasColliding = collided;
  }
}

///////////////////////////////
//class 함수들
class Fivelines {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    this.lines = [];
    this.pins = [];

    for (let i = 0; i < 5; i++) {
      let ly = this.y + i * 20;
      let line = Bodies.rectangle(this.x, ly, this.w, this.h, {
        density: 0.001,
        friction: 0.2,
        frictionAir: 0.01,
        restitution: 0.05,
      });
      line.label = "line";
      const pin = Constraint.create({
        bodyA: line,
        pointA: { x: 0, y: 0 },
        pointB: { x: this.x, y: ly },
        length: 0,
        stiffness: 0.9,
        damping: 0.2,
      });

      Composite.add(engine.world, [line, pin]);
      this.lines.push(line);
      this.pins.push(pin);
    }
  }
  display() {
    stroke(0);
    strokeWeight(this.h);
    noFill();

    for (let i = 0; i < this.lines.length; i++) {
      let l = this.lines[i];
      let pos = l.position;
      let angle = l.angle;

      push();
      strokeWeight(i + 1);
      translate(pos.x, pos.y);
      rotate(angle);
      line(-this.w / 2, 0, this.w / 2, 0);
      strokeWeight(1 + 1 / i);
      circle(this.w / 2, 0, 10);
      strokeWeight(1 + i);
      circle(-this.w / 2, 0, 10);
      pop();
    }
  }
}

class Cross {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.aw = 40;
    this.ah = 10;
    this.lw = 10;
    this.lh = 40;

    let hor = Bodies.rectangle(this.x, this.y, this.aw, this.ah, {
      chamfer: 3,
    });
    let ver = Bodies.rectangle(this.x, this.y, this.lw, this.lh, {
      chamfer: 3,
    });
    hor.label = "cross";
    ver.label = "cross";

    this.body = Body.create({
      parts: [hor, ver],
      friction: 0.1,
      frictionAir: 0.02,
      restitution: 1,
      density: 0.02,
    });

    this.wasColliding = false;

    Composite.add(engine.world, this.body);
  }
  display() {
    let pos = this.body.position;
    let angle = this.body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    rectMode(CENTER);
    noStroke();
    fill(0);
    rect(0, -10, 40, 10, 2);
    rect(0, 0, 10, 80, 2);
    pop();
  }
}

function touchStarted() {
  crosses.push(new Cross(mouseX, mouseY));
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
