const Engine = Matter.Engine;

const Bodies = Matter.Bodies;

const Composite = Matter.Composite;

const Constraint = Matter.Constraint;

const Query = Matter.Query;

const Svg = Matter.Svg;

let engine, canvas;
let activeTouches = [];

let ropes = [];

const gears = [];

let ball;

let touchConstraints = new Map();

let audioStarted = false;

const notes = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0];

const NODE_COUNT = 20;

const NODE_RADIUS = 10;

const STIFFNESS = 0.8;

const DAMPING = 0.15;

const SPACING = 20;

const CATEGORY_GEAR = 0x0001;

const CATEGORY_ROPE = 0x0002;

const CATEGORY_BALL = 0x0004;

const CATEGORY_TOUCH = 0x0008;

let fixedCircles;

function preload() {}

function touchStarted() {
  if (!audioStarted) {
    userStartAudio();
    audioStarted = true;
    console.log("Audio started");
  }
}

function setup() {
  Matter.Common.setDecomp(decomp);

  canvas = createCanvas(700, 1000);
  userStartAudio().then(() => {
    console.log(" Audio context unlocked before event setup");
  });

  rectMode(CENTER);

  engine = Engine.create();

  engine.gravity.y = 1;

  engine.positionIterations = 10;

  engine.velocityIterations = 8;

  canvas.elt.addEventListener("touchstart", handleTouchStart, {
    passive: false,
  });

  canvas.elt.addEventListener("touchmove", handleTouchMove, { passive: false });

  canvas.elt.addEventListener("touchend", handleTouchEnd, { passive: false });

  canvas.elt.addEventListener("touchcancel", handleTouchEnd, {
    passive: false,
  });

  ropes.push(new Rope(0, width, height * 0.25, -0.15));

  ropes.push(new Rope(0, width, height * 0.43, -0.15));

  ropes.push(new Rope(0, width, height * 0.5, 0.3));

  ropes.push(new Rope(0, width, height * 1.1, -0.9));

  ball = Bodies.circle(width / 2, 80, 30, {
    restitution: 0.5,

    friction: 0.05,

    frictionAir: 0.01,

    density: 0.004,

    collisionFilter: {
      category: CATEGORY_BALL,

      mask: 0xffff,
    },

    label: "ball",
  });

  Composite.add(engine.world, ball);

  gears.push(new Gear("gear1", width * 0.3, height * 0.2, 0.5));

  gears.push(new Gear("gear2", width * 0.7, height * 0.35, 0.7));

  gears.push(new Gear("gear3", width * 0.23, height * 0.5, 0.45));

  gears.push(new Gear("gear4", width * 0.6, height * 0.75, 0.8));

  console.log("gears loaded:", gears);

  // 고정된 원들

  fixedCircles = [
    Bodies.circle(450, 150, 50, {
      isStatic: true,

      collisionFilter: { category: CATEGORY_GEAR, mask: CATEGORY_BALL },

      label: "fixedCircle",
    }),

    Bodies.circle(380, 80, 20, {
      isStatic: true,

      collisionFilter: { category: CATEGORY_GEAR, mask: CATEGORY_BALL },

      label: "fixedCircle",
    }),

    Bodies.circle(170, 400, 45, {
      isStatic: true,

      collisionFilter: { category: CATEGORY_GEAR, mask: CATEGORY_BALL },

      label: "fixedCircle",
    }),

    Bodies.circle(550, 600, 40, {
      isStatic: true,

      collisionFilter: { category: CATEGORY_GEAR, mask: CATEGORY_BALL },

      label: "fixedCircle",
    }),

    Bodies.circle(550, 600, 50, {
      isStatic: true,

      collisionFilter: { category: CATEGORY_GEAR, mask: CATEGORY_BALL },

      label: "fixedCircle",
    }),

    Bodies.circle(150, 900, 50, {
      isStatic: true,

      collisionFilter: { category: CATEGORY_GEAR, mask: CATEGORY_BALL },

      label: "fixedCircle",
    }),
  ];

  Composite.add(engine.world, fixedCircles);

  Matter.Events.on(engine, "collisionStart", handleCollision);

  createWall(40);
}

function getPhysicsPosition(touch) {
  let rect = canvas.elt.getBoundingClientRect();

  let canvasX = ((touch.clientX - rect.left) / rect.width) * width;

  let canvasY = ((touch.clientY - rect.top) / rect.height) * height;

  return {
    x: canvasX,

    y: canvasY,
  };
}

