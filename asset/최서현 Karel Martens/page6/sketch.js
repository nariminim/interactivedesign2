// 상자 설정 상수
const MODULE_THICKNESS = 16;
const DOT_SPACING = 30;
const DOT_SIZE = 6;

// 물리 및 모듈 설정
const GRAVITY = 0.5;
const BOUNCE_DAMPENING = 0.7;
const FALLING_MODULE_SIZE = 25;
let fallingModules = [];

// 4가지 색상 팔레트
const COLORS = [
    '#ff9fc0ff', // 연한 보라
    '#bf7fffff', // 진한 보라
    '#ffd562ff', // 노랑 (주황빛)
    '#ff5667ff', // 빨강
    '#83ffa4ff', // 녹색
    '#5ebcffff'  // 파랑
];

let GROUND_Y = 0;
let vertices = [];

let BOX_LEFT_X = 0;
let BOX_RIGHT_X = 0;

const BACKGROUND_COLOR = '#FFF1CA';

// **소리 설정 변수**
const soundFrequency = 600; // 높은 주파수로 짧고 경쾌한 소리
const soundDuration = 0.2; // 소리 길이


// 낙하하는 모듈 클래스 정의
class FallingModule {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = random(-2, 2);
        this.vy = random(-5, -2);
        this.color = color(random(COLORS));

        this.groundLevelY = GROUND_Y;

        this.leftWall = BOX_LEFT_X;
        this.rightWall = BOX_RIGHT_X;
    }

    update() {
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        let halfSize = FALLING_MODULE_SIZE / 2;

        // 바닥 충돌 처리
        if (this.y > this.groundLevelY - halfSize) {
            this.y = this.groundLevelY - halfSize;
            this.vy *= -BOUNCE_DAMPENING;
            this.vx *= 0.9;
        }

        // 좌우 경계 충돌 처리 (상자 옆면)
        if (this.x < this.leftWall + halfSize) {
            this.x = this.leftWall + halfSize;
            this.vx *= -BOUNCE_DAMPENING;
        } else if (this.x > this.rightWall - halfSize) {
            this.x = this.rightWall - halfSize;
            this.vx *= -BOUNCE_DAMPENING;
        }

        // 멈춤 조건
        if (abs(this.vy) < 1 && abs(this.y - (this.groundLevelY - halfSize)) < 1) {
            this.vy = 0;
            this.vx = 0;
        }
    }

    display() {
        push();
        fill(this.color);
        noStroke();
        ellipse(this.x, this.y, FALLING_MODULE_SIZE, FALLING_MODULE_SIZE);
        pop();
    }

    isStopped() {
        return this.vy === 0 && this.vx === 0;
    }
}


function setup() {
    createCanvas(windowWidth, windowHeight);
    background(255);

    GROUND_Y = height * 0.9;
    initializeVertices();
}

function draw() {
    background(BACKGROUND_COLOR);

    updateFallingModules();

    drawBoxModules();

    blendMode(BLEND);
}

// ------------------- 상자 및 모듈 초기화 함수 (기존 유지) -------------------

function initializeVertices() {
    let centerX = width / 2 + 100;
    let bottomY = height * 0.9;

    const w = 400; const h = 200;
    const dX = 150; const dY = 50;

    vertices = [
        { x: centerX - w / 2, y: bottomY },
        { x: centerX + w / 2, y: bottomY },
        { x: centerX + w / 2 - dX, y: bottomY - dY },
        { x: centerX - w / 2 - dX, y: bottomY - dY },

        { x: centerX - w / 2, y: bottomY - h },
        { x: centerX + w / 2, y: bottomY - h },
        { x: centerX + w / 2 - dX, y: bottomY - dY - h },
        { x: centerX - w / 2 - dX, y: bottomY - dY - h }
    ];

    BOX_LEFT_X = min(vertices[0].x, vertices[3].x, vertices[4].x, vertices[7].x);
    BOX_RIGHT_X = max(vertices[1].x, vertices[2].x, vertices[5].x, vertices[6].x);

    GROUND_Y = vertices[0].y;
    for (let m of fallingModules) {
        m.groundLevelY = GROUND_Y;
        m.leftWall = BOX_LEFT_X;
        m.rightWall = BOX_RIGHT_X;
    }
}


function updateFallingModules() {
    let nextModules = [];
    for (let m of fallingModules) {
        m.update();
        m.display();
        if (!m.isStopped()) {
            nextModules.push(m);
        }
    }
    fallingModules = nextModules;
}


// ------------------- 상자 드로잉 및 DOTS 함수 (기존 유지) -------------------

function drawBoxModules() {
    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [0, 4], [1, 5], [2, 6], [3, 7],
        [4, 5], [5, 6], [6, 7], [7, 4]
    ];

    for (const [v1, v2] of edges) {
        let p1 = vertices[v1];
        let p2 = vertices[v2];

        stroke(0);
        strokeWeight(MODULE_THICKNESS);
        line(p1.x, p1.y, p2.x, p2.y);

        drawDots(p1.x, p1.y, p2.x, p2.y);
    }
}

function drawDots(x1, y1, x2, y2) {
    let distance = dist(x1, y1, x2, y2);
    let numDots = floor(distance / DOT_SPACING);

    noStroke();
    fill(255);

    for (let i = 1; i < numDots; i++) {
        let t = i / numDots;
        let dotX = lerp(x1, x2, t);
        let dotY = lerp(y1, y2, t);
        ellipse(dotX, dotY, DOT_SIZE, DOT_SIZE);
    }
}


// ------------------- 사용자 입력 함수 (효과음 추가) -------------------

// 소리 재생을 위한 헬퍼 함수
function playCoinDropSound() {
    // 오디오 컨텍스트가 활성화되었는지 확인 (첫 클릭 이후에만 작동)
    if (getAudioContext().state !== 'running') {
        getAudioContext().resume();
    }

    if (getAudioContext().state === 'running') {
        let osc = new p5.Oscillator('triangle'); // 경쾌한 톤을 위해 triangle 파형 사용
        let env = new p5.Env();

        // 짧고 펀치감 있는 소리를 위한 ADSR 설정
        env.setADSR(0.005, 0.05, 0.1, 0.1);

        osc.freq(soundFrequency);
        osc.amp(env);
        osc.start();

        env.play(osc, 0, 0.4); // 0.4 볼륨

        // 소리 끝난 후 객체 해제
        setTimeout(() => {
            osc.stop();
            osc.dispose();
            env.dispose();
        }, 300); // 300ms 후 해제
    }
}


function createNewModule(x, y) {
    const COUNT = 3;
    for (let i = 0; i < COUNT; i++) {
        let boxEntryY = (vertices[4].y + vertices[5].y + vertices[6].y + vertices[7].y) / 4;
        let startY = min(y, boxEntryY - 50);

        let startX = constrain(x, BOX_LEFT_X, BOX_RIGHT_X);

        fallingModules.push(new FallingModule(startX, startY));
    }

    playCoinDropSound();
}

function mousePressed() {
    if (touches.length === 0) {
        createNewModule(mouseX, mouseY);
    }
}

function touchStarted() {
    if (touches.length > 0) {
        createNewModule(touches[0].x, touches[0].y);
    }
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    initializeVertices();
}