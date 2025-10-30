const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composites = Matter.Composites;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

const defaultCategory = 0x0001,
  category1 = 0x0002;
// category2 = 0x0004,
// category3 = 0x0008,
// category4 = 0x0012;

const REGEN_THRESHOLD = 10816;

let paletteGroups = [
  ["#2b3c3f", "#244932", "#407127", "#005462"],

  ["#13315c", "#29427a", "#3f5fa3", "#647fc0"],
  ["#1a4356", "#498e9e", "#6ac7e2", "#a0e0f2"],

  ["#468d77", "#3e4540", "#28322c", "#5aa28a"],
  ["#4a7a30", "#5caa4c", "#8bc97c", "#c4e0ad"],
  ["#7c8b5b", "#a5b88c", "#ccd3a4", "#e7e9ce"],

  ["#342d27", "#4a2f1a", "#652f31", "#7f5342"],
  ["#6c625d", "#333011", "#50483c", "#8e867a"],
  ["#77581c", "#a06221", "#c9913a", "#eac35b"],

  ["#a7b08f", "#d3e2b9", "#dee5ca", "#f4f8e3"],
  ["#ebd9a0", "#f3e8ba", "#ddde72", "#faf4c8"],
  ["#b0b0ad", "#cbcbc7", "#e5e2e0", "#f7f6f3"],

  ["#7f769c", "#aaa2bf", "#cfc9da", "#ebe8f3"],
  ["#1c1c1f", "#2e2e30", "#4d4d4f", "#7a7a7b"],

  ["#5b3c88", "#7a5fa8", "#a192c8", "#cbb8e3"],
  ["#a64d79", "#c47392", "#e3a6b9", "#f3c9d8"],
  ["#c1662a", "#d78a4a", "#f2b66e", "#f9d9a3"],
  ["#1b6d83", "#2897a3", "#58c7c4", "#8be6de"],
  ["#395c87", "#597aa7", "#87a1c4", "#b7cae2"],
];
let currentPalette;

let engine;
let stack1;
let canvas;
let mouse, mouseConstraint;

let rectSize = 520; // 520
let rectSize2 = rectSize * 0.8;
let rectSize3 = rectSize * 0.6;
let rectSize4 = rectSize * 0.4;
let addY2 = rectSize / 26;
let addY3 = (rectSize * 6) / 65;
let addY4 = (rectSize * 3) / 20;

let pixSize = 5;

let backCol = "#fafafa";

let ground1;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  currentPalette = paletteGroups[0];

  rectSize = Math.min(windowWidth * 0.7, windowHeight * 0.7); // 520
  rectSize2 = rectSize * 0.8;
  rectSize3 = rectSize * 0.6;
  rectSize4 = rectSize * 0.4;
  addY2 = rectSize / 26;
  addY3 = (rectSize * 6) / 65;
  addY4 = (rectSize * 3) / 20;

  rectMode(CENTER);
  engine = Engine.create();
  engine.world.gravity.y = 0;
  engine.world.gravity.x = 0;

  // ground1
  ground1 = Bodies.rectangle(
    width / 2,
    height / 2 + rectSize / 2 + 10,
    rectSize + 40,
    20,
    {
      isStatic: true,
      collisionFilter: {
        category: category1,
        mask: category1,
      },
    }
  );

  // add ground
  Composite.add(engine.world, ground1);

  // stack1
  stack1 = Composites.stack(
    width / 2 - rectSize / 2,
    height / 2 - rectSize / 2,
    rectSize / pixSize,
    rectSize / pixSize,
    0,
    0,
    function (x, y) {
      return Bodies.rectangle(x, y, pixSize, pixSize, {
        collisionFilter: {
          category: category1,
          mask: defaultCategory | category1,
        },
      });
    }
  );

  // add stack1
  Composite.add(engine.world, stack1);

  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.5,
      angularStiffness: 0.5,
    },
    collisionFilter: {
      category: defaultCategory,
      mask: category1,
    },
  });
  Composite.add(engine.world, mouseConstraint);
}

function mousePressed() {
  Composite.remove(engine.world, ground1);
  currentPalette = random(paletteGroups);

  // glitch = new Glitch(mouseX, mouseY);
  // for (let i = 0; i < 30; i++) {
  //   glitches.push(
  //     new Glitch(mouseX + random(-30, 30), mouseY + random(-30, 30))
  //   );
  // }
}
function touchStarted() {
  currentPalette = random(paletteGroups);
}

function getRandomGlitchColor() {
  let r, g, b;

  const choice = floor(random(6));

  switch (choice) {
    case 0: // Pure Red
      r = 255;
      g = random(50);
      b = random(50);
      break;
    case 1: // Pure Green
      r = random(50);
      g = 255;
      b = random(50);
      break;
    case 2: // Pure Blue
      r = random(50);
      g = random(50);
      b = 255;
      break;
    case 3: // Cyan (G + B)
      r = random(50);
      g = 255;
      b = 255;
      break;
    case 4: // Magenta (R + B)
      r = 255;
      g = random(50);
      b = 255;
      break;
    case 5: // Yellow (R + G)
      r = 255;
      g = 255;
      b = random(50);
      break;
    default:
      r = 255;
      g = 255;
      b = 255;
  }

  return color(r, g, b);
}

