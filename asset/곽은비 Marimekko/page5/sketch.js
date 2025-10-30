// ===== CONFIG =====
const LINE_COUNT = 4;
const STEP = 10;
const THICK = 60;
const BASE_AMPL = 34;
const NOISE_AMPL = 3;
const NOISE_SCALE = 0;
const TIME_SPEED = 0.85;
const BG_COLOR = [255, 255, 255]; // 흰 배경

// 파티클 관련 설정
const PARTICLE_INTERVAL = 40; // 생성 간격 (ms)
const MAX_PARTICLES = 400;
const BOUNCE = 0.75;
const SLIDE = 0.3;
const PUSH = 1.4;
const FRICTION = 0.985;

// 파티클 트레일(짧게 남기기)
const TRAIL_ENABLED = true;
const TRAIL_LEN = 6;
const TRAIL_FADE_MAX = 120; // 트레일 최대 알파
const TRAIL_SHRINK = 0.85;

// 🎨 색상 팔레트
const PALETTE = [
  [16, 26, 90], // 네이비
  [0, 0, 0], // 블랙
  [240, 221, 58], // 옐로
];

let lines = [];
let particles = [];
let t = 0;
let lastParticleTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(RGB, 255);
  noSmooth();
  strokeCap(ROUND);

  // 라인 초기화
  for (let i = 0; i < LINE_COUNT; i++) {
    const baseY = map(i, 0, LINE_COUNT - 1, height * 0.18, height * 0.82);
    const ampl = BASE_AMPL + i * 4;
    const freq = 0.01 + i * 0.002;
    const speed = TIME_SPEED * (0.6 + i * 0.25);
    lines.push(new WavyLine(baseY, ampl, freq, speed, THICK));
  }
}

function draw() {
  // 매 프레임 완전 리셋 (잔상 X)
  background(...BG_COLOR);
  blendMode(BLEND);
  t += deltaTime * 0.001;

  // ===== 라인 =====
  for (const wl of lines) {
    wl.update(t);
    wl.draw();
  }

  // ===== 파티클 생성 =====
  if (
    mouseX >= 0 &&
    mouseX <= width &&
    mouseY >= 0 &&
    mouseY <= height &&
    millis() - lastParticleTime > PARTICLE_INTERVAL
  ) {
    particles.push(new Particle(mouseX, mouseY));
    lastParticleTime = millis();
  }

  // ===== 파티클 업데이트/그리기 =====
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    for (const wl of lines) collideParticleWithLine(p, wl);
    p.draw();
    if (p.isDead() || particles.length > MAX_PARTICLES) particles.splice(i, 1);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  for (let i = 0; i < lines.length; i++) {
    lines[i].baseY = map(i, 0, LINE_COUNT - 1, height * 0.18, height * 0.82);
  }
}

// ===== 라인 클래스 =====
class WavyLine {
  constructor(baseY, ampl, freq, speed, thickness) {
    this.baseY = baseY;
    this.ampl = ampl;
    this.freq = freq;
    this.speed = speed;
    this.phase = random(1000);
    this.thickness = thickness;
  }

  update(time) {
    this.time = time * this.speed + this.phase;
  }

  yAt(x) {
    const sine = sin(x * this.freq + this.time * 2.1) * this.ampl;
    const n1 = noise(x * NOISE_SCALE, this.time * 0.6);
    const n2 = noise((x + 777) * NOISE_SCALE, this.time * 0.35);
    const wobble =
      (n1 - 0.5) * 2 * NOISE_AMPL + (n2 - 0.5) * 2 * (NOISE_AMPL * 0.6);
    return this.baseY + sine + wobble;
  }

  dyAt(x) {
    const eps = 1.0;
    return this.yAt(x + eps) - this.yAt(x - eps);
  }

  draw() {
    stroke(0);
    strokeWeight(this.thickness);
    noFill();
    beginShape();
    for (let x = -STEP; x <= width + STEP; x += STEP) {
      const y = this.yAt(x);
      curveVertex(x, y);
    }
    endShape();
  }
}

// ===== 파티클 클래스 =====
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.v = p5.Vector.random2D().mult(random(0.25, 0.9));
    this.r = random(20, 80);
    this.life = random(50, 80);
    const c = random(PALETTE);
    this.col = color(c[0], c[1], c[2]);
    this.trail = [];
  }

  update() {
    this.pos.add(this.v);
    this.v.mult(FRICTION);
    this.life -= 1;
    if (TRAIL_ENABLED) {
      this.trail.push(this.pos.copy());
      if (this.trail.length > TRAIL_LEN) this.trail.shift();
    }
  }

  draw() {
    noStroke();
    if (TRAIL_ENABLED && this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const p = this.trail[i];
        const fac = (i + 1) / this.trail.length;
        const a = fac * TRAIL_FADE_MAX;
        const rr = this.r * Math.pow(TRAIL_SHRINK, this.trail.length - 1 - i);
        fill(red(this.col), green(this.col), blue(this.col), a);
        circle(p.x, p.y, rr);
      }
    }

    // 본체: 더 진하고 선명하게
    const aMain = map(this.life, 0, 80, 0, 220); // 💡 최대 알파 높임
    fill(red(this.col), green(this.col), blue(this.col), aMain);
    circle(this.pos.x, this.pos.y, this.r);
  }

  isDead() {
    return this.life <= 0;
  }
}

// ===== 충돌 처리 =====
function collideParticleWithLine(p, wl) {
  const x = constrain(p.pos.x, 0, width);
  const yLine = wl.yAt(x);
  const dy = wl.dyAt(x);
  const normal = createVector(-dy, 2).normalize();
  const dist = p.pos.y - yLine;
  const threshold = wl.thickness * 0.5 + p.r * 0.5;

  if (abs(dist) < threshold) {
    const dir = dist >= 0 ? 1 : -1;
    const penetration = threshold - abs(dist);
    p.pos.add(normal.copy().mult(dir * PUSH * penetration));

    const vN = normal.copy().mult(p.v.dot(normal));
    const vT = p.v.copy().sub(vN);
    p.v = vT.add(vN.mult(-BOUNCE));

    const tangent = createVector(2, dy).normalize();
    p.v.add(tangent.mult(SLIDE));
  }
}