function handleTouchStart(e) {
  e.preventDefault();
  activeTouches = Array.from(e.touches);

  let allBodies = Composite.allBodies(engine.world);

  if (!audioStarted) {
    userStartAudio();

    audioStarted = true;
  }

  for (let i = 0; i < e.changedTouches.length; i++) {
    let touch = e.changedTouches[i];

    let pos = getPhysicsPosition(touch);

    if (touchConstraints.has(touch.identifier)) continue;

    let foundBodies = Query.point(allBodies, pos);

    let grabbedBody = null;

    for (let body of foundBodies) {
      if (body.isStatic) continue;

      if (body.collisionFilter.mask & CATEGORY_TOUCH) {
        grabbedBody = body;

        break;
      }
    }

    if (grabbedBody) {
      if (grabbedBody.label === "gear") {
        touchConstraints.set(touch.identifier, {
          type: "spin",

          body: grabbedBody,

          lastPos: pos,
        });
      } else {
        let constraint = Constraint.create({
          pointA: pos,

          bodyB: grabbedBody,

          pointB: { x: 0, y: 0 },

          length: 0,

          stiffness: 0.1,

          damping: 0.1,
        });

        Composite.add(engine.world, constraint);

        touchConstraints.set(touch.identifier, {
          type: "drag",

          constraint: constraint,
        });
      }
    }
  }
}

function mousePressed() {
  if (!audioStarted) {
    userStartAudio();
    audioStarted = true;
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  activeTouches = Array.from(e.touches);

  for (let i = 0; i < e.changedTouches.length; i++) {
    let touch = e.changedTouches[i];

    let touchInfo = touchConstraints.get(touch.identifier);

    if (touchInfo) {
      let pos = getPhysicsPosition(touch);

      if (touchInfo.type === "drag") {
        touchInfo.constraint.pointA = pos;
      } else if (touchInfo.type === "spin") {
        let body = touchInfo.body;

        let delta = Matter.Vector.sub(pos, touchInfo.lastPos);

        let force = Matter.Vector.mult(delta, 0.01);

        Matter.Body.applyForce(body, pos, force);

        touchInfo.lastPos = pos;
      }
    }
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  activeTouches = Array.from(e.touches);

  for (let i = 0; i < e.changedTouches.length; i++) {
    let touch = e.changedTouches[i];

    let touchInfo = touchConstraints.get(touch.identifier);

    if (touchInfo) {
      if (touchInfo.type === "drag") {
        Composite.remove(engine.world, touchInfo.constraint);
      }

      touchConstraints.delete(touch.identifier);
    }
  }
}

function draw() {
  background(255);

  Engine.update(engine);

  push();

  drawWall(20);

  stroke(0);

  strokeWeight(3);

  noFill();

  for (let rope of ropes) rope.display();

  for (let gear of gears) gear.display();

  fill(255, 90, 90);

  noStroke();

  circle(ball.position.x, ball.position.y, ball.circleRadius * 2);

  noFill();

  stroke(255, 90, 90);

  strokeWeight(6);

  for (let c of fixedCircles) {
    ellipse(c.position.x, c.position.y, c.circleRadius * 2);
  }

  pop();
}

function createWall(t) {
  Composite.add(engine.world, [
    Bodies.rectangle(t / 2, height / 2, t, height, {
      isStatic: true,

      collisionFilter: { mask: 0xffff },
    }),

    Bodies.rectangle(width - t / 2 + 10, height / 2, t, height, {
      isStatic: true,

      collisionFilter: { mask: 0xffff },
    }),

    Bodies.rectangle(width / 2, t / 2, width, t, {
      isStatic: true,

      collisionFilter: { mask: 0xffff },
    }),

    Bodies.rectangle(width / 2, height - t / 2 + 10, width, t, {
      isStatic: true,

      collisionFilter: { mask: 0xffff },
    }),
  ]);
}

function drawWall(t) {
  fill(240);

  noStroke();

  rect(t / 2, height / 2, t, height);

  rect(width - t / 2 + 10, height / 2, t, height);

  rect(width / 2, t / 2, width, t);

  rect(width / 2, height - t / 2 + 10, width, t);
}

function handleCollision(event) {
  if (!audioStarted) return;

  const pairs = event.pairs;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];

    if (pair.bodyA !== ball && pair.bodyB !== ball) continue;

    const x = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
    const y = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;

    const freq = map(y, 0, height, 880, 110); // 위쪽일수록 고음
    const pan = map(x, 0, width, -1, 1); // 왼쪽=-1, 오른쪽=1

    const tempOsc = new p5.Oscillator("sine");
    tempOsc.freq(freq);
    tempOsc.pan(pan);
    tempOsc.amp(0.5, 0);
    tempOsc.start();

    tempOsc.amp(0, 0.3, 0.05);
    setTimeout(() => tempOsc.stop(), 400);
  }
}

