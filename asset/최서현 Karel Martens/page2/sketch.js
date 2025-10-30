// 그리드 및 모듈 설정
const GRID_SIZE = 50;
let modules = [];

// 색상 코드
const moduleColors = [
  'rgb(36, 109, 255)',
  'rgb(31, 255, 214)',
  'rgb(255, 230, 69)'
];
// 연결점 색상 (흰색)
const connectionColor = '#FFFFFF';

// 갱지 질감 노이즈 설정
const NOISE_INTENSITY = 8;

// 사운드 설정 (파형 설정 코드 제거)
let synth;
const soundFrequency = 440; // 부드러운 소리 주파수 유지
const soundDuration = 0.3;

// 선만 그릴 그래픽 버퍼
let graphicsBuffer;

// Module 클래스 정의
class Module {
  constructor(x, y) {
    this.x = round(x / GRID_SIZE) * GRID_SIZE;
    this.y = round(y / GRID_SIZE) * GRID_SIZE;

    this.isVertical = random() > 0.5;

    this.lengthUnits = floor(random(3, 6));
    this.maxLength = this.lengthUnits * GRID_SIZE;

    this.direction = random() > 0.5 ? 1 : -1;

    this.color = random(moduleColors);
    this.currentLength = 0;
    this.life = 255;
    this.maxLife = this.life;
  }

  update() {
    if (this.currentLength < this.maxLength) {
      this.currentLength += 15;
      if (this.currentLength > this.maxLength) {
        this.currentLength = this.maxLength;
      }
    }

    if (this.currentLength === this.maxLength) {
      this.life -= 1;
    }

    if (this.life < 0) this.life = 0;
  }

  display(buffer) {
    if (this.life <= 0) return;

    let alpha = map(this.life, 0, 50, 0, 255, true);

    buffer.push();

    let moduleColorWithAlpha = buffer.color(this.color);
    moduleColorWithAlpha.setAlpha(alpha);

    buffer.stroke(moduleColorWithAlpha);

    buffer.strokeWeight(30);

    let len = this.currentLength * this.direction;

    if (this.isVertical) {
      buffer.line(this.x, this.y, this.x, this.y + len);
    } else {
      buffer.line(this.x, this.y, this.x + len, this.y);
    }

    buffer.pop();
  }

  drawConnectionPoints() {
    if (this.life <= 0) return;

    push();
    noStroke();
    fill(connectionColor);

    let len = this.currentLength * this.direction;
    let currentMax = abs(len);

    for (let d = 0; d <= currentMax; d += GRID_SIZE) {
      let xPos = this.x;
      let yPos = this.y;

      if (this.isVertical) {
        yPos += (this.direction > 0) ? d : -d;
      } else {
        xPos += (this.direction > 0) ? d : -d;
      }

      if (d <= this.currentLength) {
        ellipse(xPos, yPos, 10, 10);
      }
    }
    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}


function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.mousePressed(userStartAudio);

  graphicsBuffer = createGraphics(windowWidth, windowHeight);

  background(240);

  // **소리 설정 복구:** 가장 안전한 기본 설정만 유지
  synth = new p5.PolySynth();
  synth.setADSR(0.1, 0.5, 0.2, 0.5); // 부드러운 소리를 위한 ADSR
}

function draw() {
  background('#E0D8C8');

  let nextModules = [];

  graphicsBuffer.clear();
  graphicsBuffer.blendMode(LIGHTEST);

  for (let m of modules) {
    m.update();
    m.display(graphicsBuffer);

    if (!m.isDead()) {
      nextModules.push(m);
    }
  }

  modules = nextModules;

  image(graphicsBuffer, 0, 0);

  blendMode(BLEND);

  for (let m of modules) {
    m.drawConnectionPoints();
  }

  noStroke();
  fill(0, NOISE_INTENSITY);

  for (let i = 0; i < 50; i++) {
    let nx = random(width);
    let ny = random(height);
    rect(nx, ny, 1, 1);
  }
}

// ------------------- 사용자 입력 함수 (PC & 모바일 통합) -------------------

function userStartAudio() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}

// 새로운 모듈을 생성하고 사운드를 재생하는 핵심 함수
function createModule(x, y, count = 1) {
  for (let i = 0; i < count; i++) {
    let m = new Module(x, y);
    modules.push(m);

    // 사운드 피드백
    if (getAudioContext().state === 'running') {
      let velocity = 0.6;
      synth.play(soundFrequency, velocity, 0, soundDuration);
    }
  }
}

// PC 마우스 클릭 시: 1개만 생성
function mousePressed() {
  if (touches.length === 0) {
    createModule(mouseX, mouseY, 1);
  }
}

// PC 마우스 드래그 시: 1개 생성 (밀도 증가)
function mouseDragged() {
  if (touches.length === 0) {
    if (frameCount % 5 === 0) {
      createModule(mouseX, mouseY, 1);
    }
  }
}

// 모바일 터치 시작 시: 1개만 생성
function touchStarted() {
  for (let touch of touches) {
    createModule(touch.x, touch.y, 1);
  }
  return false;
}

// 모바일 드래그 시: 1개 생성 (밀도 증가)
function touchMoved() {
  for (let touch of touches) {
    if (frameCount % 5 === 0) {
      createModule(touch.x, touch.y, 1);
    }
  }
  return false;
}

// 창 크기 바뀌면 캔버스 리사이즈
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  graphicsBuffer = createGraphics(windowWidth, windowHeight);
  background('#E0D8C8');
}