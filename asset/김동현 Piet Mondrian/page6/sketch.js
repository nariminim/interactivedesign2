let shards = [];
let debris = [];
let gridLines = [];

const palette = [
  '#000000',
  '#d40920',
  '#1347a5',
  '#f2d31b'
];

const LINE_WEIGHT_V = 16;
const LINE_WEIGHT_H = 16;

const GROUND_REST_TIME_MIN = 15;
const GROUND_REST_TIME_MAX = 60;

const MIN_CANVAS_W = 320;
const MIN_CANVAS_H = 240;

class Shard {
  constructor(x, y) {
    this.pos = createVector(x, y);
    const dirs = [
      createVector(1,0),
      createVector(-1,0),
      createVector(0,1),
      createVector(0,-1)
    ];
    this.dir = random(dirs);
    this.speed = random(4,8);
    this.timer = 0;
    this.turnInterval = floor(random(4,10));
    this.life = 0;
    this.maxLife = floor(random(20,40));
    this.size = random(2,4);
    this.dead = false;
  }

  update() {
    this.timer++;
    this.life++;

    if (this.timer % this.turnInterval === 0) {
      const horizontal = this.dir.y === 0;
      let choices;
      if (horizontal) {
        choices = [createVector(0,1), createVector(0,-1)];
      } else {
        choices = [createVector(1,0), createVector(-1,0)];
      }
      this.dir = random(choices);
      this.turnInterval = floor(random(4,10));
    }

    const step = p5.Vector.mult(this.dir, this.speed);
    this.pos.add(step);

    if (this.life > this.maxLife) {
      this.dead = true;
    }
    if (this.pos.x < -10 || this.pos.x > width+10) {
      this.dead = true;
    }
    if (this.pos.y < -10 || this.pos.y > height+10) {
      this.dead = true;
    }
  }

  draw() {
    noStroke();
    fill(0);
    rectMode(CENTER);
    rect(this.pos.x, this.pos.y, this.size, this.size);
  }

  toDebris() {
    const blockType = random() < 0.5 ? 'line' : 'block';
    let w, h, angleLimit, chosenColor;

    if (blockType === 'line') {
      const longSide = random(30, 60);
      const shortSide = random(4, 10);
      if (random() < 0.5) {
        w = longSide;
        h = shortSide;
      } else {
        w = shortSide;
        h = longSide;
      }
      chosenColor = color('#000000');
      angleLimit = true;
    } else {
      w = this.size + random(6, 18);
      h = this.size + random(6, 18);
      chosenColor = color(random(palette));
      angleLimit = false;
    }

    const restLineY = pickRandomHorizontalLineY();
    const d = new Debris(this.pos.x, this.pos.y, w, h, chosenColor, angleLimit, restLineY);
    return d;
  }
}

class Debris {
  constructor(x, y, w, h, col, lockAxis, restLineY) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.5,0.5), random(1,2));
    this.sizeW = w;
    this.sizeH = h;
    this.col = col;
    this.spin = random(-0.05,0.05);
    this.angle = lockAxis ? (random() < 0.5 ? 0 : HALF_PI) : random(TWO_PI);
    this.lockAxis = lockAxis;
    this.g = random(0.15,0.3);

    this.restLineY = restLineY;
    this.state = 'fall';
    this.groundTimer = 0;
    this.restLimit = floor(random(GROUND_REST_TIME_MIN, GROUND_REST_TIME_MAX));
  }

  update() {
    if (this.state === 'fall') {
      this.vel.y += this.g;
      this.pos.add(this.vel);
      if (!this.lockAxis) {
        this.angle += this.spin;
      }

      const bottomY = this.pos.y + this.sizeH * 0.5;
      if (bottomY >= this.restLineY && this.vel.y > 0) {
        this.pos.y = this.restLineY - this.sizeH * 0.5;
        this.vel.y = 0;
        this.vel.x *= 0.4;
        if (!this.lockAxis) {
          this.spin *= 0.2;
        }
        this.state = 'rest';
        this.groundTimer = 0;
      }

    } else if (this.state === 'rest') {
      this.groundTimer++;
      this.vel.x *= 0.9;
      this.pos.x += this.vel.x;
      if (this.groundTimer >= this.restLimit) {
        this.state = 'drop';
        this.vel.y = random(2,4);
      }

    } else if (this.state === 'drop') {
      this.vel.y += this.g;
      this.pos.add(this.vel);
      if (!this.lockAxis) {
        this.angle += this.spin;
      }
    }
  }

  offscreen() {
    if (this.pos.y - this.sizeH > height + 50) return true;
    if (this.pos.x + this.sizeW < -50) return true;
    if (this.pos.x - this.sizeW > width + 50) return true;
    return false;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    rectMode(CENTER);
    stroke(0);
    strokeWeight(4);
    fill(this.col);
    rect(0, 0, this.sizeW, this.sizeH, 2);
    pop();
  }
}

function setup() {
  const targetSize = getCanvasSize();
  createCanvas(targetSize.w, targetSize.h);
  background(255);
  initGridLines();
}

function draw() {
  background(255);

  drawGridLines();

  for (let i = shards.length - 1; i >= 0; i--) {
    shards[i].update();
    shards[i].draw();
    if (shards[i].dead) {
      debris.push(shards[i].toDebris());
      shards.splice(i,1);
    }
  }

  for (let j = debris.length - 1; j >= 0; j--) {
    debris[j].update();
    debris[j].draw();
    if (debris[j].offscreen()) {
      debris.splice(j,1);
    }
  }
}

function spawnBurst(x, y) {
  for (let i = 0; i < 40; i++) {
    shards.push(new Shard(x, y));
  }
}

function mousePressed() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    spawnBurst(mouseX, mouseY);
  }
}

function touchStarted() {
  if (touches && touches.length > 0) {
    const t = touches[0];
    if (t.x >= 0 && t.x <= width && t.y >= 0 && t.y <= height) {
      spawnBurst(t.x, t.y);
    }
  }
}

function windowResized() {
  const targetSize = getCanvasSize();
  resizeCanvas(targetSize.w, targetSize.h);
  initGridLines();
}

function getCanvasSize() {
  const w = max(window.innerWidth, MIN_CANVAS_W);
  const h = max(window.innerHeight, MIN_CANVAS_H);
  return { w, h };
}

function initGridLines() {
  gridLines = [];

  const v1 = width * 0.28;
  const v2 = width * 0.6;

  const h1 = height * 0.3;
  const h2 = height * 0.55;
  const h3 = height * 0.8;

  gridLines.push({type:'v', x:v1, w:LINE_WEIGHT_V});
  gridLines.push({type:'v', x:v2, w:LINE_WEIGHT_V});

  gridLines.push({type:'h', y:h1, w:LINE_WEIGHT_H});
  gridLines.push({type:'h', y:h2, w:LINE_WEIGHT_H});
  gridLines.push({type:'h', y:h3, w:LINE_WEIGHT_H});
}

function drawGridLines() {
  for (let gl of gridLines) {
    stroke(0);
    strokeCap(SQUARE);
    strokeWeight(gl.w);
    if (gl.type === 'v') {
      line(gl.x, 0, gl.x, height);
    } else {
      line(0, gl.y, width, gl.y);
    }
  }
}

function pickRandomHorizontalLineY() {
  const hs = gridLines.filter(l => l.type === 'h');
  if (hs.length === 0) return height;
  const choice = random(hs);
  return choice.y;
}
