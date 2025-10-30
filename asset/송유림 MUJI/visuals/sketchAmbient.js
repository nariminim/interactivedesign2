// 무음·색상 상태기계 스케치
import * as CDPlayer from "./cd-player.js";
import { eventToCanvasXY, updatePointerMap } from "./utils.js";

// === 전역 변수 (이 파일에서만 사용) ===
let angle = 0;
let rotationSpeed = 0;
let isPlaying = false;
let isDraggingHandle = false;
let lastPullStrength = 0;
let isStopping = false;
let stopTimer = 0;

// 실제 손잡이 움직임 감지용 변수들
let lastHandlePosition = { x: 0, y: 0 };
let handleMovementThreshold = 15;
let hasHandleMoved = false;

let ambientColorPhase = 0; // 0=초록,1=노랑,2=하양,3=하늘
let ambientColorTimer = 0;
let ambientColorFade = 0;
let ambientBgSpeedFactor = 1.0;

let ambientPointerX = -9999;
let ambientPointerY = -9999;
let ambientPointers = new Map();

// === Graphics ===
let ambientCnv;
let ambientBgBuffer;
const ambientBlurAmount = 5;

// === Floating Particles ===
let ambientSpheres = [];

class AmbientSphere {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    const minSize = Math.min(width, height) * 0.05;
    const maxSize = Math.min(width, height) * 0.15;
    this.r = random(minSize, maxSize);
    this.speedX = random(-0.3, 0.3);
    this.speedY = random(-0.2, 0.2);
    this.alpha = random(60, 120);

    // 상태별 색상 팔레트
    this.darkColor = color(
      random(40, 100),
      random(60, 120),
      random(120, 160),
      this.alpha
    );
    this.lightColor = color(
      random(180, 255),
      random(230, 255),
      random(250, 255),
      100
    );
    this.glowColor = color(200, 250, 255, this.alpha * 0.8);

    this.currentColor = this.darkColor;
    this.targetColor = this.darkColor;
  }

  update() {
    // 이동
    this.x += this.speedX * ambientBgSpeedFactor;
    this.y += this.speedY * ambientBgSpeedFactor;

    // 포인터 감응 (다중 포인터 지원)
    let isInfluenced = false;
    let totalForceX = 0;
    let totalForceY = 0;
    let maxGlowStrength = 0;

    for (let pointer of ambientPointers.values()) {
      const dx = this.x - pointer.x;
      const dy = this.y - pointer.y;
      const distSq = dx * dx + dy * dy;
      const influenceRadius = 200;
      const maxDistSq = influenceRadius * influenceRadius;

      if (distSq < maxDistSq) {
        isInfluenced = true;
        const dist = sqrt(distSq);
        const proximity = 1 - dist / influenceRadius;
        const glowStrength = pow(proximity, 1.5);

        if (glowStrength > maxGlowStrength) {
          maxGlowStrength = glowStrength;
        }

        const force = proximity * 8;
        const dirX = dx / (dist + 0.001);
        const dirY = dy / (dist + 0.001);
        totalForceX += dirX * force;
        totalForceY += dirY * force;
      }
    }

    if (isInfluenced) {
      this.currentColor = lerpColor(
        this.currentColor,
        this.glowColor,
        0.15 * maxGlowStrength
      );

      this.x += totalForceX;
      this.y += totalForceY;
    } else {
      // 상태별 전환
      if (isPlaying) {
        this.targetColor = this.lightColor;
        this.currentColor = lerpColor(
          this.currentColor,
          this.targetColor,
          0.04
        );
        this.alpha = lerp(this.alpha, 60, 0.03);
        this.r = lerp(this.r, 90, 0.03);
      } else if (isStopping) {
        this.targetColor = this.darkColor;
        this.currentColor = lerpColor(
          this.currentColor,
          this.targetColor,
          0.06
        );
        this.alpha = lerp(this.alpha, 120, 0.05);
        this.r = lerp(this.r, 60, 0.05);
      } else {
        this.targetColor = this.darkColor;
        this.currentColor = lerpColor(
          this.currentColor,
          this.targetColor,
          0.03
        );
        this.alpha = lerp(this.alpha, 120, 0.03);
        this.r = lerp(this.r, 60, 0.03);
      }
    }

    // 화면 순환
    if (this.x < -this.r) this.x = width + this.r;
    if (this.x > width + this.r) this.x = -this.r;
    if (this.y < -this.r) this.y = height + this.r;
    if (this.y > height + this.r) this.y = -this.r;
  }

  display(gfx = null) {
    const ctx = gfx ? gfx.drawingContext : drawingContext;
    const grad = ctx.createRadialGradient(
      this.x,
      this.y,
      this.r * 0.2,
      this.x,
      this.y,
      this.r * 1.8
    );
    const col = this.currentColor.levels;
    grad.addColorStop(
      0,
      `rgba(${col[0]},${col[1]},${col[2]},${this.alpha / 255})`
    );
    grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = grad;
    if (gfx) gfx.ellipse(this.x, this.y, this.r * 2);
    else ellipse(this.x, this.y, this.r * 2);
  }
}

