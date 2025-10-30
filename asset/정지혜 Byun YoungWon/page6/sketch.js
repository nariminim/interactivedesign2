// page6: Inner Collision – 반발과 색의 리듬
// 느리게 움직이다 충돌 시 서로 반대 방향으로 튕기며 색이 바뀜
// 큰 원과 작은 원의 색은 겹치지 않음 (파스텔 팔레트 유지)

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

let mainCircle;
let innerCircles = [];
let lastCollisionTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  background(255);

  // 메인 원
  mainCircle = {
    x: width / 2,
    y: height / 2,
    r: min(width, height) * 0.25,
    c: color(random(PALETTE)),
  };

  // 내부 원 2개 (서로 반대 방향)
  innerCircles.push(makeInner(mainCircle, 0.35, 0.015)); // 큰 내부 원
  innerCircles.push(makeInner(mainCircle, 0.18, -0.02)); // 작은 내부 원
}

function makeInner(parent, relSize, speed) {
  let angle = random(TWO_PI);
  let orbitOffset = random(-PI / 6, PI / 6);
  return {
    angle,
    speed,
    orbitOffset,
    r: parent.r * relSize,
    c: color(random(PALETTE)),
  };
}

function draw() {
  // 부드러운 잔상
  fill(255, 25);
  rect(0, 0, width, height);

  // 메인 원
  fill(mainCircle.c);
  circle(mainCircle.x, mainCircle.y, mainCircle.r * 2);

  // 내부 원 업데이트
  for (let i = 0; i < innerCircles.length; i++) {
    const ic = innerCircles[i];
    ic.angle += ic.speed;

    // 자연스러운 진동을 섞은 궤도 반경
    const orbitR =
      mainCircle.r - ic.r - 10 + sin(frameCount * 0.01 + i * 2) * 10;
    const ix = mainCircle.x + cos(ic.angle + ic.orbitOffset) * orbitR;
    const iy = mainCircle.y + sin(ic.angle + ic.orbitOffset) * orbitR;

    fill(ic.c);
    circle(ix, iy, ic.r * 2);

    // 충돌 계산 (다른 원)
    const other = innerCircles[1 - i];
    const ox =
      mainCircle.x +
      cos(other.angle + other.orbitOffset) *
        (mainCircle.r -
          other.r -
          10 +
          sin(frameCount * 0.01 + (1 - i) * 2) * 10);
    const oy =
      mainCircle.y +
      sin(other.angle + other.orbitOffset) *
        (mainCircle.r -
          other.r -
          10 +
          sin(frameCount * 0.01 + (1 - i) * 2) * 10);

    const d = dist(ix, iy, ox, oy);

    // 충돌 시: 색 + 반발 (속도 반전)
    if (d < ic.r + other.r && millis() - lastCollisionTime > 800) {
      lastCollisionTime = millis();

      // 색 변화
      let newMain = color(random(PALETTE));
      let newBig = color(random(PALETTE));
      let newSmall = getDistinctColor(newMain); // 큰 원과 겹치지 않음

      mainCircle.c = newMain;
      innerCircles[0].c = newBig;
      innerCircles[1].c = newSmall;

      // 방향 반전 (튕김)
      innerCircles[0].speed *= -1;
      innerCircles[1].speed *= -1;
    }
  }
}

// 겹치지 않는 색 선택
function getDistinctColor(avoidColor) {
  let newColor;
  let maxAttempts = 20;
  do {
    newColor = color(random(PALETTE));
    maxAttempts--;
  } while (colorsAreSimilar(newColor, avoidColor) && maxAttempts > 0);
  return newColor;
}

function colorsAreSimilar(c1, c2) {
  let diff =
    abs(red(c1) - red(c2)) +
    abs(green(c1) - green(c2)) +
    abs(blue(c1) - blue(c2));
  return diff < 50;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  mainCircle.x = width / 2;
  mainCircle.y = height / 2;
  mainCircle.r = min(width, height) * 0.25;
}
