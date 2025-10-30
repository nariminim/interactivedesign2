const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const World = Matter.World;

let engine;
let world;
let activeLines = [];
let ghostLines = [];
let walls = [];

let canvas;
let isTouching = false;
let touchX = 0;
let touchY = 0;
let frameCounter = 0;

let lineGenerationCount = 0;
const MAX_GENERATIONS = 10;
const lineConfigs = [
  {
    color: [237, 28, 36],
    startX: 0.2,
    archHeight: 80,
    archWidth: 150,
    baseSpeed: 4, // 2 → 4로 증가
    noiseOffsetX: 1000,
  },
  {
    color: [255, 221, 0],
    startX: 0.4,
    archHeight: 100,
    archWidth: 200,
    baseSpeed: 5, // 3 → 5로 증가
    noiseOffsetX: 2000,
  },
  {
    color: [0, 158, 115],
    startX: 0.6,
    archHeight: 90,
    archWidth: 160,
    baseSpeed: 6, // 2 → 4로 증가
    noiseOffsetX: 3000,
  },
  {
    color: [0, 114, 188],
    startX: 0.8,
    archHeight: 200,
    archWidth: 200,
    baseSpeed: 7, // 5 → 7로 증가
    noiseOffsetX: 4000,
  },
];

class DesignedLine {
  constructor(c, config, controlBody) {
    this.color = c;
    this.strokeW = 35;
    this.initialConfig = config;
    this.controlBody = controlBody;
    this.isFinished = false;

    this.points = [];
    this.currentArchStartX = width * this.initialConfig.startX;
    this.currentArchStartY = height * 0.1;
    this.points.push(
      createVector(this.currentArchStartX, this.currentArchStartY)
    );

    this.currentArchProgress = 0;
    this.segmentsPerArch = 30;
    this.currentArchStep = 0;

    this.noiseOffsetX = this.initialConfig.noiseOffsetX;
    this.time = this.noiseOffsetX;
    this.baseTargetX = width * this.initialConfig.startX;
    this.targetX = this.baseTargetX;
    this.targetY = height * 0.1;

    this.currentDirection = random() > 0.5 ? 1 : -1;
    this.directionCount = 0;

    this.state = "ARCHING";
    this.chaosEndTime = 0;
  }

  applyDriftingForce() {
    if (this.state === "CHAOS") return;

    this.time += 0.001;
    let noiseValue = map(
      noise(this.baseTargetX * 0.002, sin(this.time) * 2),
      0,
      1,
      -1,
      1
    );

    let wanderAmount = width * 0.25;
    this.targetX = this.baseTargetX + noiseValue * wanderAmount;
    this.targetX = constrain(this.targetX, 80, width - 80);

    const bodyPos = this.controlBody.position;

    const force = {
      x: (this.targetX - bodyPos.x) * 0.001,
      y: (this.targetY - bodyPos.y) * 0.001,
    };
    Body.applyForce(this.controlBody, bodyPos, force);
  }

  applyRepulsion(x, y) {
    const touchPos = createVector(x, y);
    const bodyPos = createVector(
      this.controlBody.position.x,
      this.controlBody.position.y
    );
    const force = p5.Vector.sub(bodyPos, touchPos);
    const distance = force.mag();

    if (distance < 300) {
      const strength = 0.1;
      force.setMag(strength);
      Body.applyForce(this.controlBody, bodyPos, { x: force.x, y: force.y });
      this.state = "CHAOS";
      this.chaosEndTime = millis() + random(2000, 3000);
    }
  }

  update() {
    if (this.isFinished) return;

    if (this.state === "CHAOS" && millis() > this.chaosEndTime) {
      this.state = "ARCHING";
      this.currentArchStartX = this.controlBody.position.x;
      this.currentArchStartY = this.controlBody.position.y;
      this.currentArchProgress = 0;
      this.currentArchStep = 0;
      this.directionCount = 0;
    }

    if (this.state === "CHAOS") {
      // 떨림 정도 조절
      const tremble = {
        x: random(-0.03, 0.02),
        y: random(-0.02, 0.04),
      };
      Body.applyForce(this.controlBody, this.controlBody.position, tremble);

      this.points.push(
        createVector(this.controlBody.position.x, this.controlBody.position.y)
      );
      if (this.points.length > 200) {
        this.points.shift();
      }
    } else {
      const bodyPos = this.controlBody.position;
      let displacementX = bodyPos.x - this.targetX;
      let displacementY = bodyPos.y - this.targetY;

      let dynamicArchHeight =
        this.initialConfig.archHeight * (1 + displacementY / 200);
      dynamicArchHeight = constrain(dynamicArchHeight, 40, 300);

      let dynamicArchWidth =
        this.initialConfig.archWidth * (1 + displacementX / 500);
      dynamicArchWidth = constrain(dynamicArchWidth, 50, 500);

      let dynamicSpeed = this.initialConfig.baseSpeed;

      this.currentArchProgress = this.currentArchStep / this.segmentsPerArch;

      let nextX, nextY;
      if (this.currentArchProgress < 1) {
        nextX =
          this.currentArchStartX +
          dynamicArchWidth * this.currentArchProgress * this.currentDirection;
        nextY =
          this.currentArchStartY +
          dynamicSpeed * this.currentArchStep +
          sin(this.currentArchProgress * PI) * -dynamicArchHeight;
        nextY += displacementY * 0.5;
      } else {
        const lastPoint = this.points[this.points.length - 1];
        this.currentArchStartX = lastPoint.x;
        this.currentArchStartY = lastPoint.y;
        this.currentArchProgress = 0;
        this.currentArchStep = 0;

        this.directionCount++;

        if (this.directionCount >= 2) {
          this.currentDirection *= -1;
          this.directionCount = 0;
        } else {
          let newDirection = random() > 0.5 ? 1 : -1;
          if (newDirection !== this.currentDirection) {
            this.directionCount = 0;
          }
          this.currentDirection = newDirection;
        }

        this.currentArchStartX += displacementX * 0.3 * this.currentDirection;
        nextX = this.currentArchStartX;
        nextY = this.currentArchStartY;
      }

      this.points.push(createVector(nextX, nextY));
      this.currentArchStep++;
    }

    if (this.points[this.points.length - 1].y > height + 200) {
      this.isFinished = true;
      Composite.remove(engine.world, this.controlBody);
    }
  }