function draw() {
  Engine.update(engine);
  background(backCol);

  noStroke();

  push();
  translate(width / 2, height / 2);
  fill("#000000");
  rect(0, 0, rectSize, rectSize);
  pop();

  const gravityZoneMinX = width / 2 - rectSize / 2;
  const gravityZoneMaxX = width / 2 + rectSize / 2;
  const gravityZoneMinY = height / 2 - rectSize / 2;
  const gravityZoneMaxY = height / 2 + rectSize / 2;

  for (let body of stack1.bodies) {
    const pos = body.position;

    if (pos.x < gravityZoneMinX) {
      Body.applyForce(body, pos, { x: -0.0001, y: 0 });
    } else if (pos.x > gravityZoneMaxX) {
      Body.applyForce(body, pos, { x: 0.0001, y: 0 });
    } else if (pos.y < gravityZoneMinY) {
      Body.applyForce(body, pos, { x: 0, y: -0.0001 });
    } else if (pos.y > gravityZoneMaxY) {
      Body.applyForce(body, pos, { x: 0, y: 0.0001 });
    }
  }

  const [col1, col2, col3, col4] = currentPalette;

  for (let i = 0; i < stack1.bodies.length; i++) {
    let body = stack1.bodies[i];
    if (
      body.position.x > width / 2 - rectSize4 / 2 &&
      body.position.x < width / 2 + rectSize4 / 2 &&
      body.position.y > height / 2 - rectSize4 / 2 + addY4 &&
      body.position.y < height / 2 + rectSize4 / 2 + addY4
    ) {
      fill(col1);
    } else if (
      body.position.x > width / 2 - rectSize3 / 2 &&
      body.position.x < width / 2 + rectSize3 / 2 &&
      body.position.y > height / 2 - rectSize3 / 2 + addY3 &&
      body.position.y < height / 2 + rectSize3 / 2 + addY3
    ) {
      fill(col2);
    } else if (
      body.position.x > width / 2 - rectSize2 / 2 &&
      body.position.x < width / 2 + rectSize2 / 2 &&
      body.position.y > height / 2 - rectSize2 / 2 + addY2 &&
      body.position.y < height / 2 + rectSize2 / 2 + addY2
    ) {
      fill(col3);
    } else if (
      body.position.x > width / 2 - rectSize / 2 &&
      body.position.x < width / 2 + rectSize / 2 &&
      body.position.y > height / 2 - rectSize / 2 &&
      body.position.y < height / 2 + rectSize / 2
    ) {
      fill(col4);
    } else {
      let c = getRandomGlitchColor();
      fill(c);
      if (
        body.position.x < width / 2 - rectSize / 2 - pixSize * 5 ||
        body.position.x > width / 2 + rectSize / 2 + pixSize * 5 ||
        body.position.y < height / 2 - rectSize / 2 - pixSize * 5 ||
        body.position.y > height / 2 + rectSize / 2 + pixSize * 5
      ) {
        Composite.remove(stack1, body);
        Composite.remove(engine.world, body);
      }
    }
    rect(body.position.x, body.position.y, pixSize, pixSize);
  }

  const bodiesToAddCount = REGEN_THRESHOLD - stack1.bodies.length;
  if (bodiesToAddCount > 0) {
    const rectMinX = width / 2 - rectSize / 2;
    const rectMaxX = width / 2 + rectSize / 2;
    const rectMinY = height / 2 - rectSize / 2;
    const rectMaxY = height / 2 + rectSize / 2;
    const maxAttempts = 10;
    for (let i = 0; i < Math.min(bodiesToAddCount, maxAttempts); i++) {
      const stepsX = rectSize / pixSize;
      const stepsY = rectSize / pixSize;

      const randGridX = floor(random(stepsX));
      const randGridY = floor(random(stepsY));

      const newX = rectMinX + randGridX * pixSize + pixSize / 2;
      const newY = rectMinY + randGridY * pixSize + pixSize / 2;

      const bodiesAtPoint = Matter.Query.point(stack1.bodies, {
        x: newX,
        y: newY,
      });

      let isOccupied = bodiesAtPoint.length > 0;

      if (!isOccupied) {
        const newBody = Bodies.rectangle(newX, newY, pixSize, pixSize, {
          collisionFilter: {
            category: category1,
            mask: defaultCategory | category1,
          },
        });
        Composite.add(engine.world, newBody);
        stack1.bodies.push(newBody);
      }
    }
  }
  print(stack1.bodies.length);
}
