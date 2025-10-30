// ===== PARAMS =====
const COL_W = 40; // 컬럼 폭
const TILE_H = 120; // 타일 높이
const SLOPE = 16; // 기울기(오른쪽 아래로 얼마나 처질지)

let COLS; // 화면에 필요한 컬럼 수
const ROWS = 40; // 컬럼당 타일 개수 (패턴 반복 단위)

const COL_SPACING = 1.0; // 컬럼 간 간격 비율 (1 = 딱 붙음)
const MAX_SEGMENTS = 8; // 분할 최댓값 (1,2,4,8)

const PALETTE = [
  "#b0cce1",
  "#91b740",
  "#50a2d2",
  "#519e34",
  "#5c6bac",
  "#14968a",
  "#c2cd4d",
  "#f8cfcb",
  "#b880af",
];

// segmentColors[c][r][i] = 컬럼 c, row r의 i번째 세그먼트 색
let segmentColors = [];
// splitLevel[c][r] = 분할 수 (1,2,4,8...)
let splitLevel = [];

// 애니메이션용
let colSpeeds = []; // 각 컬럼 수직 이동 속도(px/frame)
let colOffsets = []; // 누적 이동량

// 이번 드래그에서 이미 분할한 타일 기록 ("c_r")
let tilesSplitThisDrag = {};

// 멀티포인터 추적
// pointerMap[pointerId] = { x, y }
let pointerMap = {};
let isInteracting = false;

let canvasRef;

function setup() {
  canvasRef = createCanvas(windowWidth, windowHeight);
  noStroke();

  COLS = Math.ceil(windowWidth / COL_W) + 1;

  initializeColumns();

  // 모바일 스크롤/줌 방지
  canvasRef.elt.style.touchAction = "none";

  // 통합 포인터 이벤트 사용 (마우스/터치 공통)
  canvasRef.elt.addEventListener("pointerdown", handlePointerDown, {
    passive: false,
  });
  canvasRef.elt.addEventListener("pointermove", handlePointerMove, {
    passive: false,
  });
  canvasRef.elt.addEventListener("pointerup", handlePointerUp, {
    passive: false,
  });
  canvasRef.elt.addEventListener("pointercancel", handlePointerUp, {
    passive: false,
  });
  canvasRef.elt.addEventListener("pointerout", handlePointerUp, {
    passive: false,
  });
  canvasRef.elt.addEventListener("pointerleave", handlePointerUp, {
    passive: false,
  });
}

// 초기 컬럼/색/속도 세팅
function initializeColumns() {
  segmentColors = [];
  splitLevel = [];
  colSpeeds = [];
  colOffsets = [];

  for (let c = 0; c < COLS; c++) {
    segmentColors[c] = [];
    splitLevel[c] = [];
    for (let r = 0; r < ROWS; r++) {
      segmentColors[c][r] = [];
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        segmentColors[c][r][i] = color(random(PALETTE));
      }
      splitLevel[c][r] = 1;
    }

    const dir = random([-1, 1]);
    colSpeeds[c] = dir * random(0.2, 1.0);
    colOffsets[c] = 0;
  }
}

// 리사이즈 시 새로 늘어난 컬럼만 추가
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  const newCols = Math.ceil(windowWidth / COL_W) + 1;

  if (newCols > COLS) {
    for (let c = COLS; c < newCols; c++) {
      segmentColors[c] = [];
      splitLevel[c] = [];
      for (let r = 0; r < ROWS; r++) {
        segmentColors[c][r] = [];
        for (let i = 0; i < MAX_SEGMENTS; i++) {
          segmentColors[c][r][i] = color(random(PALETTE));
        }
        splitLevel[c][r] = 1;
      }
      const dir = random([-1, 1]);
      colSpeeds[c] = dir * random(0.2, 1.0);
      colOffsets[c] = 0;
    }
  }

  COLS = newCols;
}

function draw() {
  background(255);

  // 1) 수직 흐름 업데이트
  for (let c = 0; c < COLS; c++) {
    if (colOffsets[c] !== undefined) {
      colOffsets[c] += colSpeeds[c];
    }
  }

  // 2) 컬럼 렌더
  for (let c = 0; c < COLS; c++) {
    const baseX = c * COL_W * COL_SPACING;

    // 컬럼마다 y시프트 걸어서 전체적으로 비스듬하게 흐르게
    const colYOffset = -c * (TILE_H * 0.5);

    // 이 컬럼만 그리도록 clip
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(baseX, 0, COL_W, height);
    drawingContext.clip();

    // 화면보다 많이 돌려서 끊김 없이 반복
    for (let r = -ROWS; r < ROWS * 2; r++) {
      const rowIndex = ((r % ROWS) + ROWS) % ROWS;

      // 타일의 왼쪽 위/아래 y
      const yTopLeft = colYOffset + r * TILE_H + colOffsets[c];
      const yBotLeft = yTopLeft + TILE_H;

      // 오른쪽은 기울기만큼 내려감
      const yTopRight = yTopLeft + SLOPE;
      const yBotRight = yBotLeft + SLOPE;

      const segCount = splitLevel[c][rowIndex];

      if (segCount === 1) {
        // 아직 안 쪼갠 기본 타일
        fill(segmentColors[c][rowIndex][0]);
        drawParallelogramVerticalSides(
          baseX,
          yTopLeft,
          yBotLeft,
          baseX + COL_W,
          yTopRight,
          yBotRight
        );
      } else {
        // 분할된 타일
        drawMultiSplitTile(
          baseX,
          yTopLeft,
          TILE_H,
          SLOPE,
          segCount,
          segmentColors[c][rowIndex]
        );
      }
    }

    drawingContext.restore();
  }

  // 3) 현재 누르고 있는 포인터 주변 타일 즉시 분할
  if (isInteracting) {
    for (const id in pointerMap) {
      const p = pointerMap[id];
      trySplitUnderPointer(p.x, p.y);
    }
  }
}

