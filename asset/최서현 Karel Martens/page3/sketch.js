// 전체 그리드 설정
const COLS = 6; // **수정됨: 가로 6개**
const ROWS = 5; // **수정됨: 세로 5개**
let eyeSize;
let eyes = [];

// 1. 큰 원 (홍채) 색상 팔레트
const outerEyeColors = [
  '#FF0000', '#FFFF00', '#87CEEB', '#0000FF', '#800080', '#A52A2A'
];

// 2. 중간 원 (동공) 색상 팔레트
const middlePupilColors = [
  '#FFFFFF', // 흰색
  '#FFDAB9', // 살구색
  '#FFB6C1', // 연분홍색
  '#0000FF'  // 파란색
];

// 3. 작은 원 (중심 동공) 색상 팔레트
const innerPupilColors = [
  '#b34597ff', '#FFA500', '#000000', '#008000', '#ff5d78ff'
];

// 눈알 클래스 정의
class Eye {
  constructor(x, y, index) {
    this.x = x;
    this.y = y;
    this.eyeColor = random(outerEyeColors);
    this.middlePupilColor = random(middlePupilColors);
    this.innerPupilColor = random(innerPupilColors);
    this.pupilX = 0;
    this.pupilY = 0;
    this.index = index;

    // 소리 객체 (Oscillator)
    this.osc = new p5.Oscillator('sine');
    this.osc.start();
    this.osc.amp(0);
  }

  // 동공 위치 업데이트 및 사운드 제어
  update(targetX, targetY, speed) {
    // 동공이 홍채 밖으로 삐져나오지 않도록 제한된 반경
    const pupilOffsetRadius = (eyeSize / 2) * 0.25;

    const angle = atan2(targetY - this.y, targetX - this.x);
    const distance = dist(targetX, targetY, this.x, this.y);

    // 동공 위치 계산 (제한된 반경 내로 이동)
    this.pupilX = cos(angle) * min(distance, pupilOffsetRadius);
    this.pupilY = sin(angle) * min(distance, pupilOffsetRadius);

    // 청각적 피드백 로직
    const maxDist = width / COLS;
    const normalizedDist = constrain(dist(this.x, this.y, targetX, targetY), 0, maxDist);
    const volume = map(normalizedDist, 0, maxDist, 0.4, 0.05);
    this.osc.fade(volume, 0.1);

    const minFreq = 100;
    const maxFreq = 600;
    const frequency = map(speed, 0, 50, minFreq, maxFreq);
    this.osc.freq(frequency);
  }

  display() {
    push();
    translate(this.x, this.y);

    // 1. 큰 원 (홍채) 그리기
    fill(this.eyeColor);
    noStroke();
    ellipse(0, 0, eyeSize, eyeSize);

    // 2. 중간 원 (동공) 그리기
    fill(this.middlePupilColor);
    ellipse(this.pupilX, this.pupilY, eyeSize * 0.7, eyeSize * 0.7);

    // 3. 작은 원 (중심 동공) 그리기
    fill(this.innerPupilColor);
    ellipse(this.pupilX, this.pupilY, eyeSize * 0.35, eyeSize * 0.35);

    pop();
  }
}


function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.mousePressed(userStartAudio);

  background(0);

  // eyeSize 계산: COLS와 ROWS가 늘어났으므로 눈알 크기는 작아집니다.
  eyeSize = min(width / COLS, height / ROWS) * 0.8;

  // 눈알 객체 초기화
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let x = (c + 0.5) * (width / COLS);
      let y = (r + 0.5) * (height / ROWS);
      eyes.push(new Eye(x, y, r * COLS + c));
    }
  }
}

function draw() {
  background(0);

  let targetX = mouseX;
  let targetY = mouseY;
  let trackingSpeed = dist(pmouseX, pmouseY, mouseX, mouseY);

  // 다중 터치 로직
  if (touches.length > 0) {
    for (let eye of eyes) {
      let closestTouchX = -1;
      let closestTouchY = -1;
      let minDistance = Infinity;
      let currentTouchIndex = -1;

      // 가장 가까운 터치 지점을 찾습니다.
      for (let i = 0; i < touches.length; i++) {
        let d = dist(eye.x, eye.y, touches[i].x, touches[i].y);
        if (d < minDistance) {
          minDistance = d;
          closestTouchX = touches[i].x;
          closestTouchY = touches[i].y;
          currentTouchIndex = i;
        }
      }

      const prevTouchX = touches[currentTouchIndex].pwinX;
      const prevTouchY = touches[currentTouchIndex].pwinY;

      trackingSpeed = dist(prevTouchX, prevTouchY, closestTouchX, closestTouchY);

      eye.update(closestTouchX, closestTouchY, trackingSpeed);
      eye.display();
    }

  } else {
    // 터치가 없을 경우, 마우스를 추적합니다.
    for (let eye of eyes) {
      eye.update(targetX, targetY, trackingSpeed);
      eye.display();
    }
  }
}

// 오디오 컨텍스트를 활성화하는 함수 (첫 클릭/터치 필요)
function userStartAudio() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
    for (let eye of eyes) {
      eye.osc.start();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 캔버스 크기 변경 시 눈알 크기와 위치 재계산
  eyeSize = min(width / COLS, height / ROWS) * 0.8;

  let index = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      eyes[index].x = (c + 0.5) * (width / COLS);
      eyes[index].y = (r + 0.5) * (height / ROWS);
      index++;
    }
  }
}

// 모바일 브라우저 기본 동작 방지
function touchStarted() {
  return false;
}

function touchMoved() {
  return false;
}

function touchEnded() {
  return false;
}