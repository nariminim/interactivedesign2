const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Events = Matter.Events;

let engine;
let world;
let stack;
let canvas;
let mouse, mouseConstraint;

const lineComposite = Composite.create();
const pixels = [];
const gravityObjects1 = new Set(); // 상
const gravityObjects2 = new Set(); // 하
const gravityObjects3 = new Set(); // 좌
const gravityObjects4 = new Set(); //
let g = 0.0002;

var defaultCategory = 0x0001,
  category1 = 0x0002,
  category2 = 0x0004,
  category3 = 0x0008,
  category4 = 0x0010,
  category5 = 0x0020,
  category6 = 0x0040,
  category7 = 0x0080,
  category8 = 0x0100;

///////////////////////////////////////////// Matter

let lines = [];
let isRemoving = false;
let moveX = 10;
let moveY = 10;
let totalRotation = 0;

let timer = 0;
const interval = 30;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  engine = Engine.create();
  world = engine.world;
  engine.gravity.y = 0;
  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.5, angularStiffness: 0.5 },
    collisionFilter: {
      category:
        defaultCategory |
        category1 |
        category2 |
        category3 |
        category4 |
        category5 |
        category6 |
        category7 |
        category8,
      mask: defaultCategory,
    },
  });
  Composite.add(engine.world, mouseConstraint);

  g = random(0.0002, 0.0005);
  Events.on(engine, "beforeUpdate", () => {
    // 아래로 당김
    gravityObjects1.forEach((b) => {
      Body.applyForce(b, b.position, { x: 0, y: b.mass * g });
    });

    // 위로 당김
    gravityObjects2.forEach((b) => {
      Body.applyForce(b, b.position, { x: 0, y: -b.mass * g });
    });

    // 오른쪽으로 당김
    gravityObjects3.forEach((b) => {
      Body.applyForce(b, b.position, { x: b.mass * g, y: 0 });
    });

    // 왼쪽으로 당김
    gravityObjects4.forEach((b) => {
      Body.applyForce(b, b.position, { x: -b.mass * g, y: 0 });
    });
  });
}

const MAX_PIXELS = 20;
const MIN_PIXELS = 10;

function draw() {
  background("#eeece680");
  Engine.update(engine, deltaTime);

  push();
  translate(width / 2, height / 2);
  scale(0.8);
  scale(zoomScale);
  translate(-width / 2, -height / 2);
  updateRotation();

  if (frameCount - timer > interval) {
    autoProcess();
    timer = frameCount;
  }

  for (let i = pixels.length - 1; i >= 0; i--) {
    const p = pixels[i];
    p.display();

    const { x, y } = p.body.position;

    // 위 → 아래
    if (p.gravityGroup === "down") {
      if (y > height + 200) {
        p.destroy();
        pixels.splice(i, 1);
        continue;
      } else if (y > height + 50) {
        Body.setPosition(p.body, { x: random(0, width), y: random(-100, -10) });
        Body.setVelocity(p.body, { x: 0, y: 0 });
        p.body.force.x = 0;
        p.body.force.y = 0;
      }
    }

    // 아래 → 위
    else if (p.gravityGroup === "up") {
      if (y < -200) {
        p.destroy();
        pixels.splice(i, 1);
        continue;
      } else if (y < -50) {
        Body.setPosition(p.body, {
          x: random(0, width),
          y: random(height + 10, height + 100),
        });
        Body.setVelocity(p.body, { x: 0, y: 0 });
        p.body.force.x = 0;
        p.body.force.y = 0;
      }
    }

    // 좌 → 우
    else if (p.gravityGroup === "right") {
      if (x > width + 200) {
        p.destroy();
        pixels.splice(i, 1);
        continue;
      } else if (x > width + 50) {
        Body.setPosition(p.body, {
          x: random(-100, -10),
          y: random(0, height),
        });
        Body.setVelocity(p.body, { x: 0, y: 0 });
        p.body.force.x = 0;
        p.body.force.y = 0;
      }
    }

    // 우 → 좌
    else if (p.gravityGroup === "left") {
      if (x < -200) {
        p.destroy();
        pixels.splice(i, 1);
        continue;
      } else if (x < -50) {
        Body.setPosition(p.body, {
          x: random(width + 10, width + 100),
          y: random(0, height),
        });
        Body.setVelocity(p.body, { x: 0, y: 0 });
        p.body.force.x = 0;
        p.body.force.y = 0;
      }
    }
  }

  if (pixels.length < MIN_PIXELS) {
    const countToAdd = MAX_PIXELS - pixels.length;
    for (let i = 0; i < countToAdd; i++) {
      pixels.push(new Pixel({ useGravity: true }));
    }
  }

  for (let i = 0; i < lines.length; i++) {
    lines[i].display();
  }

  // pop();
}

