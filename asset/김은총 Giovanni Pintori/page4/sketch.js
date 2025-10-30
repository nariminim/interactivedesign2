const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Constraint = Matter.Constraint;
const Vector = Matter.Vector;
const Composite = Matter.Composite;

let engine;
let world;
let keys = [];
let canvas;

let colors = {
  white: "#f5f5f0",
  blue: "#0077b6",
  red: "#e74c3c",
  green: "#2a9d8f",
  yellow: "#f4c430",
  black: "#1a1a1a",
};

let ringOuterSize = 140;
let ringInnerSize = 85;
let ringThickness = 20;
let lineWidth = 28;
let verticalLineLength = 110;
let horizontalLineLength = 700;

let bobSpeed = 0.0025;
let bobAmount = 12;

let draggedKey = null;
let isDragging = false;

let shakeDecay = 0.94;

class TypewriterKey {
  constructor(x, y, index, keyColor) {
    this.homeX = x;
    this.homeY = y;
    this.index = index;
    this.timeOffset = index * 0.4;

    this.keyColor = keyColor;
    this.horizontalY = y + verticalLineLength;

    this.body = Bodies.circle(x, y, ringOuterSize / 2, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.15,
      frictionAir: 0.05,
    });

    this.constraint = Constraint.create({
      pointA: { x: x, y: this.horizontalY },
      bodyB: this.body,
      length: verticalLineLength,
      stiffness: 0.003,
      damping: 0.02,
    });

    Composite.add(world, [this.body, this.constraint]);

    this.isDragged = false;
    this.shakeVelocityX = 0;
    this.shakeVelocityY = 0;
  }

  update() {
    if (!this.isDragged) {
      let bobOffset = sin(millis() * bobSpeed + this.timeOffset) * bobAmount;
      let targetY = this.homeY + bobOffset;

      let force = (targetY - this.body.position.y) * 0.1;
      Body.applyForce(this.body, this.body.position, { x: 0, y: force });

      let forceX = (this.homeX - this.body.position.x) * 0.1;
      Body.applyForce(this.body, this.body.position, { x: forceX, y: 0 });
    }

    if (abs(this.shakeVelocityX) > 0.05 || abs(this.shakeVelocityY) > 0.05) {
      Body.applyForce(this.body, this.body.position, {
        x: this.shakeVelocityX,
        y: this.shakeVelocityY,
      });

      this.shakeVelocityX *= shakeDecay;
      this.shakeVelocityY *= shakeDecay;
    }
  }

  draw() {
    push();

    let ringX = this.body.position.x;
    let ringY = this.body.position.y;

    noStroke();
    fill(this.keyColor);

    let yOffset = -(ringY - this.homeY) * 0.3;
    let horizontalStartX = this.homeX;
    let horizontalStartY = this.horizontalY + yOffset;
    let horizontalEndX = width;
    let horizontalEndY = this.horizontalY;

    // 수평선
    push();
    beginShape();
    vertex(horizontalStartX, horizontalStartY - lineWidth / 2);
    vertex(horizontalEndX, horizontalEndY - lineWidth / 2);
    vertex(horizontalEndX, horizontalEndY + lineWidth / 2);
    vertex(horizontalStartX, horizontalStartY + lineWidth / 2);
    endShape(CLOSE);
    pop();

    // 수직선
    let verticalStartX = ringX;
    let verticalStartY = ringY + ringOuterSize / 2;
    let verticalEndX = this.homeX;
    let verticalEndY = horizontalStartY;
    let currentVerticalLength = dist(
      verticalStartX,
      verticalStartY,
      verticalEndX,
      verticalEndY
    );
    let angle = atan2(
      verticalEndY - verticalStartY,
      verticalEndX - verticalStartX
    );

    noStroke();
    fill(this.keyColor);
    push();
    translate(
      (verticalStartX + verticalEndX) / 2,
      (verticalStartY + verticalEndY) / 2
    );
    rotate(angle + HALF_PI);
    rectMode(CENTER);
    rect(0, 0, lineWidth, currentVerticalLength);
    pop();

    fill(this.keyColor);
    noStroke();
    ellipse(this.homeX, horizontalStartY, lineWidth, lineWidth);

    noFill();
    stroke(this.keyColor);
    strokeWeight(ringThickness);
    ellipse(ringX, ringY, ringOuterSize);

    pop();
  }

  applyShockwave(sourceX, sourceY, intensity) {
    let distance = dist(
      this.body.position.x,
      this.body.position.y,
      sourceX,
      sourceY
    );

    if (distance < 700 && distance > 10) {
      let influence = map(distance, 0, 700, intensity, 0);
      influence = constrain(influence, 0, intensity);

      let angle = atan2(
        this.body.position.y - sourceY,
        this.body.position.x - sourceX
      );

      this.shakeVelocityX += cos(angle) * influence * 0.1;
      this.shakeVelocityY += sin(angle) * influence * 0.1;
    }
  }
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);

  let options = { passive: false, capture: true };
  canvas.elt.addEventListener("touchstart", preventTouchDefault, options);
  canvas.elt.addEventListener("touchmove", preventTouchDefault, options);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0.12;

  let centerX = width / 2;
  let centerY = height / 2;

  let keyConfigs = [
    { x: centerX - 200, y: centerY - 110, color: colors.blue },
    { x: centerX - 30, y: centerY - 130, color: colors.red },
    { x: centerX + 180, y: centerY - 95, color: colors.black },
    { x: centerX - 280, y: centerY + 70, color: colors.green },
    { x: centerX - 110, y: centerY + 95, color: colors.black },
    { x: centerX + 50, y: centerY + 80, color: colors.yellow },
    { x: centerX + 200, y: centerY + 100, color: colors.black },
    { x: centerX + 350, y: centerY + 75, color: colors.red },
  ];

  for (let i = 0; i < keyConfigs.length; i++) {
    let config = keyConfigs[i];
    let key = new TypewriterKey(config.x, config.y, i, config.color);
    keys.push(key);
  }
}

