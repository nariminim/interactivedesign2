// 투사체 (색상 원) 배열
let rays = [];

// 카럴 마를턴스 스타일의 밝고 채도 높은 색상 팔레트
const RAY_COLORS = [
    'rgba(255, 87, 51, 0.6)',
    'rgba(255, 195, 0, 0.6)',
    'rgba(50, 205, 50, 0.6)',
    'rgba(30, 144, 255, 0.6)',
    'rgba(255, 105, 180, 0.6)',
    'rgba(147, 112, 219, 0.6)',
    'rgba(0, 206, 209, 0.6)'
];

const RAY_THICKNESS = 15;
const RAY_LIFESPAN = 180;

// 마스터 컨트롤 변수
let currentRayLength = 200;

// 배경 그리드 인터랙션 변수
const GRID_SIZE = 50;
let gridData = [];
const GRID_FADE_SPEED = 0.05;

// 소리 설정 변수
let soundPool = [];
const POOL_SIZE = 5;
const soundFrequency = 350;
const soundWaveform = 'sine';

let audioContextStarted = false;


// Ray 클래스 정의 (기존 유지)
class Ray {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.initialAngle = random(TWO_PI);

        this.color = random(RAY_COLORS);
        this.rotation = 0;
        this.rotationSpeed = random(-0.01, 0.01);
        this.life = RAY_LIFESPAN;

        this.currentAngle = this.initialAngle;
        this.targetAngle = this.initialAngle;
    }

    update() {
        this.life -= 1;
        this.rotation += this.rotationSpeed;

        let centerX = width / 2;
        let centerY = height / 2;
        this.targetAngle = atan2(centerY - this.y, centerX - this.x);

        this.currentAngle = lerp(this.currentAngle, this.targetAngle, 0.02);

        if (this.life < 0) this.life = 0;
    }

    display() {
        if (this.life <= 0) return;

        push();

        let alpha = map(this.life, 0, RAY_LIFESPAN, 0, 255);

        let c = color(this.color);
        c.setAlpha(alpha);
        stroke(c);
        strokeWeight(RAY_THICKNESS);

        translate(this.x, this.y);
        rotate(this.currentAngle + this.rotation);

        let halfLength = currentRayLength / 2;

        line(-halfLength, 0, halfLength, 0);

        pop();
    }

    isDead() {
        return this.life <= 0;
    }
}

// ------------------- 초기화 시스템 안정화 (NEW) -------------------

function initializeGridAndAudio() {
    // 1. 그리드 데이터 초기화 (창 크기 변경 시에도 안전하게 호출됨)
    gridData = [];
    for (let x = 0; x < width + GRID_SIZE; x += GRID_SIZE) {
        for (let y = 0; y < height + GRID_SIZE; y += GRID_SIZE) {
            gridData.push({
                x: x + GRID_SIZE / 2,
                y: y + GRID_SIZE / 2,
                alpha: 0,
                color: color('#E0E0E0')
            });
        }
    }

    // 2. 오디오 풀 초기화 (setup에서 한번만 호출)
    if (soundPool.length === 0) {
        for (let i = 0; i < POOL_SIZE; i++) {
            let osc = new p5.Oscillator(soundWaveform);
            let env = new p5.Env();
            env.setADSR(0.1, 0.2, 0.5, 0.5);
            osc.freq(soundFrequency);
            osc.amp(env);
            osc.start();
            soundPool.push({ osc: osc, env: env, playing: false });
        }
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(240);

    // 캔버스 크기 확정 후 안정적으로 초기화
    initializeGridAndAudio();
}

function draw() {
    background('#FFFAF0');

    // 1. **背景 그리드 업데이트 및 그리기**
    updateAndDrawGrid();

    currentRayLength = map(mouseY, 0, height, 400, 100, true);

    // 2. **광선 드로잉**
    blendMode(MULTIPLY);

    let nextRays = [];
    for (let r of rays) {
        r.update();
        r.display();
        if (!r.isDead()) {
            nextRays.push(r);
        }
    }
    rays = nextRays;

    // 3. **画面 블렌드 복구**
    blendMode(BLEND);
}

// **背景 그리드 업데이트 및 그리기 함수 (변동 없음)**
function updateAndDrawGrid() {
    noFill();
    strokeWeight(0.5);

    for (let data of gridData) {
        for (let r of rays) {
            let d = dist(r.x, r.y, data.x, data.y);
            if (d < 150) {
                data.alpha = min(data.alpha + 0.1, 1.0);
                data.color = lerpColor(data.color, color(r.color), 0.1);
            }
        }

        data.alpha = max(data.alpha - GRID_FADE_SPEED, 0);
        data.color = lerpColor(data.color, color('#E0E0E0'), 0.05);

        if (data.alpha > 0) {
            let currentColor = data.color;
            currentColor.setAlpha(map(data.alpha, 0, 1, 0, 150));
            stroke(currentColor);
            rect(data.x - GRID_SIZE / 2, data.y - GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
        }
    }
}

// ------------------- 사용자 입력 함수 (오디오 활성화 및 인터랙션) -------------------

function attemptStartAudioContext() {
    if (audioContextStarted) return;

    if (getAudioContext().state !== 'running') {
        getAudioContext().resume().then(() => {
            console.log('Audio Context Resumed!');
            audioContextStarted = true;
        });
    } else {
        audioContextStarted = true;
    }
}

// **부드러운 소리 재생 함수**
function playSoftTone() {
    if (!audioContextStarted) return;

    let availableSound = soundPool.find(s => s.playing === false);

    if (availableSound) {
        availableSound.playing = true;

        availableSound.env.play(availableSound.osc, 0, 0.5);

        let totalDuration = 0.1 + 0.2 + 0.5;
        setTimeout(() => {
            availableSound.playing = false;
        }, totalDuration * 1000);
    }
}

function createNewRay(x, y) {
    rays.push(new Ray(x, y));
    playSoftTone();
}

function mousePressed() {
    attemptStartAudioContext();
    if (touches.length === 0) {
        createNewRay(mouseX, mouseY);
    }
}

function touchStarted() {
    attemptStartAudioContext();
    if (touches.length > 0) {
        createNewRay(touches[0].x, touches[0].y);
    }
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // 창 크기 변경 시 시스템 재생성
    initializeGridAndAudio();
}