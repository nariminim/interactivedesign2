let patternModules = []; // 생성된 모든 모듈을 저장할 배열

// 스피커 색상 정의
const SPEAKER_COLORS = {
  ORANGE: { outer: 'rgba(255, 184, 98, 1)', inner: '#ffcd71ff' }, // 진한 오렌지
  BLUE: { outer: 'rgba(62, 174, 255, 1)', inner: '#7cc4ffff' },  // 미디엄 블루
  PINK: { outer: 'rgba(255, 128, 191, 1)', inner: '#ff90cfff' },  // 진한 핑크
  LIME: { outer: 'rgba(173, 255, 47, 1)', inner: '#C0FF69' }     // 밝은 연두색
};

// 모듈 크기 및 설정
const SPEAKER_SIZE = 80;
const MODULE_LIFESPAN = 600; // 모듈의 수명 (프레임 단위)

// 물리 설정
const COLLISION_FORCE = 0.5; // 충돌 시 밀어내는 힘의 강도
const FRICTION = 0.98;       // 마찰 (속도 감쇠)

// 모듈 종류
const MODULE_TYPES = ['SPEAKER_ORANGE', 'SPEAKER_BLUE', 'SPEAKER_PINK', 'SPEAKER_LIME'];

// 소리 설정 변수
let clickOsc;
let clickEnv;
const soundFrequency = 440;
const soundDuration = 0.1;

// 새로운 배경색 (더 연하게)
const BACKGROUND_COLOR_CODE = '#E0FFFF'; // 매우 연한 하늘색


// Module 클래스 정의
class PatternModule {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.birthFrame = frameCount;
    this.currentLife = MODULE_LIFESPAN;
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.5, 0.5);
  }

  update() {
    this.currentLife = MODULE_LIFESPAN - (frameCount - this.birthFrame);

    let alpha = map(this.currentLife, 0, MODULE_LIFESPAN, 0, 255);

    // 1. 물리 업데이트: 속도 적용 및 마찰
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    // 2. 화면 경계 제한
    this.x = constrain(this.x, SPEAKER_SIZE / 2, width - SPEAKER_SIZE / 2);
    this.y = constrain(this.y, SPEAKER_SIZE / 2, height - SPEAKER_SIZE / 2);

    return alpha;
  }

  display(alpha) {
    if (alpha <= 0) return;

    push();
    translate(this.x, this.y);

    let colors = this.getColors();

    // 1. 진동 파동 효과 (주변으로 퍼지는 원)
    let pulseSize = map(this.currentLife % 100, 0, 100, SPEAKER_SIZE * 0.8, SPEAKER_SIZE * 1.5);
    let pulseAlpha = map(this.currentLife % 100, 0, 100, alpha * 0.0, alpha * 0.2);

    noFill();
    stroke(hue(colors.outer), saturation(colors.outer), brightness(colors.outer), pulseAlpha);
    strokeWeight(2);
    ellipse(0, 0, pulseSize, pulseSize);

    // 2. 스피커 유닛 본체
    let outerColor = color(colors.outer);
    outerColor.setAlpha(alpha);
    fill(outerColor);
    noStroke();
    ellipse(0, 0, SPEAKER_SIZE, SPEAKER_SIZE);

    let innerColor = color(colors.inner);
    innerColor.setAlpha(alpha);
    fill(innerColor);
    ellipse(0, 0, SPEAKER_SIZE * 0.6, SPEAKER_SIZE * 0.6);

    let detailColor = color(200);
    detailColor.setAlpha(alpha);
    fill(detailColor);
    for (let i = 0; i < 4; i++) {
      let angle = i * PI / 2 + PI / 4;
      ellipse(cos(angle) * SPEAKER_SIZE * 0.4, sin(angle) * SPEAKER_SIZE * 0.4, 8, 8);
    }
    pop();
  }

  getColors() {
    if (this.type === 'SPEAKER_ORANGE') return SPEAKER_COLORS.ORANGE;
    if (this.type === 'SPEAKER_BLUE') return SPEAKER_COLORS.BLUE;
    if (this.type === 'SPEAKER_PINK') return SPEAKER_COLORS.PINK;
    if (this.type === 'SPEAKER_LIME') return SPEAKER_COLORS.LIME; // 새로운 색상
  }

  isDead() {
    return this.currentLife <= 0;
  }
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  // 캔버스에 마우스 이벤트를 연결하여 오디오 컨텍스트를 활성화하도록 설정 (첫 터치 보장)
  canvas.mousePressed(userStartAudio);

  background(BACKGROUND_COLOR_CODE);
  colorMode(HSB, 360, 100, 100, 255);

  // 소리 객체 초기화
  clickOsc = new p5.Oscillator();
  clickOsc.setType('sine');
  clickOsc.freq(soundFrequency);
  clickEnv = new p5.Env();
  clickEnv.setADSR(0.005, 0.1, 0.5, 0.1);
  clickOsc.amp(clickEnv);
  clickOsc.start();
  clickOsc.stop();
}

function draw() {
  // 잔상 효과를 위한 반투명 배경색 적용 (투명도 15)
  let bgCol = color(hue(BACKGROUND_COLOR_CODE), saturation(BACKGROUND_COLOR_CODE), brightness(BACKGROUND_COLOR_CODE), 15);
  background(bgCol);

  let nextModules = [];

  for (let i = 0; i < patternModules.length; i++) {
    let moduleA = patternModules[i];

    // 다른 모든 모듈과 충돌 감지
    for (let j = i + 1; j < patternModules.length; j++) {
      let moduleB = patternModules[j];

      let distance = dist(moduleA.x, moduleA.y, moduleB.x, moduleB.y);
      let minDistance = SPEAKER_SIZE;

      if (distance < minDistance) {
        let angle = atan2(moduleB.y - moduleA.y, moduleB.x - moduleA.x);
        let overlap = minDistance - distance;

        moduleA.vx -= cos(angle) * overlap * COLLISION_FORCE;
        moduleA.vy -= sin(angle) * overlap * COLLISION_FORCE;
        moduleB.vx += cos(angle) * overlap * COLLISION_FORCE;
        moduleB.vy += sin(angle) * overlap * COLLISION_FORCE;
      }
    }

    let alpha = moduleA.update();
    moduleA.display(alpha);

    if (!moduleA.isDead()) {
      nextModules.push(moduleA);
    }
  }
  patternModules = nextModules;
}

// ------------------- 오디오 안정화 함수 -------------------

// **안정화 함수 추가:** 오디오 컨텍스트를 활성화하는 역할
function userStartAudio() {
  // 오디오 컨텍스트가 멈춰있으면 재개 시도
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      // 컨텍스트가 재개되면 소리 재생 준비 완료
      console.log("Audio Context Resumed!");
    });
  }
}

// ------------------- 사용자 입력 함수 -------------------

function createNewModule(x, y) {
  let randomType = random(MODULE_TYPES);
  patternModules.push(new PatternModule(x, y, randomType));

  // 효과음 재생
  if (getAudioContext().state === 'running') { // 컨텍스트가 활성 상태일 때만 재생
    clickOsc.start();
    clickEnv.play(clickOsc);
  }
}

function mousePressed() {
  // mousePressed는 setup에서 canvas.mousePressed(userStartAudio)로 대체됨
  if (touches.length === 0) {
    createNewModule(mouseX, mouseY);
  }
}

function touchStarted() {
  // touchStarted에서도 createNewModule 호출
  if (touches.length > 0) {
    createNewModule(touches[0].x, touches[0].y);
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}