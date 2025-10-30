// 색상 파장 배열
let waves = [];

const waveColorCodes = [
  'rgba(0, 100, 255, 0.6)',    // 밝은 파랑
  'rgba(255, 0, 100, 0.6)',    // 밝은 빨강/마젠타
  'rgba(255, 200, 0, 0.6)',    // 밝은 노랑
  'rgba(0, 200, 150, 0.6)',    // 청록
  'rgba(255, 100, 0, 0.6)',    // 주황
  'rgba(150, 0, 255, 0.6)'     // 보라
];

let graphicsBuffer;

const soundFrequency = 260; // 낮은 주파수 유지
const soundWaveform = 'sine'; // 부드러운 사인 파형

class Wave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.colorCode = random(waveColorCodes);
    this.radius = 0;
    // 확산 크기 (250으로 유지)
    this.maxRadius = 250;
    this.life = 255;
  }

  update() {
    this.radius += 2;

    if (this.radius > this.maxRadius) {
      // 소멸 속도 (0.5로 유지)
      this.life -= 0.5;
    }

    if (this.life < 0) this.life = 0;
  }

  display(buffer) {
    if (this.life <= 0) return;

    buffer.push();

    let c = buffer.color(this.colorCode);
    c.setAlpha(this.life);
    buffer.fill(c);
    buffer.noStroke();

    let currentRadius = min(this.radius, this.maxRadius);
    buffer.ellipse(this.x, this.y, currentRadius * 2, currentRadius * 2);

    buffer.pop();
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
}

function draw() {
  background('#F5E8EC');

  let nextWaves = [];

  graphicsBuffer.clear();

  for (let wave of waves) {
    wave.update();
    wave.display(graphicsBuffer);

    if (!wave.isDead()) {
      nextWaves.push(wave);
    }
  }

  waves = nextWaves;

  blendMode(BLEND);
  image(graphicsBuffer, 0, 0);
}


function userStartAudio() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}

function playWaterRippleSound() {
  if (getAudioContext().state !== 'running') {
    userStartAudio(); // 오디오 컨텍스트가 멈춰있으면 재개 시도
    return;
  }

  let osc = new p5.Oscillator(soundWaveform);
  let env = new p5.Env();

  env.setADSR(0.1, 0.5, 0.3, 1.5);

  osc.freq(soundFrequency);
  osc.amp(env);
  osc.start();

  env.play(osc, 0, 0.5);

  // Release 이후 Oscillator 정지
  setTimeout(() => {
    osc.stop();

    osc.dispose();
    env.dispose();
  }, (0.1 + 0.5 + 1.5) * 1000 + 100); // ADSR 시간 총합 이후 정지
}

function createWave(x, y) {
  let w = new Wave(x, y);
  waves.push(w);

  playWaterRippleSound();
}

function mousePressed() {
  if (touches.length === 0) {
    createWave(mouseX, mouseY);
  }
}

function touchStarted() {
  for (let touch of touches) {
    createWave(touch.x, touch.y);
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  graphicsBuffer = createGraphics(windowWidth, windowHeight);
  background('#F5E8EC');
}