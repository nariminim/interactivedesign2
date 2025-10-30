// ===== 파라미터 =====
const BASE_SIZE = 40; // 기본 셀 크기(px)
const COLS = 25; // 가로 셀 개수
const ROWS = 37; // 세로 셀 개수

// 밴드(투명+얇아짐) 두께
const ALPHA_RADIUS = BASE_SIZE * 10;

// 스무딩
const SMOOTH_ITERATIONS = 2;
const SMOOTH_WEIGHT = 0.5;

// 세로 스케일 한계
const MIN_SCALE = 0.01; // 가장 얇을 때
const MAX_SCALE = 1.0; // 기본 두께

// 알파 스케일 한계
const MIN_ALPHA_SCALE = 0.0; // 완전 투명
const MAX_ALPHA_SCALE = 1.0; // 완전 불투명

function setup() {
  createCanvas(COLS * BASE_SIZE, ROWS * BASE_SIZE);
  noStroke();

  // iOS 더블탭 확대 방지
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
}

// 1D 스무딩
function smoothArray(values, iterations, weight) {
  let smoothed = [...values];
  for (let iter = 0; iter < iterations; iter++) {
    let temp = [...smoothed];
    for (let i = 1; i < values.length - 1; i++) {
      const avg = (temp[i - 1] + temp[i + 1]) / 2;
      smoothed[i] = lerp(temp[i], avg, weight);
    }
  }
  return smoothed;
}

// 터치 우선 좌표
function getPointerY() {
  if (touches && touches.length > 0) return touches[0].y;
  return mouseY;
}
function getPointerX() {
  if (touches && touches.length > 0) return touches[0].x;
  return mouseX;
}

// y 위치별 밴드 중심 x 계산
// 위쪽은 화면 위→터치까지, 아래쪽은 터치→화면 아래까지
function getBandCenterX(yPos, px, py) {
  const DIAGONAL_SPREAD = BASE_SIZE * 10;
  const edgeX = max(0, px - DIAGONAL_SPREAD);

  if (yPos <= py) {
    const denomTop = max(py, 1);
    const t = yPos / denomTop;
    return lerp(edgeX, px, t);
  } else {
    const denomBot = max(height - py, 1);
    const t = (yPos - py) / denomBot;
    return lerp(px, edgeX, t);
  }
}

function draw() {
  background(255);

  const pointerY = getPointerY();
  const pointerX = getPointerX();

  // ===== 1) 각 row의 세로 스케일 계산 =====
  // 기준: 밴드 중심선과 pointerX의 차이
  let rowScale = [];
  for (let ry = 0; ry < ROWS; ry++) {
    const rowCenterY = ry * BASE_SIZE + BASE_SIZE / 2;
    const bandX = getBandCenterX(rowCenterY, pointerX, pointerY);

    const dist = abs(bandX - pointerX);

    let s;
    if (dist < ALPHA_RADIUS) {
      const t = dist / ALPHA_RADIUS;
      const smoothT = t * t * (3 - 2 * t); // smoothstep
      s = lerp(MIN_SCALE, MAX_SCALE, smoothT);
    } else {
      s = MAX_SCALE;
    }
    rowScale[ry] = s;
  }

  // 세로 스무딩
  rowScale = smoothArray(rowScale, SMOOTH_ITERATIONS, SMOOTH_WEIGHT);

  // 각 row의 실제 높이(세로 지름) 준비
  let desiredHeights = [];
  let totalDesired = 0;
  for (let ry = 0; ry < ROWS; ry++) {
    const h = BASE_SIZE * rowScale[ry];
    desiredHeights[ry] = h;
    totalDesired += h;
  }

  // 전체 합이 canvas 높이와 맞도록 정규화
  const normFactorY = height / totalDesired;

  let finalHeights = [];
  for (let ry = 0; ry < ROWS; ry++) {
    finalHeights[ry] = desiredHeights[ry] * normFactorY;
  }

  // 누적 y (각 row의 시작점)
  let rowTopY = [];
  let accY = 0;
  for (let ry = 0; ry < ROWS; ry++) {
    rowTopY[ry] = accY;
    accY += finalHeights[ry];
  }

  // ===== 2) 렌더링 =====
  // - 가로 지름: BASE_SIZE 유지
  // - 세로 지름: finalHeights[ry]
  // - 알파: 위와 같은 밴드 기준
  for (let ry = 0; ry < ROWS; ry++) {
    const centerY_forRow = rowTopY[ry] + finalHeights[ry] / 2;
    const bandX = getBandCenterX(centerY_forRow, pointerX, pointerY);

    for (let cx = 0; cx < COLS; cx++) {
      const centerX = cx * BASE_SIZE + BASE_SIZE / 2;
      const centerY = centerY_forRow;

      const distX = abs(centerX - bandX);

      let alphaScale;
      if (distX < ALPHA_RADIUS) {
        const t = distX / ALPHA_RADIUS;
        const smoothT = t * t * (3 - 2 * t);
        alphaScale = lerp(MIN_ALPHA_SCALE, MAX_ALPHA_SCALE, smoothT);
      } else {
        alphaScale = MAX_ALPHA_SCALE;
      }

      const alphaVal = 255 * alphaScale;

      if ((cx + ry) % 2 === 0) {
        fill(0, alphaVal); // 검은 점
      } else {
        fill(255, alphaVal); // 흰 점
      }

      ellipse(centerX, centerY, BASE_SIZE, finalHeights[ry]);
    }
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
