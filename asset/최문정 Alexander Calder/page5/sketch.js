const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Constraint = Matter.Constraint;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Body = Matter.Body;
const Query = Matter.Query;
const Events = Matter.Events;
const Svg = Matter.Svg;

let engine, canvas, mouse, mouseConstraint;
let Circles = [];
let ball;
let pendulums = [];
const collisionCategory = {
  DEFAULT: 0x0001,
  LINE2: 0x0002,
  MESH: 0x0004,
  PENDULUM_BOB: 0x0008,
  FIXED_CIRCLE: 0x0010,
};
const collisionMask = {
  LINE2: 0xffffffff & ~collisionCategory.MESH,
  MESH: 0xffffffff & ~collisionCategory.LINE2 & ~collisionCategory.PENDULUM_BOB,
};
let allChains = [];
let staticObstacles = [];
let col = 1;
let particleWidth = 3;
let particleHeight = 3;
const STIFFNESS_RIGID = 0.1;
const STIFFNESS_LOOSE = 0.0001;

let collisionOsc, releaseOsc;

function setup() {
  collisionOsc = new p5.Oscillator("square");
  collisionOsc.start();
  collisionOsc.amp(0);
  releaseOsc = new p5.Oscillator("sine");
  releaseOsc.start();
  releaseOsc.amp(0);

  Matter.Common.setDecomp(decomp);
  canvas = createCanvas(700, 1000);
  rectMode(CENTER);
  engine = Engine.create();
  engine.gravity.y = 1;
  Circles = [
    {
      body: Bodies.circle(200, 300, 58, { isStatic: true }),
      style: { fill: color(0), stroke: null },
    },
    {
      body: Bodies.circle(218, 300, 38, { isStatic: true }),
      style: { fill: color(200, 200, 255), stroke: null },
    },
    {
      body: Bodies.circle(370, 330, 63, { isStatic: true }),
      style: { fill: null, stroke: color(0), sw: 2 },
    },
    {
      body: Bodies.circle(470, 500, 100, { isStatic: true }),
      style: { fill: null, stroke: color(0), sw: 2 },
    },
    {
      body: Bodies.circle(330, 760, 140, { isStatic: true }),
      style: { fill: null, stroke: color(0), sw: 2 },
    },
    {
      body: Bodies.circle(500, 250, 35, { isStatic: true }),
      style: { fill: null, stroke: color(0), sw: 2 },
    },
  ];
  Circles.forEach((c) => {
    c.body.collisionFilter = c.body.collisionFilter || {};
    c.body.collisionFilter.category = collisionCategory.FIXED_CIRCLE;
  });
  Composite.add(
    engine.world,
    Circles.map((c) => c.body)
  );
  let line1 = Bodies.rectangle(362, 290, 216, 3, {
    isStatic: true,
    angle: 160,
    label: "line",
  });
  staticObstacles.push(line1);
  let line2 = Bodies.rectangle(360, 850, 450, 3, {
    isStatic: true,
    angle: PI / 30,
    label: "line",
    collisionFilter: {
      category: collisionCategory.LINE2,
      mask: collisionMask.LINE2,
    },
  });
  staticObstacles.push(line2);
  let line3 = Bodies.rectangle(134, 820, 150, 3, {
    isStatic: true,
    angle: 99,
    label: "line",
  });
  staticObstacles.push(line3);
  let tri1_vertices = [
    { x: -110, y: 40 },
    { x: 110, y: -40 },
    { x: -110, y: -40 },
  ];
  let triangle1 = Bodies.fromVertices(260, 130, tri1_vertices, {
    isStatic: true,
    angle: -PI,
    label: "triangle",
  });
  staticObstacles.push(triangle1);
  let tri2_vertices = [
    { x: -75, y: 45 },
    { x: 75, y: -45 },
    { x: -75, y: -45 },
  ];
  let triangle2 = Bodies.fromVertices(560, 870, tri2_vertices, {
    isStatic: true,
    angle: -PI / 3,
    label: "triangle",
  });
  staticObstacles.push(triangle2);
  Composite.add(engine.world, staticObstacles);
  ball = Bodies.circle(300, 100, 20, { restitution: 0.8, friction: 0.01 });
  Composite.add(engine.world, ball);
  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2 },
  });
  Composite.add(engine.world, mouseConstraint);
  let p1 = createPendulum(230, 350, 250, 10, null);
  let p2 = createPendulum(350, 150, 250, 20, null);
  pendulums = [p1, p2];
  Composite.add(engine.world, pendulums);
  let chain1 = createChain(300, 150, col, 400, 0, 0, 0);
  allChains.push(chain1);
  let chain2 = createChain(400, 150, col, 400, 0, 0, PI / 20);
  allChains.push(chain2);
  let chain3 = createChain(400, 150, col, 400, 0, 0, PI / 70);
  allChains.push(chain3);
  Events.on(engine, "collisionStart", handleCollision);
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
  createWall(40);

  userStartAudio();
}