let prevDist = null;
let zoomScale = 1; // 확대/축소 스케일

function touchMoved() {
  if (touches.length === 2) {
    const dx = touches[0].x - touches[1].x;
    const dy = touches[0].y - touches[1].y;
    const dist = sqrt(dx * dx + dy * dy);

    const angle = atan2(dy, dx);
    if (typeof prevAngle !== "undefined") {
      const deltaAngle = angle - prevAngle;
      totalRotation += deltaAngle * 0.5;

      const pivot = { x: width / 2, y: height / 2 };
      Matter.Composite.rotate(lineComposite, deltaAngle * 0.5, pivot);
    }
    prevAngle = angle;

    if (prevDist !== null) {
      const delta = dist - prevDist;
      zoomScale += delta * 0.001;
      zoomScale = constrain(zoomScale, 0.8, 2);
    }
    prevDist = dist;

    return false;
  }
}

function touchEnded() {
  prevDist = null;
  prevAngle = undefined;
  let add = 22;

  updateRotation();

  if (isRemoving) {
    if (lines.length > 0) {
      lines[0].removeBodies();
      lines.shift();
    }

    if (lines.length === 0) {
      isRemoving = false;
    }
    return;
  }

  let i = lines.length;

  let newLine = new CustomLine(
    width / 2 + 70,
    height / 2 + 100,
    i * add,
    0 + i * 10,
    0 + i * 10,
    -i * moveX,
    +i * moveY
  );
  lines.push(newLine);

  if (lines.length >= 6) {
    isRemoving = true;
  }
}

function mouseWheel(event) {
  zoomScale -= event.delta * 0.001;
  zoomScale = constrain(zoomScale, 0.3, 2);
}

function mousePressed() {
  let add = 22;

  updateRotation();

  if (isRemoving) {
    if (lines.length > 0) {
      lines[0].removeBodies();
      lines.shift();
    }

    if (lines.length === 0) {
      isRemoving = false;
    }
    return;
  }

  let i = lines.length;

  let newLine = new CustomLine(
    width / 2 + 70,
    height / 2 + 100,
    i * add,
    0 + i * 10,
    0 + i * 10,
    -i * moveX,
    +i * moveY
  );
  lines.push(newLine);

  if (lines.length >= 6) {
    isRemoving = true;
  }
}

function updateRotation() {
  const centerX = width / 2;
  const centerY = height / 2;
  const rotationAmount = 0.0;

  totalRotation += rotationAmount;
  Matter.Composite.rotate(lineComposite, rotationAmount, {
    x: centerX,
    y: centerY,
  });
}

function autoProcess() {
  let add = 22;

  if (isRemoving) {
    if (lines.length > 0) {
      lines[0].removeBodies();
      lines.shift();
    }

    if (lines.length === 0) {
      isRemoving = false;
    }
    return;
  }

  let i = lines.length;

  const startX = width / 2 - 10;
  const startY = height / 2;

  let newLine = new CustomLine(
    width / 2 + 70,
    height / 2 + 100,
    i * add,
    0 + i * 10,
    0 + i * 10,
    -i * moveX,
    +i * moveY
  );
  lines.push(newLine);

  if (lines.length >= 6) {
    isRemoving = true;
  }
}
