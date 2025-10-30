const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Constraint = Matter.Constraint;
const Vector = Matter.Vector;
const Composite = Matter.Composite;

let engine;
let world;
let movingArcs = [];
let walls = [];
let centerX, centerY;
let canvas;

let colors = {
  red: "#e74c3c",
  black: "#1a1a1a",
  blue: "#0077b6",
  yellow: "#f4c430",
  white: "#f5f5f0",
  green: "#2ecc71",
};

let bigCircleRadius = 280;
let arcThickness = 40; // (2/3 크기 적용됨)
let redCircleThickness = 60;
let draggedArc = null;

class MovingArc {
  constructor(radius, color, index) {
    let cx = random(width * 0.3, width * 0.7);
    let cy = random(height * 0.3, height * 0.7);

    this.radius = radius;
    this.color = color;
    this.index = index;
    this.homePos = { x: cx, y: cy };

    this.baseRotationSpeed = random(0.005, 0.015) * (random() > 0.5 ? 1 : -1);

    this.body = Bodies.circle(cx, cy, this.radius, {
      frictionAir: 0.05,
      restitution: 0.4,
      friction: 0.3,
      density: 0.01,
    });

    this.constraint = Constraint.create({
      pointA: this.homePos,
      bodyB: this.body,
      stiffness: 0.05,
      damping: 0.1,
    });
    this.originalStiffness = 0.05; // ✨ [추가] 원래 stiffness 값 저장

    Composite.add(world, [this.body, this.constraint]);

    this.isDragged = false;
    this.isEjected = false;
  }

  update() {
    if (!this.isDragged && !this.isEjected && this.constraint) {
      Body.setAngularVelocity(
        this.body,
        this.body.angularVelocity * 0.98 + this.baseRotationSpeed * 0.02
      );
    }

    if (this.isEjected && !this.isDragged) {
      let dx = this.homePos.x - this.body.position.x;
      let dy = this.homePos.y - this.body.position.y;
      let distance = sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        this.reattach();
      }
    }
  }

  draw() {
    push();
    let pos = this.body.position;
    let angle = this.body.angle;
    translate(pos.x, pos.y);
    rotate(angle);
    noFill();
    stroke(this.color);
    strokeWeight(arcThickness);
    strokeCap(PROJECT);
    let startAngle = -HALF_PI;
    let endAngle = HALF_PI;
    arc(0, 0, this.radius * 2, this.radius * 2, startAngle, endAngle);
    pop();
  }

  contains(mx, my) {
    let pos = this.body.position;
    let distance = dist(mx, my, pos.x, pos.y);
    return distance < this.radius + arcThickness / 2;
  }

  applySpin(torque) {
    let newAV = this.body.angularVelocity + torque;
    Body.setAngularVelocity(this.body, newAV);
  }

  eject() {
    if (this.constraint) {
      console.log("Arc ejected!");
      Composite.remove(world, this.constraint);
      this.constraint = null;
      this.isEjected = true;
    }
  }

  reattach() {
    if (!this.constraint) {
      console.log("Arc reattached!");
      this.constraint = Constraint.create({
        pointA: this.homePos,
        bodyB: this.body,
        stiffness: this.originalStiffness, // 저장된 값 사용
        damping: 0.1,
      });
      Composite.add(world, this.constraint);
      this.isEjected = false;
      Body.setVelocity(this.body, { x: 0, y: 0 }); // 복귀 시 속도 리셋
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
  world.gravity.y = 0;

  centerX = width / 2;
  centerY = height / 2;

  createWalls();

  movingArcs.push(new MovingArc(bigCircleRadius * 0.3, colors.black, 0));
  movingArcs.push(new MovingArc(bigCircleRadius * 0.4, colors.yellow, 1));
  movingArcs.push(new MovingArc(bigCircleRadius * 0.5, colors.blue, 2));
  movingArcs.push(new MovingArc(bigCircleRadius * 0.35, "#2ecc71", 3)); // 초록색 (hex: #2ecc71)
  movingArcs.push(new MovingArc(bigCircleRadius * 0.45, colors.white, 4));
}

function draw() {
  background(colors.white);
  Engine.update(engine);

  push();
  noFill();
  stroke(colors.red);
  strokeWeight(redCircleThickness);
  ellipse(centerX, centerY, bigCircleRadius * 2);
  pop();

  for (let arc of movingArcs) {
    arc.update();
    arc.draw();
  }
}

function mousePressed() {
  draggedArc = null;
  for (let arc of movingArcs) {
    if (arc.contains(mouseX, mouseY)) {
      draggedArc = arc;
      arc.isDragged = true;
      console.log("Arc grabbed!");

      Body.setVelocity(draggedArc.body, { x: 0, y: 0 });
      Body.setAngularVelocity(draggedArc.body, 0);

      if (draggedArc.constraint) {
        draggedArc.constraint.stiffness = 0;
      }
      break;
    }
  }
  return false;
}

function mouseDragged() {
  if (draggedArc) {
    let dx = mouseX - pmouseX;
    let dy = mouseY - pmouseY;
    let vx = mouseX - draggedArc.body.position.x;
    let vy = mouseY - draggedArc.body.position.y;
    let torque = (vx * dy - vy * dx) * 0.0005;
    draggedArc.applySpin(torque);

    let force = {
      x: (mouseX - draggedArc.body.position.x) * 0.1,
      y: (mouseY - draggedArc.body.position.y) * 0.1,
    };
    Body.applyForce(draggedArc.body, draggedArc.body.position, force);
    Body.setVelocity(
      draggedArc.body,
      Vector.mult(draggedArc.body.velocity, 0.9)
    );
  }
  return false;
}

function mouseReleased() {
  if (draggedArc) {
    console.log("Arc released!");
    draggedArc.isDragged = false;

    let velMag = Vector.magnitude(draggedArc.body.velocity);
    let angVel = abs(draggedArc.body.angularVelocity);

    if (velMag > 5 || angVel > 0.5) {
      draggedArc.eject();
    } else {
      if (draggedArc.constraint) {
        draggedArc.constraint.stiffness = draggedArc.originalStiffness;
      }
    }
    draggedArc = null;
  }
  return false;
}

function touchStarted() {
  return mousePressed();
}

function touchMoved() {
  return mouseDragged();
}

function touchEnded() {
  return mouseReleased();
}

function windowResized() {
  let options = { passive: false, capture: true };
  if (canvas) {
    canvas.elt.removeEventListener("touchstart", preventTouchDefault, options);
    canvas.elt.removeEventListener("touchmove", preventTouchDefault, options);
  }

  resizeCanvas(windowWidth, windowHeight);

  World.clear(world);
  Engine.clear(engine);
  movingArcs = [];
  walls = [];
  draggedArc = null;

  setup();
}

function preventTouchDefault(event) {
  event.preventDefault();
}

function createWalls() {
  let wallOptions = {
    isStatic: true,
    restitution: 0.4, // 탄성
    friction: 0.5,
  };
  let thickness = 100; // 벽 두께

  walls.push(
    Bodies.rectangle(width / 2, -thickness / 2, width, thickness, wallOptions)
  );
  walls.push(
    Bodies.rectangle(
      width / 2,
      height + thickness / 2,
      width,
      thickness,
      wallOptions
    )
  );
  walls.push(
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height, wallOptions)
  );
  walls.push(
    Bodies.rectangle(
      width + thickness / 2,
      height / 2,
      thickness,
      height,
      wallOptions
    )
  );

  Composite.add(world, walls);
}