function createChain(x, y, cols, rows, spacingX, spacingY, angleRad) {
  let stack = Composites.stack(
    x,
    y,
    cols,
    rows,
    spacingX,
    spacingY,
    function (x, y) {
      return Bodies.rectangle(x, y, particleWidth, particleHeight, {
        friction: 0.1,
        restitution: 0.5,
        collisionFilter: {
          category: collisionCategory.MESH,
          mask: collisionMask.MESH,
        },
      });
    }
  );
  Composites.chain(stack, 0, 0.5, 0, -0.5, { stiffness: 0.5, damping: 0.1 });
  Composite.rotate(stack, angleRad, { x: x, y: y });
  let anchorConstraints = [];
  for (let body of stack.bodies) {
    const anchor = { x: body.position.x, y: body.position.y };
    const constraint = Constraint.create({
      pointA: anchor,
      bodyB: body,
      stiffness: STIFFNESS_RIGID,
      damping: 0.05,
    });
    anchorConstraints.push(constraint);
  }
  Composite.add(engine.world, [stack, ...anchorConstraints]);
  return { stack: stack, anchorConstraints: anchorConstraints, isLoose: false };
}

function draw() {
  background(255);
  Engine.update(engine);
  for (let c of Circles) {
    const b = c.body;
    const x = b.position.x;
    const y = b.position.y;
    const r = b.circleRadius;
    if (c.style.fill) fill(c.style.fill);
    else noFill();
    if (c.style.stroke) {
      stroke(c.style.stroke);
      strokeWeight(c.style.sw || 1);
    } else noStroke();
    ellipse(x, y, r * 2);
    if (x === 330 && y === 760) {
      push();
      translate(x, y);
      rotate(b.angle);
      fill(100);
      noStroke();
      strokeWeight(2);
      arc(0, 0, r * 2, r * 2, PI, 0, CHORD);
      pop();
    }
  }
  fill(100, 180, 255);
  noStroke();
  ellipse(ball.position.x, ball.position.y, ball.circleRadius * 2);
  fill(0);
  noStroke();
  for (let body of staticObstacles) {
    beginShape();
    for (let vert of body.vertices) vertex(vert.x, vert.y);
    endShape(CLOSE);
  }
  fill(0);
  noStroke();
  for (let chainData of allChains) {
    for (let b of chainData.stack.bodies) {
      push();
      translate(b.position.x, b.position.y);
      rotate(b.angle);
      rect(0, 0, particleWidth, particleHeight);
      pop();
    }
  }
  drawPendulums();
}

function releaseChain(chainData) {
  if (chainData.isLoose) return;
  chainData.isLoose = true;
  for (let c of chainData.anchorConstraints) c.stiffness = STIFFNESS_LOOSE;
  releaseOsc.freq(180);
  releaseOsc.amp(0.5);
  setTimeout(() => releaseOsc.amp(0), 80);
}

function restoreChain(chainData) {
  if (!chainData.isLoose) return;
  chainData.isLoose = false;
  for (let c of chainData.anchorConstraints) c.stiffness = STIFFNESS_RIGID;
}

