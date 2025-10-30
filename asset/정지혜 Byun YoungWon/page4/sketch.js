// page4: Floating Orbits – 질서, 균형, 리듬의 순환 (Center color change ver.)
// 중심의 그라데이션 원이 커졌다 작아졌다 하며, 터치할 때마다 색이 변함
// 완전 밝은 배경 (다른 페이지들과 동일)

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

let orbits = [];
let reverse = 1;
let centerColor;
let nextColor;
let lerpAmt = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  angleMode(RADIANS);
  background(255);

  centerColor = color(random(PALETTE));
  nextColor = color(random(PALETTE));

  const layers = 9;
  const baseR = min(width, height) * 0.07;

  for (let i = 0; i < layers; i++) {
    const count = 12 + i * 6;
    const r = baseR * (i + 1.2) * random(0.9, 1.1);
    for (let j = 0; j < count; j++) {
      const a = (j / count) * TAU + random(-0.2, 0.2);
      const speed = random(0.001, 0.005) * (i % 2 === 0 ? 1 : -1);
      const size = random(8, 28);
      const c = color(random(PALETTE));
      orbits.push({ r, a, speed, size, c, offset: random(TAU) });
    }
  }
}

function draw() {
  background(255);
  translate(width / 2, height / 2);

  // 중심의 부드러운 그라데이션 원
  const glowSize = baseGlow();
  lerpAmt = constrain(lerpAmt + 0.02, 0, 1);
  const blended = lerpColor(centerColor, nextColor, lerpAmt);

  for (let i = 3; i >= 0; i--) {
    const alpha = map(i, 0, 3, 40, 10);
    fill(red(blended), green(blended), blue(blended), alpha);
    circle(0, 0, glowSize * (1 + i * 0.25));
  }

  // 회전하는 원들
  const t = millis() * 0.001;
  for (let o of orbits) {
    o.a += o.speed * reverse;
    const wobble = sin(t * 1.3 + o.offset) * 6;
    const x = cos(o.a) * (o.r + wobble);
    const y = sin(o.a) * (o.r + wobble);

    fill(red(o.c), green(o.c), blue(o.c), 230);
    circle(x, y, o.size);
  }
}

function baseGlow() {
  // 부드러운 호흡처럼 커졌다 작아졌다
  return sin(frameCount * 0.03) * 40 + 200;
}

function touchStarted() {
  reverse *= -1;

  // 색상 전환
  centerColor = lerpColor(centerColor, nextColor, 1);
  nextColor = color(random(PALETTE));
  lerpAmt = 0;

  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
