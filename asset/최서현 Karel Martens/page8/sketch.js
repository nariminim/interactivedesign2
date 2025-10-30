// 이미지에서 추출한 선명한 색상 팔레트
const PALETTE = {
    BLUE: '#00BFFF',
    YELLOW: '#FFD700',
    GREEN: '#32CD32',
    BACKGROUND: '#FFFFFF'
};

// 동적 계산을 위한 기본 값
let GRID_CELL_SIZE = 40;
const TARGET_ROWS = 25;
const TARGET_COLS = 25;

let modules = [];

let noisePool = [];
const POOL_SIZE = 5;
let audioContextStarted = false;

let mouseInfluenceX = 0;
let mouseInfluenceY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let colorWaveOrigin = { x: -999, y: -999, color: PALETTE.BACKGROUND, radius: 0 };

class GridModule {
    constructor(gridX, gridY, type) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = this.gridX * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
        this.y = this.gridY * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;

        this.initialType = type;
        this.currentType = type;

        this.color = this.getRandomColor(gridY);
        this.initialColor = this.color;

        this.morphState = 0;
        this.targetMorphState = 0;
        this.morphSpeed = 0.15;

        this.currentColor = this.color;
        this.targetColor = this.color;
        this.colorTransitionSpeed = 0.2;

        this.waveOffset = random(TWO_PI);
        this.rotationDirection = random([-1, 1]);
    }

    getRandomColor(row) {
        if (row % 3 === 0) return PALETTE.BLUE;
        if (row % 3 === 1) return PALETTE.YELLOW;
        return PALETTE.GREEN;
    }

    update(currentMouseX, currentMouseY) {
        let d = dist(this.x, this.y, currentMouseX, currentMouseY);
        let influenceRadius = 150;

        let normalizedDistance = constrain(d / influenceRadius, 0, 1);
        this.targetMorphState = 1 - normalizedDistance;

        let colorWaveDist = dist(this.x, this.y, colorWaveOrigin.x, colorWaveOrigin.y);
        if (colorWaveDist < colorWaveOrigin.radius) {
            this.targetColor = colorWaveOrigin.color;
        } else {
            this.targetColor = this.initialColor;
        }

        let waveEffect = sin(frameCount * 0.05 + this.waveOffset) * 0.1;
        let currentMorphSpeed = map(d, 0, influenceRadius, 0.2, this.morphSpeed, true);

        this.morphState = lerp(this.morphState, this.targetMorphState + waveEffect, currentMorphSpeed);
        this.morphState = constrain(this.morphState, 0, 1);

        this.currentColor = lerpColor(color(this.currentColor), color(this.targetColor), this.colorTransitionSpeed);
    }

    display() {
        push();
        translate(this.x, this.y);
        fill(this.currentColor);
        noStroke();

        const adjustedModuleSize = GRID_CELL_SIZE * 1.0;

        // 형태 변형 그리기
        if (this.morphState <= 0.5) {
            // 점으로 변형 중이거나 점일 때
            let currentSize = map(this.morphState, 0, 0.5, adjustedModuleSize, 0);
            ellipse(0, 0, currentSize, currentSize);
        } else {
            // 선으로 변형 중이거나 선일 때
            let maxLineLength = GRID_CELL_SIZE * 1.2;
            let lineLength = map(this.morphState, 0.5, 1, 0, maxLineLength);

            const lineThickness = GRID_CELL_SIZE / 3;

            rotate(PI / 4 * this.rotationDirection);
            rectMode(CENTER);
            rect(0, 0, lineLength, lineThickness);
        }

        pop();
    }
}

function initializeGridAndAudio() {

    GRID_CELL_SIZE = min(width / TARGET_COLS, height / TARGET_ROWS);

    // 2. 모듈 초기화
    modules = [];
    const numCols = ceil(width / GRID_CELL_SIZE);
    const numRows = ceil(height / GRID_CELL_SIZE);

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            let type = (r % 2 === 0) ? 'DIAG_LINE' : 'DOT';
            modules.push(new GridModule(c, r, type));
        }
    }

    if (noisePool.length === 0) {
        for (let i = 0; i < POOL_SIZE; i++) {
            let noise = new p5.Noise('white');
            let env = new p5.Env();
            env.setADSR(0.001, 0.05, 0.0, 0.1);
            noise.amp(env);
            noise.start();
            noisePool.push({ noise: noise, env: env, playing: false });
        }
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(PALETTE.BACKGROUND);

    initializeGridAndAudio();
}

function draw() {
    background(PALETTE.BACKGROUND);

    colorWaveOrigin.radius += 10;
    if (colorWaveOrigin.radius > max(width, height) * 1.5) {
        colorWaveOrigin.x = -999;
        colorWaveOrigin.y = -999;
        colorWaveOrigin.radius = 0;
    }

    for (let module of modules) {
        // 마우스가 움직일 때만 현재 마우스 위치 사용
        let mx = mouseIsPressed || mouseX != lastMouseX || mouseY != lastMouseY ? mouseX : lastMouseX;
        let my = mouseIsPressed || mouseX != lastMouseX || mouseY != lastMouseY ? mouseY : lastMouseY;
        module.update(mx, my);
        module.display();
    }

    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function attemptStartAudioContext() {
    if (audioContextStarted) return;

    if (getAudioContext().state !== 'running') {
        getAudioContext().resume().then(() => {
            audioContextStarted = true;
        });
    } else {
        audioContextStarted = true;
    }
}

function playDigitalClick() {
    if (!audioContextStarted) return;

    let availableNoise = noisePool.find(n => n.playing === false);

    if (availableNoise) {
        availableNoise.playing = true;

        availableNoise.noise.amp(0.1, 0.01);
        availableNoise.env.play(availableNoise.noise, 0, 0.5);

        let totalDuration = 0.001 + 0.05 + 0.1;
        setTimeout(() => {
            availableNoise.playing = false;
            availableNoise.noise.amp(0.0, 0.01);
        }, totalDuration * 1000);
    }
}

function mousePressed() {
    attemptStartAudioContext();
    if (touches.length === 0) {
        playDigitalClick();
        colorWaveOrigin.x = mouseX;
        colorWaveOrigin.y = mouseY;
        colorWaveOrigin.color = random([PALETTE.BLUE, PALETTE.YELLOW, PALETTE.GREEN]);
        colorWaveOrigin.radius = 0;
    }
}

function touchStarted() {
    attemptStartAudioContext();
    if (touches.length > 0) {
        playDigitalClick();
        colorWaveOrigin.x = touches[0].x;
        colorWaveOrigin.y = touches[0].y;
        colorWaveOrigin.color = random([PALETTE.BLUE, PALETTE.YELLOW, PALETTE.GREEN]);
        colorWaveOrigin.radius = 0;
    }
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    initializeGridAndAudio();
}