function draw() {
  background(colors.white);
  Engine.update(engine);

  if (isDragging && draggedKey) {
    Body.setPosition(draggedKey.body, { x: mouseX, y: mouseY });
    Body.setVelocity(draggedKey.body, { x: 0, y: 0 });
  }

  for (let key of keys) {
    key.update();
    key.draw();
  }
}

function touchStarted() {
  handlePress(mouseX, mouseY);
  return false;
}

function mousePressed() {
  handlePress(mouseX, mouseY);
  return false;
}

function handlePress(x, y) {
  for (let key of keys) {
    let d = dist(x, y, key.body.position.x, key.body.position.y);

    if (d < ringOuterSize / 2) {
      draggedKey = key;
      isDragging = true;
      key.isDragged = true;
      console.log("Key grabbed!");
      break;
    }
  }
}

function touchMoved() {
  return false;
}

function mouseDragged() {
  return false;
}

function touchEnded() {
  handleRelease();
  return false;
}

function mouseReleased() {
  handleRelease();
  return false;
}

function handleRelease() {
  if (draggedKey) {
    console.log("Key released!");

    let distFromHome = dist(
      draggedKey.body.position.x,
      draggedKey.body.position.y,
      draggedKey.homeX,
      draggedKey.homeY
    );

    let intensity = map(distFromHome, 0, 700, 0, 15);
    intensity = constrain(intensity, 0, 15);

    let angleToHome = atan2(
      draggedKey.homeY - draggedKey.body.position.y,
      draggedKey.homeX - draggedKey.body.position.x
    );

    Body.setVelocity(draggedKey.body, {
      x: cos(angleToHome) * intensity * 3.5,
      y: sin(angleToHome) * intensity * 3.5,
    });

    draggedKey.shakeVelocityX = random(-1.5, 1.5) * intensity * 0.07;
    draggedKey.shakeVelocityY = random(-1.5, 1.5) * intensity * 0.07;

    for (let key of keys) {
      if (key !== draggedKey) {
        key.applyShockwave(
          draggedKey.body.position.x,
          draggedKey.body.position.y,
          intensity * 0.8
        );
      }
    }

    draggedKey.isDragged = false;
    draggedKey = null;
    isDragging = false;
  }
}

function windowResized() {
  let options = { passive: false, capture: true };
  if (canvas) {
    canvas.elt.removeEventListener("touchstart", preventTouchDefault, options);
    canvas.elt.removeEventListener("touchmove", preventTouchDefault, options);
  }

  resizeCanvas(windowWidth, windowHeight);

  World.clear(world);
  engine.events = {};
  keys = [];

  let centerX = width / 2;
  let centerY = height / 2;

  let keyConfigs = [
    { x: centerX - 200, y: centerY - 110, color: colors.blue },
    { x: centerX - 30, y: centerY - 130, color: colors.red },
    { x: centerX + 180, y: centerY - 95, color: colors.black },
    { x: centerX - 280, y: centerY + 70, color: colors.green },
    { x: centerX - 110, y: centerY + 95, color: colors.black },
    { x: centerX + 50, y: centerY + 80, color: colors.yellow },
    { x: centerX + 200, y: centerY + 100, color: colors.black },
    { x: centerX + 350, y: centerY + 75, color: colors.red },
  ];

  for (let i = 0; i < keyConfigs.length; i++) {
    let config = keyConfigs[i];
    let key = new TypewriterKey(config.x, config.y, i, config.color);
    keys.push(key);
  }
}

function preventTouchDefault(event) {
  event.preventDefault();
}
