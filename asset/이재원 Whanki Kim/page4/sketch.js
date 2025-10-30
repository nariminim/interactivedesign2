const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

let engine;
let stack;
let mConstraint;
let canvas;
let walls = [];

let triangleOptions = {
  restitution: 0.5,
  friction: 0.1,
  frictionAir: 0.015,
};

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  engine = Engine.create();
  engine.positionIterations = 10;

  createWalls();
  createStacks();

  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  let mouseOptions = {
    mouse: canvasMouse,
    constraint: {
      stiffness: 0.1,
      damping: 0.05,
    },
  };
  mConstraint = MouseConstraint.create(engine, mouseOptions);
  Composite.add(engine.world, mConstraint);
}

function createStacks() {
  if (stack) {
    Composite.remove(engine.world, stack);
  }
  let triangleSize = width / 24; //조절하기
  let triangleHeight = 2 * triangleSize * cos(30);
  let triangleWidth = 1.5 * triangleSize;
  let colsPerGroup = 3;
  let rowsPerGroup = 2;
  let groupWidth = (colsPerGroup * triangleWidth) / 2;

  let totalGroupWidth = groupWidth * 3;
  let desiredGap = triangleWidth * 4;
  let innerWidth = width - 40;
  let desiredTotalWidth = totalGroupWidth + desiredGap * 2;
  let gap = triangleWidth * 5;
  if (desiredTotalWidth > innerWidth) {
    let availableGapWidth = innerWidth - totalGroupWidth;
    gap = max(0, availableGapWidth / 2);
  } else {
    gap = desiredGap;
  }
  let stackTotalWidth = totalGroupWidth + gap * 2;
  let stackTotalHeight = rowsPerGroup * triangleHeight;

  let topWallBottomY = 20;
  let breathingRoom = triangleHeight;
  let stackTopY = topWallBottomY + breathingRoom;
  let startY = stackTopY + triangleHeight / 2;

  let stackLeftX = width / 2 - stackTotalWidth / 1.5;
  let startX1 = stackLeftX + triangleSize / 2;
  let startX2 = startX1 + groupWidth + gap;
  let startX3 = startX2 + groupWidth + gap;

  let meshOptions = { stiffness: 0.02 };

  let stack1 = Composites.stack(
    startX1,
    startY,
    colsPerGroup,
    rowsPerGroup,
    triangleWidth,
    triangleHeight,
    function (x, y) {
      return Bodies.polygon(x, y, 3, triangleSize, triangleOptions);
    }
  );
  Composites.mesh(stack1, colsPerGroup, rowsPerGroup, false, meshOptions);

  let stack2 = Composites.stack(
    startX2,
    startY,
    colsPerGroup,
    rowsPerGroup,
    triangleWidth,
    triangleHeight,
    function (x, y) {
      return Bodies.polygon(x, y, 3, triangleSize, triangleOptions);
    }
  );
  Composites.mesh(stack2, colsPerGroup, rowsPerGroup, false, meshOptions);

  let stack3 = Composites.stack(
    startX3,
    startY,
    colsPerGroup,
    rowsPerGroup,
    triangleWidth,
    triangleHeight,
    function (x, y) {
      return Bodies.polygon(x, y, 3, triangleSize, triangleOptions);
    }
  );
  Composites.mesh(stack3, colsPerGroup, rowsPerGroup, false, meshOptions);

  stack = Composite.create();
  Composite.add(stack, [stack1, stack2, stack3]);
  Composite.add(engine.world, stack);
}

function createWalls() {
  Composite.remove(engine.world, walls);
  walls = [
    //왼쪽벽
    Bodies.rectangle(20 / 2, height / 2, 20, height, { isStatic: true }),
    // 오른쪽벽
    Bodies.rectangle(width - 20 / 2, height / 2, 20, height, {
      isStatic: true,
    }),
    // 위쪽벽
    Bodies.rectangle(width / 2, 20 / 2, width, 20, { isStatic: true }),
    // 바닥
    Bodies.rectangle(width / 2, height - 20 / 2, width, 20, { isStatic: true }),
  ];
  Composite.add(engine.world, walls);
}

function draw() {
  background("#1a1c1b");

  let timeStep = 1000 / 60;
  let subSteps = 2;
  for (let i = 0; i < subSteps; i++) {
    Engine.update(engine, timeStep / subSteps);
  }

  drawZones();
  if (!stack) return;

  let bottomLine = height * (1 - 0.2);
  let center = createVector(width / 2, height / 2);

  let allBodies = Composite.allBodies(stack);
  for (let body of allBodies) {
    let pos = body.position;
    let col = "#ffffff";

    if (pos.y < bottomLine) {
      let vec = createVector(pos.x - center.x, pos.y - center.y);
      let heading = vec.heading();
      if (heading < 0) {
        heading += 360;
      }

      if (heading >= 210 && heading < 330) {
        col = "#105ca7";
      } else if (heading >= 90 && heading < 210) {
        col = "#812d3d";
      } else {
        col = "#ca863f";
      }
    }
    fill(col);
    stroke("#808694");
    push();

    let triangleStroke = width / 180; // 획두께 키우기
    strokeWeight(triangleStroke);
    strokeJoin(ROUND);
    beginShape();
    for (let v of body.vertices) {
      vertex(v.x, v.y);
    }
    endShape(CLOSE);
    pop();
  }

  let allConstraints = Composite.allConstraints(stack);
  stroke(100, 0); // 연결선
  strokeWeight(1);
  for (let c of allConstraints) {
    if (c.label !== "Mouse Constraint") {
      let bA = c.bodyA.position;
      let bB = c.bodyB.position;
      line(bA.x, bA.y, bB.x, bB.y);
    }
  }
}

function drawZones() {
  stroke(255, 0); //가이드라인
  strokeWeight(5);
  noFill();

  let bottom = 0.2; // 하단부 비영역 비율
  let bottomLine = height * (1 - bottom);
  line(0, bottomLine, width, bottomLine);

  let center = createVector(width / 2, height / 2);
  let radius = max(width, height) * 1.5;

  line(center.x, center.y, center.x, bottomLine);

  let v1 = p5.Vector.fromAngle(radians(210));
  v1.mult(radius);
  line(center.x, center.y, center.x + v1.x, center.y + v1.y);

  let v2 = p5.Vector.fromAngle(radians(330));
  v2.mult(radius);
  line(center.x, center.y, center.x + v2.x, center.y + v2.y);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createWalls();
  createStacks();
}
