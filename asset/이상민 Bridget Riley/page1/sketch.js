// ===== 파라미터 =====
const BASE_SIZE = 40; // 기본 셀 크기(px)
const COLS = 25; // 가로 셀 개수
const ROWS = 37; // 세로 셀 개수

const INFLUENCE_RADIUS = BASE_SIZE * 35; // 포인터 영향 반경
const SMOOTH_ITERATIONS = 2;
const SMOOTH_WEIGHT = 0.5;

const MIN_SCALE = 0.01; // 최대 수축
const MAX_SCALE = 1.0; // 기본 크기

function setup() {
  createCanvas(COLS * BASE_SIZE, ROWS * BASE_SIZE);
  noStroke();

  // iOS 확대 제스처 억제
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
}

// 1D 스무딩
function smoothWidths(widths, iterations, weight) {
  let smoothed = [...widths];
  for (let iter = 0; iter < iterations; iter++) {
    let temp = [...smoothed];
    for (let i = 1; i < widths.length - 1; i++) {
      const avg = (temp[i - 1] + temp[i + 1]) / 2;
      smoothed[i] = lerp(temp[i], avg, weight);
    }
  }
  return smoothed;
}

// 포인터 x (터치 우선)
function getPointerX() {
  if (touches && touches.length > 0) return touches[0].x;
  return mouseX;
}

function draw() {
  background(255);

  // 1) 각 column이 얼마나 눌릴지 계산
  let desiredWidths = [];
  const pointerX = getPointerX();

  for (let cx = 0; cx < COLS; cx++) {
    const colCenterX = cx * BASE_SIZE + BASE_SIZE / 2;
    const dist = abs(pointerX - colCenterX);

    if (dist < INFLUENCE_RADIUS) {
      const t = dist / INFLUENCE_RADIUS;
      const smoothT = t * t * (3 - 2 * t); // smoothstep
      const scale = lerp(MIN_SCALE, MAX_SCALE, smoothT);
      desiredWidths[cx] = BASE_SIZE * scale;
    } else {
      desiredWidths[cx] = BASE_SIZE * MAX_SCALE;
    }
  }

  // 2) 스무딩
  desiredWidths = smoothWidths(desiredWidths, SMOOTH_ITERATIONS, SMOOTH_WEIGHT);

  // 3) 전체 리스케일해서 캔버스 width에 딱 맞추기
  let totalDesired = 0;
  for (let cx = 0; cx < COLS; cx++) totalDesired += desiredWidths[cx];
  const normFactor = width / totalDesired;

  // 4) 렌더
  let runningX = 0;
  for (let cx = 0; cx < COLS; cx++) {
    const w = desiredWidths[cx] * normFactor;
    const x0 = runningX;

    for (let cy = 0; cy < ROWS; cy++) {
      const y0 = cy * BASE_SIZE;

      if ((cx + cy) % 2 === 0) {
        fill(0);
      } else {
        fill(255);
      }

      rect(x0, y0, w, BASE_SIZE);
    }

    runningX += w;
  }
}

// 모바일 스크롤 방지
function touchStarted() {
  return false;
}
function touchMoved() {
  return false;
}
function touchEnded() {
  return false;
}
