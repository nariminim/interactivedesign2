// 투사체 (색상 원) 배열
let projections = [];

const projectionColorCodes = [
  'rgba(0, 100, 255, 0.6)',   // 밝은 파랑
  'rgba(255, 0, 100, 0.6)',   // 밝은 빨강/마젠타
  'rgba(255, 200, 0, 0.6)',   // 밝은 노랑
  'rgba(0, 200, 150, 0.6)',   // 청록
  'rgba(255, 100, 0, 0.6)',   // 주황
  'rgba(150, 0, 255, 0.6)'     // 보라
];

const GRID_SPACING = 20; // **수정됨: 간격 30 -> 20 (밀도 증가)**
let gridPoints = [];
let currentGridPositions = [];

let soundPool = [];
const POOL_SIZE = 10;
const soundFrequency = 440;
const soundWaveform = 'sine';

// 점 색상 설정 (흰색)
const POINT_COLOR_R = 255;
const POINT_COLOR_G = 255;
const POINT_COLOR_B = 255;
const POINT_ALPHA = 200;

// 캔버스 배경색 설정
const BACKGROUND_COLOR = '#2A2A4A';

// Projection 클래스 정의
class Projection {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.colorCode = random(projectionColorCodes);
    this.radius = 0;
    this.maxRadius = random(150, 300);
    this.life = 255;
  }

  update() {
    this.radius += 1.5;

    if (this.radius > this.maxRadius) {
      this.life -= 1;
    }

    if (this.life < 0) this.life = 0;
  }

  display() {
    if (this.life <= 0) return;

    push();

    let c = color(this.colorCode);
    c.setAlpha(this.life);
    fill(c);
    noStroke();

    let currentRadius = min(this.radius, this.maxRadius);
    ellipse(this.x, this.y, currentRadius * 2, currentRadius * 2);

    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

// ------------------- 초기화 시스템 안정화 -------------------

function initializeSystem() {
  // 1. **점 그리드 초기 좌표 생성 (밀도 증가)**
  gridPoints = [];
  currentGridPositions = [];

  for (let x = 0; x < width + GRID_SPACING; x += GRID_SPACING) {
    for (let y = 0; y < height + GRID_SPACING; y += GRID_SPACING) {
      gridPoints.push({ x: x, y: y });
      currentGridPositions.push({ x: x, y: y });
    }
  }

  // 2. **소리 풀 초기화**
  soundPool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    let osc = new p5.Oscillator(soundWaveform);
    let env = new p5.Env();

    env.setADSR(0.05, 0.2, 0.5, 0.5);

    osc.amp(env);
    osc.start();

    soundPool.push({
      osc: osc,
      env: env,
      playing: false
    });
  }
}


function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.mousePressed(userStartAudio);

  initializeSystem();

  background(240);
}

function draw() {
  background(BACKGROUND_COLOR); // 배경 남색으로 리셋

  drawDeformedGrid();

  let nextProjections = [];

  blendMode(SCREEN);

  for (let p of projections) {
    p.update();
    p.display();

    if (!p.isDead()) {
      nextProjections.push(p);
    }
  }

  projections = nextProjections;


  blendMode(BLEND);
}


function drawDeformedGrid() {
  stroke(POINT_COLOR_R, POINT_COLOR_G, POINT_COLOR_B, POINT_ALPHA);
  strokeWeight(2);

  for (let i = 0; i < gridPoints.length; i++) {
    let initialX = gridPoints[i].x;
    let initialY = gridPoints[i].y;
    let currentX = currentGridPositions[i].x;
    let currentY = currentGridPositions[i].y;

    // 초기 위치로 복귀 (변형 감쇠)
    currentX = lerp(currentX, initialX, 0.03);
    currentY = lerp(currentY, initialY, 0.03);

    // 투사체에 따른 변형 계산
    for (let p of projections) {
      let d = dist(currentX, currentY, p.x, p.y);
      let threshold = p.maxRadius * 0.3;

      if (d < threshold) {
        // 가까울수록 밀어내는 벡터 계산 (반발력)
        let angle = atan2(currentY - p.y, currentX - p.x);
        let strength = map(d, 0, threshold, 8, 0);

        currentX += cos(angle) * strength;
        currentY += sin(angle) * strength;
      }
    }

    // 현재 위치 업데이트 후 점 그리기
    currentGridPositions[i].x = currentX;
    currentGridPositions[i].y = currentY;

    point(currentX, currentY);
  }
}

// ------------------- 사용자 입력 함수 (PC & 모바일 통합) -------------------

function userStartAudio() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}

// 소리 풀에서 사용 가능한 객체를 찾아 재생하는 함수
function playSoundFromPool() {
  if (getAudioContext().state !== 'running') return;

  let availableSound = soundPool.find(s => s.playing === false);

  if (availableSound) {
    availableSound.playing = true;

    // Envelope 재생
    availableSound.env.play(availableSound.osc, 0, 0.5);

    // 소리 끝난 후 객체를 사용 가능 상태로 복귀
    let totalDuration = 0.05 + 0.2 + 0.5;
    setTimeout(() => {
      availableSound.playing = false;
    }, totalDuration * 1000);
  }
}


function createProjection(x, y) {
  projections.push(new Projection(x, y));
  playSoundFromPool();
}

function mousePressed() {
  if (touches.length === 0) {
    createProjection(mouseX, mouseY);
  }
}

function touchStarted() {
  for (let touch of touches) {
    createProjection(touch.x, touch.y);
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 창 크기 변경 시 시스템 재생성
  initializeSystem();
}