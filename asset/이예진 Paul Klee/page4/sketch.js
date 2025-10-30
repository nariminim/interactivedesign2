//C452044 이예진
//파울 클레 - 음악으로 전하는 성경 이야기
//모세의 기적

const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Common = Matter.Common;
const Query = Matter.Query;

const Svg = Matter.Svg;

let engine;
let canvas;
let mouse, mouseConstraint;
let customShape;
let fishes = [];

let lines = [];

let globalfishverts = null;

let soundFile;

//////////////////
//preload 함수
function preload() {
  soundFile = loadSound("asset/trumpet-effect-01-127188.mp3");
}

////////////////////////////////
//setup 함수
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.touchAction = "none";

  engine = Engine.create();
  engine.world.gravity.y = 0;
  Common.setDecomp(decomp);

  mouse = Mouse.create(canvas.elt);
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
  });
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.5,
      angularStiffness: 0.8,
    },
  });

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

  let pathElement = document.getElementById("myShape");
  let fishpathElement = document.getElementById("fishShape");
  let verts = Svg.pathToVertices(pathElement, 20);
  let fishverts = Svg.pathToVertices(fishpathElement, 1);

  globalfishverts = fishverts;

  customShape = Bodies.fromVertices(width / 2, height / 2, verts, {
    label: "trumpet",
  });
  Body.scale(customShape, 0.4, 0.4);

  //바닥
  Composite.add(engine.world, [
    Bodies.rectangle(width / 2, 20, width, 40, { isStatic: true }),
    Bodies.rectangle(width / 2, height - 20, width, 40, { isStatic: true }),
  ]);

  for (let i = 0; i < 120; i++) {
    let fx = random(120, width - 120);
    let fy = random(120, height - 120);

    fishShape = Bodies.fromVertices(fx, fy, fishverts, { label: "fish" });
    Composite.add(engine.world, fishShape);
    fishes.push(fishShape);
  }

  Composite.add(engine.world, [customShape, mouseConstraint]);
}

//////////////////////////////
//draw함수
function draw() {
  Engine.update(engine);
  background(255);

  noFill();
  noStroke();
  beginShape();
  for (let v of customShape.vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);

  push();
  stroke(0);
  strokeWeight(4);
  fill(255);
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

  for (let i = 0; i < fishes.length; i++) {
    let f = fishes[i];

    stroke(0);
    fill(255);
    if (f.parts && f.parts.length > 1) {
      for (let p = 1; p < f.parts.length; p++) {
        let part = f.parts[p];
        beginShape();
        for (let j = 0; j < part.vertices.length; j++) {
          let v = part.vertices[j];
          vertex(v.x, v.y);
        }
        endShape(CLOSE);
      }
    } else {
      beginShape();
      for (let k = 0; k < f.vertices.length; k++) {
        let vv = f.vertices[k];
        vertex(vv.x, vv.y);
      }
      endShape(CLOSE);
    }
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
}
///////////////////////////
//물고기 소환
function spawnfish(sy) {
  if (!globalfishverts) {
    return;
  }

  let xoff = -80;
  let y = constrain(sy, 120, height - 120);
  let nf = Bodies.fromvertices(xoff, y, globalfishverst, { label: "fish" });

  Body.setVelocity(nf, { x: 20, y: 0 });
  nf.frictionAir = 0.005;

  Composite.add(engine.world, nf);
  fishes.push(nf);
}

function fishaction(px, py) {
  const presscheck = Query.point([customShape], { x: px, y: py }).length > 0;
  if (!presscheck) {
    return;
  }

  let limittop = py - 20;
  let limitbottom = py + 20;

  for (let i = 0; i < fishes.length; i++) {
    let f = fishes[i];
    let fy = f.position.y;

    if (fy >= limittop && fy <= limitbottom) {
      Body.setVelocity(f, { x: -40, y: random(-1, 1) });
      f.frictionAir = 0.02;
      Body.setAngularVelocity(f, 0);
    }
  }
  for (let n = 0; n < 3; n++) {
    spawnfish(sy);
  }
}

function touchStarted() {
  if (touches && touches.length > 0) {
    soundFile.play();
    for (let i = 0; i < touches.length; i++) {
      let t = touches[i];
      fishaction(t.x, t.y);
    }
  }
  return false;
}

function touchMoved() {
  if (touches && touches.length > 0) {
    for (let i = 0; i < touches.length; i++) {
      let t = touches[i];
      fishaction(t.x, t.y);
    }
  }
  return false;
}