// 기본 평행사변형(분할 전 타일)
function drawParallelogramVerticalSides(
  xL,
  yTopLeft,
  yBotLeft,
  xR,
  yTopRight,
  yBotRight
) {
  beginShape();
  vertex(xL, yTopLeft);
  vertex(xR, yTopRight);
  vertex(xR, yBotRight);
  vertex(xL, yBotLeft);
  endShape(CLOSE);
}

// 분할 타일 (세그먼트별 높이 등분)
function drawMultiSplitTile(xLeft, yTop, H, slope, segCount, segColorArray) {
  const segH = H / segCount;

  for (let i = 0; i < segCount; i++) {
    const segTopLeft = yTop + segH * i;
    const segBotLeft = segTopLeft + segH;
    const segTopRight = segTopLeft + slope;
    const segBotRight = segBotLeft + slope;

    fill(segColorArray[i % segColorArray.length]);
    beginShape();
    vertex(xLeft, segTopLeft);
    vertex(xLeft + COL_W, segTopRight);
    vertex(xLeft + COL_W, segBotRight);
    vertex(xLeft, segBotLeft);
    endShape(CLOSE);
  }
}

// 분할 트리거
function trySplitUnderPointer(px, py) {
  // 어떤 컬럼 위인지
  for (let c = 0; c < COLS; c++) {
    const baseX = c * COL_W * COL_SPACING;
    const xL = baseX;
    const xR = baseX + COL_W;

    if (px < xL || px > xR) continue;

    // draw()에서 yTopLeft = -c*(TILE_H*0.5) + r*TILE_H + colOffsets[c]
    const colYOffset = -c * (TILE_H * 0.5);
    const localY = py - colOffsets[c];
    const rFloat = (localY - colYOffset) / TILE_H;
    const rGuess = Math.floor(rFloat);

    const baseRow = ((rGuess % ROWS) + ROWS) % ROWS;
    const key = `${c}_${baseRow}`;

    // 같은 드래그에서 같은 타일을 계속 쪼개는 걸 방지
    if (tilesSplitThisDrag[key]) {
      return;
    }

    // 분할 단계 증가 (1→2→4→8, 최대 MAX_SEGMENTS)
    let current = splitLevel[c][baseRow];
    let next = current * 2;
    if (next > MAX_SEGMENTS) next = MAX_SEGMENTS;
    splitLevel[c][baseRow] = next;

    tilesSplitThisDrag[key] = true;
    return;
  }
}

// 포인터 좌표 (canvas 기준)
function getCanvasPosFromPointerEvent(e) {
  return {
    x: e.offsetX,
    y: e.offsetY,
  };
}

// 포인터 DOWN
function handlePointerDown(e) {
  if (!isInteracting) {
    tilesSplitThisDrag = {};
  }
  isInteracting = true;

  const pos = getCanvasPosFromPointerEvent(e);
  pointerMap[e.pointerId] = { x: pos.x, y: pos.y };

  // 누르는 순간에도 바로 분할
  trySplitUnderPointer(pos.x, pos.y);

  e.preventDefault();
}

// 포인터 MOVE
function handlePointerMove(e) {
  if (!isInteracting) return;

  if (pointerMap[e.pointerId]) {
    const pos = getCanvasPosFromPointerEvent(e);
    pointerMap[e.pointerId].x = pos.x;
    pointerMap[e.pointerId].y = pos.y;
  }

  e.preventDefault();
}

// 포인터 UP / OUT / CANCEL
function handlePointerUp(e) {
  delete pointerMap[e.pointerId];

  if (Object.keys(pointerMap).length === 0) {
    isInteracting = false;
  }

  e.preventDefault();
}

// p5 기본 터치/마우스 제한
function mousePressed() {
  return false;
}
function mouseDragged() {
  return false;
}
function mouseReleased() {
  return false;
}
function touchStarted() {
  return false;
}
function touchMoved() {
  return false;
}
function touchEnded() {
  return false;
}
