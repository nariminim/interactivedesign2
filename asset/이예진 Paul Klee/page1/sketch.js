//C452044 이예진
//파울 클레 - 음악으로 전하는 성경 이야기
//씨 뿌리는 자

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine, canvas, mouse;
let myBell;

let bellBall;
let bellString;

let grounds = [];
let seeds = [];

let lines = [];

let soundFile;
///////////////////////////////////
//ios 오디오
//ai(chatgpt)참고
let audioUnlocked = false;
function iosAudioUnlockSetup() {
  function unlockAudio() {
    try {
      if (getAudioContext().state !== "running") {
        getAudioContext().resume();
      }
      var osc = new p5.Oscillator("sine");
      osc.amp(0);
      osc.start();
      osc.stop(0.02);
      audioUnlocked = getAudioContext().state === "running";

      window.removeEventListener("touchend", unlockAudio, true);
      window.removeEventListener("click", unlockAudio, true);
    } catch (e) {}
  }

  window.addEventListener("touchend", unlockAudio, true);
  window.addEventListener("click", unlockAudio, true);
}
///////////////////////////////////

function preload() {
  soundFile = loadSound("asset/bell-fx-410608.mp3");
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

  iosAudioUnlockSetup();

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

  //종
  bellBall = Bodies.circle(width / 2, height / 2, 50);
  bellString = Matter.Constraint.create({
    pointA: { x: width / 2, y: 120 },
    bodyB: bellBall,
    length: 200,
    stiffness: 0.1,
    damping: 0.001,
  });

  //땅
  for (let i = 0; i < 15; i++) {
    let gx = random(200, width - 200);
    let gy = random(height / 2, height - 10);
    let gw = random(100, 250);
    let ghPhys = 16;
    let angle = random(-0.15, 0.15);

    let ground = Bodies.rectangle(gx + i * 10, gy, gw, 5, {
      isStatic: true,
      angle: angle,
    });
    Body.rotate(ground, random(-0.15, 0.15));

    ground.graphicL = gw;
    ground.graphicS = random(2, 4);

    grounds.push(ground);
  }

  Composite.add(engine.world, [bellBall, bellString, ...grounds]);

  Composite.add(engine.world, [
    Bodies.rectangle(20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width - 20, height / 2, 40, height, { isStatic: true }),
    Bodies.rectangle(width / 2, 20, width, 40, { isStatic: true }),
    Bodies.rectangle(width / 2, height - 20, width, 40, { isStatic: true }),
  ]);

  noStroke();

  myBell = new Bell(width / 2, 50, 0.6, 5);
  myBell2 = new Bell(width / 2, 50, 5, 0.8);
  myBell3 = new Bell(width / 2, 50, 6, 0.2);
}

///////////////////////////////
//draw

