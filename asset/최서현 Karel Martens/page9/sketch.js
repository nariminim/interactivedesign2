let bars = [];
let numBars = 40; // 막대 개수
let barWidth;
let barMaxHeight;

const PALETTE = [
    '#ff9d9dff',   // 밝은 빨강 (원색)
    '#ffed88ff',   // 금색 (밝은 노랑)
    '#63ffffff',   // 아쿠아 (밝은 청록)
    '#acffacff',   // 라임 (밝은 녹색)
    '#ffa5d2ff',   // 핫 핑크
    '#c990ffff',   // 블루 바이올렛 (밝은 보라)
    '#f2ffb2ff',   // 오렌지 레드
    '#dcffa7ff'    // 그린 옐로우
];

// 배경색 컨트롤을 위한 HSB 변수
let baseHue = 50;
const BASE_SATURATION = 5;
const BASE_BRIGHTNESS = 100;

class Bar {
    constructor(x, y, width, maxHeight, color) {
        this.x = x;
        this.y = y;
        this.initialY = y;
        this.width = width;
        this.maxHeight = maxHeight;
        this.targetHeight = maxHeight;
        this.currentHeight = maxHeight;
        this.color = color;
        this.lerpSpeed = 0.1;
        this.initialColor = color;

        // 미세 진동을 위한 속성
        this.noiseOffset = random(1000);
        this.vibrationMagnitude = random(0.5, 1.5);

        // 클릭 및 마우스 오버 파동 관리를 위한 변수
        this.originalTargetHeight = maxHeight;
        this.influenceStartTime = 0; // 마우스 오버/클릭 영향 시작 시간
        this.influenceDuration = 300; // 영향 유지 시간 (ms)
        this.influenceStrength = 0; // 영향력 (0~1)
    }

    // 마우스 오버 시 호출
    applyHoverInfluence(strength) {
        this.influenceStartTime = millis();
        this.influenceStrength = strength; // 마우스와 가까울수록 강한 영향
        this.targetHeight = this.originalTargetHeight * (1 - this.influenceStrength * 0.8); // 강도에 비례하여 짧아짐
    }

    // 클릭 시 호출
    applyClickInfluence(strength) {
        this.influenceStartTime = millis();
        this.influenceStrength = strength; // 클릭 시 강한 영향
        this.targetHeight = this.originalTargetHeight * (1 - this.influenceStrength * 0.9); // 더 크게 짧아짐
    }

    update() {
        // 영향력이 약해지는 시간 계산
        let timeElapsed = millis() - this.influenceStartTime;
        if (timeElapsed < this.influenceDuration) {
            // 시간이 지나면서 영향력 약화 (부드럽게 복구)
            let decayFactor = 1 - (timeElapsed / this.influenceDuration);
            this.currentHeight = lerp(this.currentHeight, this.originalTargetHeight * (1 - this.influenceStrength * decayFactor * 0.8), this.lerpSpeed);
        } else {
            // 영향력이 없으면 원래 높이로 돌아가거나 마우스 오버 효과 따름
            this.currentHeight = lerp(this.currentHeight, this.targetHeight, this.lerpSpeed);
        }

        // 미세 진동을 Y 위치에 적용 (항상 적용)
        let noiseVal = noise(this.noiseOffset, frameCount * 0.01);
        let vibeY = map(noiseVal, 0, 1, -this.vibrationMagnitude, this.vibrationMagnitude);

        this.y = this.initialY + (this.maxHeight - this.currentHeight) + vibeY;
    }

    display() {
        noStroke();

        let residualHeight = this.maxHeight - this.currentHeight;
        let residualY = this.initialY + this.currentHeight;

        let shadowAlpha = map(this.currentHeight, this.maxHeight * 0.2, this.maxHeight, 0.4, 0.0);
        let shadowColorWithAlpha = color(red(this.initialColor), green(this.initialColor), blue(this.initialColor), shadowAlpha * 255);

        fill(shadowColorWithAlpha);
        rect(this.x, residualY, this.width, residualHeight);

        // 2. 실제 막대 그리기
        fill(this.color);
        rect(this.x, this.y, this.width, this.currentHeight);
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 255);

    initializeBars();
    background(255);
}

function initializeBars() {
    bars = [];

    barWidth = width / numBars;
    barMaxHeight = height;

    for (let i = 0; i < numBars; i++) {
        let barX = i * barWidth;
        let randomColor = color(random(PALETTE));
        bars.push(new Bar(barX, 0, barWidth, barMaxHeight, randomColor));
    }
}

function draw() {
    // 마우스 위치에 따라 배경색 Hue값 제어 (색상 파동)
    baseHue = map(mouseX, 0, width, 0, 360);
    let currentBgColor = color(baseHue, BASE_SATURATION, BASE_BRIGHTNESS, 255);

    // 잔상 효과를 위한 반투명 배경
    background(hue(currentBgColor), saturation(currentBgColor), brightness(currentBgColor), 50);

    blendMode(MULTIPLY);

    // **수정:** 마우스 오버 시 주변 막대에도 파동 적용
    let hoveredBarIndex = floor(mouseX / barWidth);
    for (let i = 0; i < numBars; i++) {
        let bar = bars[i];
        let distance = abs(i - hoveredBarIndex); // 마우스와의 거리
        let influence = map(distance, 0, 5, 1, 0, true); // 최대 5개 막대까지 영향

        if (mouseY > 0 && mouseY < height) { // 마우스가 캔버스 안에 있을 때만 적용
            bar.applyHoverInfluence(influence);
        } else {
            bar.targetHeight = bar.originalTargetHeight; // 마우스가 벗어나면 원래 높이로
        }

        bar.update();
        bar.display();
    }

    blendMode(BLEND);
}

// ------------------- 사용자 입력 (클릭 충격파) -------------------

function mousePressed() {
    let clickedBarIndex = floor(mouseX / barWidth);
    if (clickedBarIndex >= 0 && clickedBarIndex < numBars) {
        // 클릭한 막대와 주변 막대에 강한 충격파 적용
        for (let i = 0; i < numBars; i++) {
            let bar = bars[i];
            let distance = abs(i - clickedBarIndex);
            let influence = map(distance, 0, 7, 1, 0, true); // 7개 막대까지 영향 (더 넓게)

            if (influence > 0) {
                bar.applyClickInfluence(influence);
            }
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    initializeBars();
}