  draw() {
    noFill();
    let c = this.color;
    stroke(red(c), green(c), blue(c), 255);
    strokeWeight(this.strokeW);
    strokeCap(ROUND);

    beginShape();
    if (this.points.length > 1) {
      curveVertex(this.points[0].x, this.points[0].y);
      for (const p of this.points) curveVertex(p.x, p.y);
      curveVertex(
        this.points[this.points.length - 1].x,
        this.points[this.points.length - 1].y
      );
    }
    endShape();
  }

  drawAsGhost() {
    noFill();
    let c = this.color;
    stroke(red(c), green(c), blue(c), 10);
    strokeWeight(this.strokeW);
    strokeCap(ROUND);

    beginShape();
    if (this.points.length > 1) {
      curveVertex(this.points[0].x, this.points[0].y);
      for (const p of this.points) curveVertex(p.x, p.y);
      curveVertex(
        this.points[this.points.length - 1].x,
        this.points[this.points.length - 1].y
      );
    }
    endShape();
  }
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);

  let options = { passive: false, capture: true };
  canvas.elt.addEventListener("touchstart", handleTouchStart, options);
  canvas.elt.addEventListener("touchmove", handleTouchMove, options);
  canvas.elt.addEventListener("touchend", handleTouchEnd, options);
  canvas.elt.addEventListener("touchcancel", handleTouchEnd, options);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;

  for (const config of lineConfigs) {
    let controlBody = Bodies.circle(width * config.startX, height * 0.1, 40, {
      frictionAir: 0.05,
      restitution: 0.3,
    });
    Composite.add(world, controlBody);

    const p5Color = color(config.color[0], config.color[1], config.color[2]);
    activeLines.push(new DesignedLine(p5Color, config, controlBody));
  }

  createWalls();
}

function draw() {
  background(248, 247, 242);
  Engine.update(engine); // 원래대로

  frameCounter++;

  let shouldUpdate = frameCounter % 2 === 0;

  for (const line of ghostLines) line.drawAsGhost();

  for (let i = activeLines.length - 1; i >= 0; i--) {
    const line = activeLines[i];

    if (shouldUpdate) {
      line.applyDriftingForce();

      if (isTouching) {
        line.applyRepulsion(touchX, touchY);
      }

      line.update();
    }

    line.draw();

    if (line.isFinished) {
      const finished = activeLines.splice(i, 1)[0];
      ghostLines.push(finished);

      lineGenerationCount++;

      if (lineGenerationCount >= MAX_GENERATIONS * lineConfigs.length) {
        console.log("🔄 잔상 초기화!");
        ghostLines = [];
        lineGenerationCount = 0;
      }

      const cfg = finished.initialConfig;
      const newBody = Bodies.circle(width * cfg.startX, height * 0.1, 40, {
        frictionAir: 0.05,
        restitution: 0.3,
      });
      Composite.add(engine.world, newBody);
      const newColor = color(cfg.color[0], cfg.color[1], cfg.color[2]);
      activeLines.push(new DesignedLine(newColor, cfg, newBody));
    }
  }
}

function createWalls() {
  let wallOptions = { isStatic: true, restitution: 0.5 };
  let sideOffset = 50;
  let topOffset = 100;

  if (walls.length > 0) {
    Composite.remove(world, walls);
    walls = [];
  }

  walls.push(
    Bodies.rectangle(width / 2, -topOffset / 2, width, topOffset, wallOptions)
  );
  walls.push(
    Bodies.rectangle(
      width / 2,
      height + sideOffset / 2,
      width,
      sideOffset,
      wallOptions
    )
  );
  walls.push(
    Bodies.rectangle(
      -sideOffset / 2,
      height / 2,
      sideOffset,
      height,
      wallOptions
    )
  );
  walls.push(
    Bodies.rectangle(
      width + sideOffset / 2,
      height / 2,
      sideOffset,
      height,
      wallOptions
    )
  );

  Composite.add(world, walls);
}

function windowResized() {
  let options = { passive: false, capture: true };
  canvas.elt.removeEventListener("touchstart", handleTouchStart, options);
  canvas.elt.removeEventListener("touchmove", handleTouchMove, options);
  canvas.elt.removeEventListener("touchend", handleTouchEnd, options);
  canvas.elt.removeEventListener("touchcancel", handleTouchEnd, options);

  // 2. (이하 기존 코드)
  resizeCanvas(windowWidth, windowHeight);

  World.clear(world, false);
  Engine.clear(engine);

  activeLines = [];
  ghostLines = [];

  setup();
}

function handleTouchStart(event) {
  event.preventDefault();
  isTouching = true;
  touchX = event.touches[0].clientX;
  touchY = event.touches[0].clientY;
}

function handleTouchMove(event) {
  event.preventDefault();
  if (isTouching) {
    touchX = event.touches[0].clientX;
    touchY = event.touches[0].clientY;
  }
}

function handleTouchEnd(event) {
  isTouching = false;
}
