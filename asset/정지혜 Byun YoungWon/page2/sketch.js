// page2: Static Bubble Explosion – Ultra Dense ver.
// 화면이 빈틈 없이 작은 공들로 꽉 채워져 있고, 클릭 시 주변 공들이 펑! 터짐

let bubbles = [];
const PALETTE = [
  "#F5F1E8",
  "#DDEBE5",
  "#E7F1F4",
  "#F3E8ED",
  "#CFE7E2",
  "#DCE8FF",
  "#9BC7E7",
  "#7AB9A3",
  "#E9D4E8",
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  background(247);

  // 🔹 훨씬 빽빽한 밀도로 공 생성 (여백 거의 없음)
  const targetCount = (width * height) / 300; // 밀도 강화 (기존 1000 → 300)
  for (let i = 0; i < targetCount; i++) {
    const r = random(14, 36);
    const x = random(width);
    const y = random(height);
    const c = color(random(PALETTE));
    bubbles.push(new Bubble(x, y, r, c));
  }

  // 🔸 중첩 자연스러움을 위해 공 약간씩 서로 겹치게
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    b.x += random(-10, 10);
    b.y += random(-10, 10);
  }
}

function draw() {
  background(247, 30);

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.update();
    b.display();

    // 완전히 사라진 버블 제거
    if (b.alpha <= 0) bubbles.splice(i, 1);
  }
}

// 💥 클릭 / 터치 시 폭발
function mousePressed() {
  explode(mouseX, mouseY);
}
function touchStarted() {
  explode(mouseX, mouseY);
  return false;
}

function explode(x, y) {
  const radius = 180;
  for (const b of bubbles) {
    const d = dist(x, y, b.x, b.y);
    if (d < radius) {
      const force = map(d, 0, radius, 3.0, 0.5);
      b.explode(force);
    }
  }
}

// 🫧 버블 클래스
class Bubble {
  constructor(x, y, r, c) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.alpha = 255;
    this.c = c;
    this.exploding = false;
    this.vel = createVector(0, 0);
    this.intensity = 0;
  }

  explode(intensity) {
    if (this.exploding) return;
    this.exploding = true;
    this.intensity = intensity;

    // 폭발 방향: 클릭 중심 기준 랜덤
    const angle = random(TAU);
    const speed = random(4, 8) * intensity;
    this.vel = p5.Vector.fromAngle(angle).mult(speed);
  }

  update() {
    if (this.exploding) {
      this.x += this.vel.x;
      this.y += this.vel.y;
      this.vel.mult(0.88);
      this.r += this.intensity * 2.5;
      this.alpha -= 10 * this.intensity;
    }
  }

  display() {
    fill(red(this.c), green(this.c), blue(this.c), this.alpha);
    circle(this.x, this.y, this.r * 2);
  }
}