// === Export 함수들 ===
export function setupSketch(p5) {
  const ratio = window.devicePixelRatio;
  const targetDensity = constrain(ratio * 0.6, 1, 2);
  pixelDensity(targetDensity);

  ambientCnv = p5.createCanvas(p5.windowWidth, p5.windowHeight);
  p5.angleMode(DEGREES);

  ambientCnv.style("width", "100vw");
  ambientCnv.style("height", "auto");

  ambientBgBuffer = p5.createGraphics(p5.width * 0.4, p5.height * 0.4);
  ambientBgBuffer.pixelDensity(1);

  ambientSpheres = [];
  for (let i = 0; i < 40; i++) ambientSpheres.push(new AmbientSphere());
}

export function drawSketch(p5) {
  if (isPlaying) {
    ambientColorFade = lerp(ambientColorFade, 1, 0.04);
    ambientColorTimer++;
    isStopping = false;
    stopTimer = 0;
  } else if (isStopping) {
    stopTimer++;
    const stopDuration = 90;
    const stopProgress = min(stopTimer / stopDuration, 1);

    rotationSpeed = lerp(rotationSpeed, 0, 0.08);
    ambientColorFade = lerp(ambientColorFade, 0, 0.05);

    if (stopProgress >= 1 && rotationSpeed < 0.1) {
      isStopping = false;
      rotationSpeed = 0;
      stopTimer = 0;
      ambientColorFade = 0;
      ambientColorPhase = 0;
    }
  } else {
    ambientColorFade = lerp(ambientColorFade, 0, 0.02);
    rotationSpeed = lerp(rotationSpeed, 0, 0.05);
  }

  const bgCtx = drawingContext;
  const bgGrad = bgCtx.createRadialGradient(
    p5.width / 2,
    p5.height / 2,
    0,
    p5.width / 2,
    p5.height / 2,
    max(p5.width, p5.height) * 0.8
  );
  bgGrad.addColorStop(0, "rgba(0,0,0,0.85)");
  bgGrad.addColorStop(1, "rgba(20,20,20,0.35)");
  bgCtx.fillStyle = bgGrad;
  bgCtx.fillRect(0, 0, p5.width, p5.height);

  const mainGrad = bgCtx.createRadialGradient(
    p5.width / 2,
    p5.height / 2,
    0,
    p5.width / 2,
    p5.height / 2,
    p5.width * 0.9
  );
  let c1, c2;
  if (ambientColorPhase === 0) {
    c1 = color(150, 255, 200, 120 * ambientColorFade);
    c2 = color(255, 255, 200, 40 * ambientColorFade);
  } else if (ambientColorPhase === 1) {
    c1 = color(255, 240, 150, 130 * ambientColorFade);
    c2 = color(255, 200, 180, 35 * ambientColorFade);
  } else if (ambientColorPhase === 2) {
    c1 = color(255, 255, 255, 100 * ambientColorFade);
    c2 = color(240, 240, 255, 35 * ambientColorFade);
  } else {
    c1 = color(173, 216, 230, 120 * ambientColorFade);
    c2 = color(255, 240, 180, 30 * ambientColorFade);
  }
  mainGrad.addColorStop(0, c1.toString());
  mainGrad.addColorStop(1, c2.toString());
  bgCtx.fillStyle = mainGrad;
  bgCtx.fillRect(0, 0, p5.width, p5.height);

  if (isPlaying && ambientColorFade > 0.3) {
    const layers = 5;
    const baseRadius = 250;
    const spread = 400;
    for (let i = 0; i < layers; i++) {
      const ang = (ambientColorTimer * 0.3 + i * (360 / layers)) % 360;
      const radius =
        baseRadius + sin(ambientColorTimer * 0.015 + i) * spread * 0.4;
      const x = p5.width / 2 + cos(ang) * radius;
      const y = p5.height / 2 + sin(ang) * radius;

      const circleGrad = bgCtx.createRadialGradient(x, y, 0, x, y, 200);
      let circleColor1, circleColor2;
      if (ambientColorPhase === 0) {
        circleColor1 = `rgba(150,255,180,${0.15 * ambientColorFade})`;
        circleColor2 = `rgba(255,255,180,${0.12 * ambientColorFade})`;
      } else if (ambientColorPhase === 1) {
        circleColor1 = `rgba(255,220,120,${0.18 * ambientColorFade})`;
        circleColor2 = `rgba(255,180,200,${0.12 * ambientColorFade})`;
      } else if (ambientColorPhase === 2) {
        circleColor1 = `rgba(240,250,255,${0.15 * ambientColorFade})`;
        circleColor2 = `rgba(255,240,180,${0.1 * ambientColorFade})`;
      } else {
        circleColor1 = `rgba(180,210,255,${0.15 * ambientColorFade})`;
        circleColor2 = `rgba(255,230,160,${0.1 * ambientColorFade})`;
      }
      circleGrad.addColorStop(0, circleColor1);
      circleGrad.addColorStop(0.5, circleColor2);
      circleGrad.addColorStop(1, "rgba(255,255,255,0)");
      bgCtx.fillStyle = circleGrad;
      bgCtx.beginPath();
      bgCtx.ellipse(x, y, 400, 400, 0, 0, 2 * Math.PI);
      bgCtx.fill();
    }
  }

  for (let s of ambientSpheres) {
    s.update();
    s.display();
  }

  ambientBgBuffer.clear();
  for (let s of ambientSpheres) s.display(ambientBgBuffer);
  ambientBgBuffer.filter(BLUR, ambientBlurAmount);

  CDPlayer.updatePhysics();

  CDPlayer.drawDevice({
    cx: p5.width / 2,
    cy: p5.height / 2,
    ringSize: 120,
    angleDeg: angle,
    bgBuffer: ambientBgBuffer,
    handleSize: 20,
  });

  if (isPlaying || isStopping) {
    angle += rotationSpeed * 0.8;
  }
}

