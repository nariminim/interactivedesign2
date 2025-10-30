let paletteGroups = [
  ["#0e2340", "#21325c", "#33497e"],
  ["#13323f", "#3b6e7b", "#549eb7"],

  ["#345f54", "#2f3430", "#202922"],
  ["#355b26", "#477a3b", "#6a9b63"],
  ["#5f6847", "#7f926c", "#aab18b"],

  ["#241e19", "#392312", "#4a2424"],
  ["#4e4842", "#262409", "#3a342a"],
  ["#5a4414", "#824d1a", "#a4782f"],

  ["#7d846d", "#a5b193", "#bcc3a2"],
  ["#bba86c", "#c9bc90", "#babd5c"],
  ["#868682", "#a3a39f", "#c1bfbd"],

  ["#615879", "#8d84a3", "#b1a9c0"],
  ["#131314", "#232324", "#3b3b3c"],

  ["#452b67", "#604988", "#8371a8"],
  ["#7e3b5e", "#9b5b77", "#b68091"],
  ["#8e4f1e", "#aa6b36", "#c79358"],
  ["#145564", "#21777f", "#4ba2a1"],
  ["#2b4769", "#4b6285", "#6b88a9"],
];
let categoryPaletteMap = new Map();
let moverPalette = ["#b0b0ad50", "#cbcbc750", "#e5e2e050"];
let highlights = [];

//////////////////////////////////////////////////// Matter

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Events = Matter.Events;

let engine;
let stack;
let canvas;
let mouse, mouseConstraint;
let ground, groundL, groundR, groundT;

var defaultCategory = 0x0001,
  category1 = 0x0002,
  category2 = 0x0004,
  category3 = 0x0008,
  category4 = 0x0010,
  category5 = 0x0020,
  category6 = 0x0040,
  category7 = 0x0080,
  category8 = 0x0100,
  category9 = 0x0200,
  category10 = 0x0400,
  category11 = 0x0800,
  category12 = 0x1000,
  category13 = 0x2000,
  category14 = 0x4000,
  category15 = 0x8000;

/////////////////////////////////////////////////// p5
///////////////////////////////// Movers

let movers = [];
let shapes = [];
let gridCountCol = 10 * 5;
let gridCountRow = 11 * 5;
let centerX, centerY;
let gridCountW, pixelW;
let gridW, gridH;
let gap;

//////////////////////////////// Glass

let glasses = [];
let glassW;
let glassCountCol = 5;
let glassCountRow = 5;

//////////////////////////////////////////////////// p5 functions

let stacks = [];
let stackCountCol = 10;
let stackCountRow = 11;
let innerGap = 5;
let outerGap = 10;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  colorMode(HSB, 360, 100, 100);

  centerX = width / 2;
  centerY = height / 2;
  gridCountW = min(width, height) * 0.02;
  pixelW = gridCountW * 0.5;
  gap = (gridCountW - pixelW) / 2;
  gridW = gridCountW * gridCountCol;
  gridH = gridCountW * gridCountRow;

  glassCountCol = floor(random(5, 5));
  glassCountRow = glassCountCol;

  createGrid(centerX, centerY, gridW, gridH);

  engine = Engine.create();
  engine.world.gravity.y = 0.5;

  glassW = pixelW;
  glassWidth = glassW * glassCountCol + gap * (glassCountCol * 2);
  glassHeight = glassW * glassCountRow + gap * (glassCountRow * 2);

  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.5, angularStiffness: 0.5 },
  });
  Composite.add(engine.world, mouseConstraint);

  innerGap = gap / 3;
  outerGap = gap * 2;
  for (let i = 0; i < stackCountCol; i++) {
    for (let j = 0; j < stackCountRow; j++) {
      stacks.push(new Stack(i, j, innerGap, outerGap));
    }
  }

  let groundThickness = 20;

  ground = Bodies.rectangle(
    centerX,
    height + groundThickness / 2,
    gridW + groundThickness * 2,
    groundThickness,
    {
      isStatic: true,
      collisionFilter: {
        category: defaultCategory,
        mask: 0xffff,
      },
    }
  );

  groundT = Bodies.rectangle(
    centerX,
    0 - groundThickness / 2,
    gridW + groundThickness * 2,
    groundThickness,
    {
      isStatic: true,
      collisionFilter: {
        category: defaultCategory,
        mask: 0xffff,
      },
    }
  );

  groundL = Bodies.rectangle(
    centerX - gridW / 2 - groundThickness / 2,
    centerY,
    groundThickness,
    gridH + groundThickness * 2,
    {
      isStatic: true,
      collisionFilter: {
        category: defaultCategory,
        mask: 0xffff,
      },
    }
  );

  groundR = Bodies.rectangle(
    centerX + gridW / 2 + groundThickness / 2,
    centerY,
    groundThickness,
    gridH + groundThickness * 2,
    {
      isStatic: true,
      collisionFilter: {
        category: defaultCategory,
        mask: 0xffff,
      },
    }
  );

  Composite.add(engine.world, [ground, groundT, groundL, groundR]);
}

function draw() {
  background(255);
  Engine.update(engine);

  noStroke();
  fill("#0a0a0a");
  rect(width / 2, height / 2, gridW, height);
  // for (let i of shapes) {
  //   fill(20);
  //   rect(i.x, i.y, i.w);
  // }

  for (let i = movers.length - 1; i >= 0; i--) {
    let m = movers[i];
    m.run();
    if (m.isDone) movers.splice(i, 1);
  }

  for (let s of stacks) {
    s.display();
  }
}

////////////////////////////////////////////////////// functions

function changeGravity() {
  engine.world.gravity.y = 1;
}

function easeInOutQuint(x) {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

function createGrid(x, y, w, h) {
  let cellW = gridCountW;
  for (let i = 0; i < gridCountRow; i++) {
    for (let j = 0; j < gridCountCol; j++) {
      let cellX = j * gridCountW + gridCountW / 2 + x - w / 2;
      let cellY = i * gridCountW + gridCountW / 2 + y - h / 2;
      shapes.push({ x: cellX, y: cellY, w: pixelW });
    }
  }
}

function createMoverAt(mx, my) {
  let creationRadius = gridCountW * 1.5;

  for (let shape of shapes) {
    let d = dist(mx, my, shape.x, shape.y);
    if (d < creationRadius) {
      let alreadyExists = false;
      for (let m of movers) {
        if (m.x === shape.x && m.y === shape.y) {
          alreadyExists = true;
          break;
        }
      }
      if (!alreadyExists) {
        movers.push(new Mover(shape.x, shape.y, pixelW / 2, mx, my));
      }
    }
  }
}

function releaseGlassAt(mx, my) {
  for (let s of stacks) {
    s.releaseGlassAt(mx, my);
  }
}

function mousePressed() {
  createMoverAt(mouseX, mouseY);
  releaseGlassAt(mouseX, mouseY);
  addHighlight(mouseX, mouseY);
}

function mouseDragged() {
  createMoverAt(mouseX, mouseY);
  releaseGlassAt(mouseX, mouseY);
  addHighlight(mouseX, mouseY);
}

function touchStarted() {
  handleTouches();
}

function touchMoved() {
  handleTouches();
}

function handleTouches() {
  for (let t of touches) {
    createMoverAt(t.x, t.y);
    releaseGlassAt(t.x, t.y);
    addHighlight(t.x, t.y);
  }
}

function addHighlight(x, y) {
  highlights.push({ x, y, time: millis() });
}