function draw() {
  background(255);
  Engine.update(engine);

  //Bell 종 그리기
  //1. bell 바디
  myBell.display();
  push();
  translate(width, 0);
  scale(-1, 1);
  myBell.display();
  pop();

  push();
  scale(-1, 1);
  translate(-width, 0);
  strokeWeight(1);
  stroke(0);
  line(width / 2 - 100, 195, width / 2 + 100, 180);
  bezier(
    width / 2 - 100,
    195,
    width / 2 - 140,
    200,
    width / 2 - 80,
    160,
    width / 2 - 100,
    190
  );
  pop();

  push();
  rotate(0.05);
  strokeWeight(8);
  stroke(0);
  line(width / 2 - 100, 165, width / 2 + 100, 150);
  bezier(
    width / 2 - 100,
    165,
    width / 2 - 140,
    170,
    width / 2 - 80,
    130,
    width / 2 - 100,
    160
  );
  pop();

  push();
  translate(-20, 100);
  rotate(-0.2);
  strokeWeight(3);
  stroke(0);
  line(width / 2 - 100, 165, width / 2 + 100, 150);
  noStroke();
  fill(0);
  circle(width / 2 + 100, 150, 10);
  pop();

  push();
  translate(10, 0);
  myBell2.display();
  push();
  translate(width, 0);
  scale(-1, 1);
  myBell2.display();
  pop();
  pop();

  push();
  translate(-20, 20);
  myBell3.display();
  push();
  translate(width, 0);
  scale(-1, 1);
  myBell3.display();
  pop();
  pop();

  circle(width / 2, 50, 20);
  fill(0);
  noStroke();
  circle(width / 2 + 10, 50, 20);

  //종대 그리기
  noFill();
  strokeWeight(2);
  stroke(0);
  line(
    bellString.pointA.x,
    bellString.pointA.y,
    bellBall.position.x,
    bellBall.position.y
  );

  strokeWeight(5);
  noFill();
  circle(bellBall.position.x, bellBall.position.y, 50);
  //종대 기울기 제한
  const ax = bellString.pointA.x;
  const ay = bellString.pointA.y;
  const bx = bellBall.position.x;
  const by = bellBall.position.y;

  const vx = bx - ax;
  const vy = by - ay;

  let angle = Math.atan2(vx, vy);

  const minA = -Math.PI / 4;
  const maxA = Math.PI / 4;

  //ai(chatgpt) 참고
  if (angle < minA || angle > maxA) {
    const len = Math.hypot(vx, vy);
    const clampA = Math.max(minA, Math.min(maxA, angle));
    const nx = ax + Math.sin(clampA) * len;
    const ny = ay + Math.cos(clampA) * len;
    Body.setPosition(bellBall, { x: nx, y: ny });
    Body.setVelocity(bellBall, { x: 0, y: 0 });
  }

  //땅 그리기
  fill(0);
  noStroke();
  for (let g of grounds) {
    push();
    translate(g.position.x, g.position.y);
    rotate(g.angle);
    rect(0, 0, g.bounds.max.x - g.bounds.min.x, 1);
    pop();
  }

  //땅 그래픽 장식
  stroke(0);
  noFill();
  for (let i = 0; i < grounds.length; i++) {
    let g = grounds[i];
    let l = g.graphicL;
    let s = g.graphicS;

    push();
    translate(0, 0);
    rotate(g.angle * 0.3);
    strokeWeight(s);
    line(g.position.x - l, g.position.y, g.position.x, g.position.y);
    pop();

    if (i === 1 || i === 4) {
      push();
      translate(0, 0);
      rotate(g.angle * 0.3);
      strokeWeight(s);
      bezier(
        g.position.x,
        g.position.y,
        g.position.x + 10,
        g.position.y,
        g.position.x,
        g.position.y - 20,
        g.position.x,
        g.position.y - 10
      );
      pop();
    } else if (i === 2 || i === 3) {
      push();
      translate(0, 0);
      rotate(g.angle * 0.3);
      strokeWeight(s);
      bezier(
        g.position.x,
        g.position.y,
        g.position.x,
        g.position.y - 10,
        g.position.x,
        g.position.y - 25,
        g.position.x + 25,
        g.position.y - 25
      );
      push();
      strokeWeight(1);
      stroke(0);
      noFill();
      circle(g.position.x + 25, g.position.y - 25, 7, 7);
      pop();
      pop();
    } else {
      push();
      translate(0, 0);
      rotate(g.angle * 0.3);
      strokeWeight(s);
      bezier(
        g.position.x - l,
        g.position.y,
        g.position.x - l,
        g.position.y + 10,
        g.position.x - l,
        g.position.y + 20,
        g.position.x - l - 20,
        g.position.y + 20
      );
      pop();
      push();
      translate(0, 0);
      rotate(g.angle * 0.3);
      noStroke();
      fill(0);
      circle(g.position.x - l - 20, g.position.y + 20, 7, 7);
      pop();
    }
  }

  //씨앗
  stroke(0);
  noFill();
  for (let s of seeds) {
    push();
    translate(s.position.x, s.position.y);
    rotate(s.angle);
    strokeWeight(2);
    circle(0, 0, s.circleRadius * 2);
    pop();
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

  line(30, height / 2 - 10, width - 30, height / 2 + 30);
  line(30, height / 2 + 30, width - 30, height / 2 - 10);
  circle(30, height / 2 - 10, 10);
  circle(width - 30, height / 2 + 30, 10);
}

function mousePressed() {
  soundFile.play();
}

function touchStarted() {
  if (touches.length === 0) return false;

  let tx = touches[0].x;
  let ty = touches[0].y;

  let d = dist(tx, ty, bellBall.position.x, bellBall.position.y);

  if (d < 80) {
    userStartAudio();
    if (getAudioContext().state !== "running") {
      getAudioContext().resume();
    }

    if (soundFile && soundFile.isLoaded()) {
      if (soundFile.isPlaying()) soundFile.stop();
      soundFile.setVolume(0.1);
      soundFile.rate(1.0);
      soundFile.play();
    }
    let newBodies = [];

    for (let i = 0; i < 5; i++) {
      let r = random(3, 6);
      let b = Bodies.circle(
        width / 2 + random(-5, 5),
        height / 4 + random(-5, 5),
        r,
        {
          restitution: random(0.5, 0.9),
          friction: 0.5,
          frictionAir: 0.02,
          density: 0.03,
        }
      );
      Body.setVelocity(b, { x: random(-2, 2), y: random(-1, 0.5) });

      seeds.push(b);
      newBodies.push(b);
    }
    for (let i = 0; i < 12; i++) {
      let r = random(3, 6);
      let b2 = Bodies.circle(tx + random(-5, 5), ty + random(-5, 5), r, {
        restitution: random(0.5, 0.9),
        friction: 0.5,
        frictionAir: 0.02,
        density: 0.03,
      });
      Body.setVelocity(b2, { x: random(-2, 2), y: random(-1, 0.5) });

      seeds.push(b2);
      newBodies.push(b2);
    }
    Composite.add(engine.world, newBodies);
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

///////////////////////////////
//class 함수들

//bell 클래스
class Bell {
  constructor(x, y, j, bw) {
    this.x = x;
    this.y = y;
    this.bW = bw;
    this.j = j;
    this.c = color(0);
    this.offset = random(100);
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
      let x = bezierPoint(this.x, this.x - 110, this.x, this.x - 110, k);
      let y = bezierPoint(this.y, this.y + 30, this.y + 120, this.y + 160, k);

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