export function resizeSketch(p5) {
  p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  ambientBgBuffer = p5.createGraphics(p5.width * 0.4, p5.height * 0.4);
  ambientBgBuffer.pixelDensity(1);

  ambientCnv.style("width", "100vw");
  ambientCnv.style("height", "auto");

  ambientSpheres = [];
  for (let i = 0; i < 40; i++) ambientSpheres.push(new AmbientSphere());
}

export function onPointerDown(e) {
  const { x, y } = eventToCanvasXY(e, ambientCnv, window.p5);
  updatePointerMap(e, ambientPointers, ambientCnv, window.p5);

  // 중앙 클릭 (정지 버튼)
  const d = dist(x, y, width / 2, height / 2);
  if (d < 30) {
    if (lastPullStrength <= 0.5) return;
    isPlaying = false;
    isStopping = true;
    stopTimer = 0;
    lastPullStrength = 0;
    e.preventDefault();
    return;
  }

  // 손잡이 거리 측정
  const handle = CDPlayer.getHandle();
  if (!handle) return;

  const distToHandle = dist(x, y, handle.position.x, handle.position.y);
  if (distToHandle < 30) {
    lastHandlePosition.x = handle.position.x;
    lastHandlePosition.y = handle.position.y;
    hasHandleMoved = false;

    if (ambientPointers.has(e.pointerId)) {
      const pointer = ambientPointers.get(e.pointerId);
      pointer.isDraggingHandle = false;
      ambientPointers.set(e.pointerId, pointer);
    }

    CDPlayer.handlePointerDown(x, y);
  }
}

export function onPointerMove(e) {
  const { x, y } = eventToCanvasXY(e, ambientCnv, window.p5);
  updatePointerMap(e, ambientPointers, ambientCnv, window.p5);

  if (ambientPointers.has(e.pointerId)) {
    const pointer = ambientPointers.get(e.pointerId);

    // 실제 손잡이 움직임 감지
    if (!hasHandleMoved && !isDraggingHandle) {
      const handle = CDPlayer.getHandle();
      if (handle) {
        const handleMovement = dist(
          handle.position.x,
          handle.position.y,
          lastHandlePosition.x,
          lastHandlePosition.y
        );

        if (handleMovement > handleMovementThreshold) {
          hasHandleMoved = true;
          isDraggingHandle = true;
          pointer.isDraggingHandle = true;
        }
      }
    }

    pointer.x = x;
    pointer.y = y;
    ambientPointers.set(e.pointerId, pointer);
  }

  ambientPointerX = x;
  ambientPointerY = y;

  if (isDraggingHandle) {
    CDPlayer.handlePointerMove(x, y);
  }
}

export function onPointerUp(e) {
  const { x, y } = eventToCanvasXY(e, ambientCnv, window.p5);
  updatePointerMap(e, ambientPointers, ambientCnv, window.p5);

  if (!isDraggingHandle || !hasHandleMoved) {
    if (ambientPointers.size === 0) {
      ambientPointerX = -9999;
      ambientPointerY = -9999;
    }
    return;
  }

  const handle = CDPlayer.getHandle();
  const anchor = CDPlayer.getAnchor();

  const pull = dist(anchor.x, anchor.y, handle.position.x, handle.position.y);
  lastPullStrength = pull;

  if (pull > 10) {
    rotationSpeed = map(pull, 0, 150, 1, 15);
    isPlaying = true;

    ambientColorPhase = floor(random(4));
    ambientColorTimer = 0;
  }

  isDraggingHandle = false;
  hasHandleMoved = false;

  if (ambientPointers.size === 0) {
    ambientPointerX = -9999;
    ambientPointerY = -9999;
  }

  CDPlayer.handlePointerUp(x, y);
}
