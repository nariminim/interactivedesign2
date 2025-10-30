let cells = [];
const BASE_COLS = 10;
let CELL_SIZE;
let COLS, ROWS;

const PALETTE = [
    '#ff548aff',
    '#20e3dcff',
    '#5199f0ff',
    '#f9f957ff'
];

// 마우스 오버 시 최대 회전 폭
const MAX_ROTATION_DEGREE = 180;

// 소리 시스템 변수
let clickNoise;
let audioContextStarted = false;

// 새로운 인터랙션 변수
let colorWave = {
    x: -9999,
    y: -9999,
    radius: 0,
    active: false,
    newColor: 0
};


class Cell {
    constructor(x, y, size, initialColor) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = initialColor;
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.rotationLerpSpeed = 0.1;
        this.initialColor = initialColor;
    }

    checkCollision(mx, my) {
        let d = dist(mx, my, this.x, this.y);
        let influenceRadius = CELL_SIZE * 2.5;

        if (d < influenceRadius) {
            let strength = map(d, 0, influenceRadius, 1, 0, true);
            this.targetRotation = radians(strength * MAX_ROTATION_DEGREE);
        } else {
            this.targetRotation = 0;
        }
    }

    update() {
        this.currentRotation = lerp(this.currentRotation, this.targetRotation, this.rotationLerpSpeed);

        // 색상 파장 충돌 검사 (영구 색상 전환)
        if (colorWave.active) {
            let d = dist(this.x, this.y, colorWave.x, colorWave.y);

            if (d < colorWave.radius && d > colorWave.radius - 20) { // 파장 영역
                this.color = colorWave.newColor; // 색상 영구 전환
            }
        }
    }

    display() {
        push();
        translate(this.x, this.y);
        rotate(this.currentRotation);

        noStroke();
        fill(this.color);

        // 1. 왼쪽 반원 
        arc(0, 0, this.size * 2, this.size * 2, PI / 2, 3 * PI / 2, PIE);
        // 2. 오른쪽 반원 (흰색 반투명)
        fill(255, 255, 255, 150);
        arc(0, 0, this.size * 2, this.size * 2, -PI / 2, PI / 2, PIE);

        pop();
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(RGB, 255);
    angleMode(RADIANS);

    initializeCells();
    background(255);

    // **소리 객체 초기화 (setup에서 start)**
    clickNoise = new p5.Noise('white');
    clickNoise.amp(0);
    clickNoise.start(); // 미리 시작 (볼륨 0)
}

function initializeCells() {
    cells = [];

    CELL_SIZE = min(width / BASE_COLS, height / ROWS);
    COLS = BASE_COLS;
    ROWS = ceil(height / CELL_SIZE);

    const cellSize = CELL_SIZE;
    const startX = 0;
    const startY = 0;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let x = startX + c * cellSize;
            let y = startY + r * cellSize;

            let randomColor = color(random(PALETTE));

            cells.push(new Cell(x + cellSize / 2, y + cellSize / 2, cellSize * 0.55, randomColor));
        }
    }
}

function draw() {
    background(255); // 흰색 배경

    if (colorWave.active) {
        colorWave.radius += 20; // 파장 확산 속도
        if (colorWave.radius > max(width, height) * 1.5) {
            colorWave.active = false;
            colorWave.radius = 0;
        }
    }

    for (let cell of cells) {
        cell.checkCollision(mouseX, mouseY);
        cell.update();
        cell.display();
    }
}


function attemptStartAudioContext() {
    if (audioContextStarted) return;

    // 오디오 컨텍스트가 멈춰있다면 재개 시도
    if (getAudioContext().state !== 'running') {
        getAudioContext().resume().then(() => {
            audioContextStarted = true;
        });
    } else {
        audioContextStarted = true;
    }
}

function playDigitalClick() {
    // 1. **활성화 체크:** 오디오 컨텍스트가 시작되었는지 확인
    if (!audioContextStarted) return;

    let env = new p5.Env();
    env.setADSR(0.001, 0.05, 0.0, 0.1);

    clickNoise.freq(random(800, 1200));
    // Envelope를 clickNoise에 연결하고 재생 시작
    env.play(clickNoise, 0, 0.15);

    // 재생 후 볼륨 0으로 복구
    setTimeout(() => {
        clickNoise.amp(0, 0.1);
    }, 300);
}


function mousePressed() {
    // **수정:** 1. 오디오 컨텍스트 활성화 시도
    attemptStartAudioContext();

    // 2. 인터랙션 로직
    if (touches.length === 0) {
        // 색상 파장 생성
        colorWave.x = mouseX;
        colorWave.y = mouseY;
        colorWave.newColor = random(PALETTE);
        colorWave.radius = 0;
        colorWave.active = true;

        // 효과음 재생
        playDigitalClick();
    }
}

function touchStarted() {
    // **수정:** 1. 오디오 컨텍스트 활성화 시도
    attemptStartAudioContext();

    // 2. 인터랙션 로직
    if (touches.length > 0) {
        colorWave.x = touches[0].x;
        colorWave.y = touches[0].y;
        colorWave.newColor = random(PALETTE);
        colorWave.radius = 0;
        colorWave.active = true;

        // 효과음 재생
        playDigitalClick();
    }
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    initializeCells();
}