class Rope {
  constructor(x1, x2, y, slope = 0) {
    const ropeFilter = {
      category: CATEGORY_ROPE,

      mask: 0xffff,
    };

    this.anchorA = Bodies.circle(x1, y, 6, {
      label: "ropeNode",

      isStatic: true,

      collisionFilter: ropeFilter,
    });

    this.anchorB = Bodies.circle(x2, y + slope * (x2 - x1), 6, {
      label: "ropeNode",

      isStatic: true,

      collisionFilter: ropeFilter,
    });

    Composite.add(engine.world, [this.anchorA, this.anchorB]);

    this.nodes = [];

    this.links = [];

    const step = (x2 - x1) / (NODE_COUNT - 1);

    for (let i = 0; i < NODE_COUNT; i++) {
      const nx = x1 + i * step;

      const ny = y + slope * (nx - x1);

      const node = Bodies.circle(nx, ny, NODE_RADIUS, {
        label: "ropeNode",

        friction: 0.1,

        frictionAir: 0.02,

        restitution: 0.2,

        density: 0.002,

        collisionFilter: ropeFilter,
      });

      this.nodes.push(node);
    }

    Composite.add(engine.world, this.nodes);

    this.links.push(
      Constraint.create({
        bodyA: this.anchorA,

        bodyB: this.nodes[0],

        length: SPACING,

        stiffness: STIFFNESS,

        damping: DAMPING,

        render: { visible: false },
      })
    );

    for (let i = 0; i < this.nodes.length - 1; i++) {
      this.links.push(
        Constraint.create({
          bodyA: this.nodes[i],

          bodyB: this.nodes[i + 1],

          length: SPACING,

          stiffness: STIFFNESS,

          damping: DAMPING,

          render: { visible: false },
        })
      );
    }

    this.links.push(
      Constraint.create({
        bodyA: this.nodes[this.nodes.length - 1],

        bodyB: this.anchorB,

        length: SPACING,

        stiffness: STIFFNESS,

        damping: DAMPING,

        render: { visible: false },
      })
    );

    Composite.add(engine.world, this.links);
  }

  display() {
    push();

    noFill();

    stroke(0);

    strokeWeight(3);

    beginShape();

    curveVertex(this.anchorA.position.x, this.anchorA.position.y);

    for (let n of this.nodes) curveVertex(n.position.x, n.position.y);

    curveVertex(this.anchorB.position.x, this.anchorB.position.y);

    endShape();

    pop();
  }
}

class Gear {
  constructor(id, x, y, scaleFactor) {
    const pathElement = document.querySelector("#" + id);

    if (!pathElement) {
      console.error("⚠️ SVG with id '" + id + "' not found.");

      return;
    }

    let verts = Svg.pathToVertices(pathElement, 15);

    verts = Matter.Vertices.scale(verts, scaleFactor, scaleFactor);

    this.body = Bodies.fromVertices(x, y, verts, {
      label: "gear",

      isStatic: false,

      restitution: 0.2,

      friction: 0.4,

      frictionAir: 0.005,

      density: 0.003,

      collisionFilter: {
        category: CATEGORY_GEAR,

        mask: 0xffff,
      },
    });

    this.useFill = true;

    this.useStroke = true;

    this.pivot = Constraint.create({
      pointA: { x, y },

      bodyB: this.body,

      pointB: { x: 0, y: 0 },

      length: 0,

      stiffness: 1,

      render: { visible: false },
    });

    Composite.add(engine.world, [this.body, this.pivot]);
  }

  display() {
    if (!this.body) return;

    push();

    if (this.useFill) fill(0);
    else noFill();

    if (this.useStroke) stroke(0);
    else noStroke();

    strokeWeight(1);

    const parts =
      this.body.parts.length > 1 ? this.body.parts.slice(1) : [this.body];

    for (const part of parts) {
      beginShape();

      for (const v of part.vertices) vertex(v.x, v.y);

      endShape(CLOSE);
    }

    pop();
  }
}