function handleCollision(event) {
  const pairs = event.pairs;
  for (let pair of pairs) {
    const { bodyA, bodyB } = pair;
    if (
      bodyA === ball ||
      bodyB === ball ||
      (bodyA.label === "circle" && bodyB.label === "line") ||
      (bodyB.label === "circle" && bodyA.label === "line")
    ) {
      let impactY = ball.position.y / height;
      let freq = map(impactY, 0, 1, 800, 200);
      collisionOsc.freq(freq);
      collisionOsc.amp(0.1);
      setTimeout(() => collisionOsc.amp(0), 60);
    }
  }
}

let pointers = new Map();

function pointerDown(event) {
  pointers.set(event.pointerId, {
    x: event.offsetX,
    y: event.offsetY,
    pressure: event.pressure ?? 0.5,
  });
  const touchPos = { x: event.offsetX, y: event.offsetY };
  for (let chainData of allChains) {
    const found = Query.point(chainData.stack.bodies, touchPos);
    if (found.length > 0) {
      releaseChain(chainData);
      break;
    }
  }
}

function pointerMove(event) {
  if (pointers.has(event.pointerId)) {
    pointers.set(event.pointerId, {
      x: event.offsetX,
      y: event.offsetY,
      pressure: event.pressure ?? 0.5,
    });
  }
}

function pointerUp(event) {
  pointers.delete(event.pointerId);
  for (let chainData of allChains) {
    if (chainData.isLoose) restoreChain(chainData);
  }
}

function createWall(t) {
  Composite.add(engine.world, [
    Bodies.rectangle(-t / 2, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width + t / 2, height / 2, t, height, { isStatic: true }),
    Bodies.rectangle(width / 2, -t / 2, width, t, { isStatic: true }),
    Bodies.rectangle(width / 2, height + t / 2, width, t, { isStatic: true }),
  ]);
}

function createPendulum(x, y, length, radius, svgPath) {
  let bob;
  const bobMask =
    0xffffffff &
    ~collisionCategory.MESH &
    ~collisionCategory.LINE2 &
    ~collisionCategory.PENDULUM_BOB &
    ~collisionCategory.FIXED_CIRCLE;
  const options = {
    frictionAir: 0.001,
    restitution: 0.8,
    density: 0.1,
    collisionFilter: {
      category: collisionCategory.PENDULUM_BOB,
      mask: bobMask,
    },
  };
  if (svgPath) {
    try {
      let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", svgPath);
      let vertices = Matter.Svg.pathToVertices(path, 15);
      bob = Bodies.fromVertices(x, y + length, vertices, options);
      bob.label = "svg";
    } catch (e) {
      bob = Bodies.circle(x, y + length, 15, options);
      bob.label = "circle";
    }
  } else {
    bob = Bodies.circle(x, y + length, radius, options);
    bob.label = "circle";
  }
  let constraint = Constraint.create({
    pointA: { x: x, y: y },
    bodyB: bob,
    stiffness: 0.8,
    length: length,
  });
  Body.setPosition(bob, { x: x + 80, y: y + length - 20 });
  return Composite.create({ bodies: [bob], constraints: [constraint] });
}

function drawPendulums() {
  for (let pendulum of pendulums) {
    const constraint = pendulum.constraints[0];
    const anchor = constraint.pointA;
    const bob = pendulum.bodies[0];
    push();
    stroke(50);
    strokeWeight(2);
    line(anchor.x, anchor.y, bob.position.x, bob.position.y);
    pop();
    push();
    translate(bob.position.x, bob.position.y);
    rotate(bob.angle);
    fill(0);
    noStroke();
    if (bob.label === "circle") ellipse(0, 0, bob.circleRadius * 2);
    else if (bob.label === "svg") {
      beginShape();
      for (let vert of bob.vertices)
        vertex(vert.x - bob.position.x, vert.y - bob.position.y);
      endShape(CLOSE);
    }
    pop();
  }
}
