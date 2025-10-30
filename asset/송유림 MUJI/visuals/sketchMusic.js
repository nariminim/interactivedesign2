// 음악+폭발 스케치 (이어듣기 지원)
import * as CDPlayer from "./cd-player.js";
import { eventToCanvasXY, updatePointerMap } from "./utils.js";

// === 전역 변수 (이 파일에서만 사용) ===
let angle = 0;
let rotationSpeed = 0;
let isPlaying = false;
let isDraggingHandle = false;
let lastPullStrength = 0;
let currentMusicPosition = 0; // 이어듣기용 현재 재생 위치
let bgSpeedFactor = 1.0;
let pointerX = -9999;
let pointerY = -9999;
let pointers = new Map();
let spheres = [];
let bgBuffer;
let cnv;
const blurAmount = 5;

// === Music (Tone.js 기반) ===
let player;
let isMusicPlaying = false;
let musicSpeed = 1.0;
let isToneStarted = false;

// === Sphere 클래스 (폭발/복귀 버전) ===
class Sphere {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    const minSize = Math.min(width, height) * 0.1;
    const maxSize = Math.min(width, height) * 0.3;
    this.r = random(minSize, maxSize);
    this.speedX = random(-0.3, 0.8);
    this.speedY = random(0, 0.8);

    // 폭발/복귀 상태
    this.isFrozen = false;
    this.freezeTimer = 0;
    this.explodeDir = createVector(0, 0);
    this.explodeDistance = 0;
    this.explodeProgress = 0;
    this.explodeDuration = 120;
    this.elasticAmp = 0.5;

    // 색상
    this.alpha = random(80, 150);
    this.baseColor = color(0, 40, 255, this.alpha);
    this.highlightColor = color(
      random(200, 255),
      random(0, 255),
      random(0, 255),
      this.alpha
    );
    this.currentColor = this.baseColor;
  }

  update() {
    if (this.isFrozen) {
      this.freezeTimer++;
      const t = this.freezeTimer / this.explodeDuration;

      if (t < 1) {
        if (t < 0.3) {
          const tt = map(t, 0, 0.3, 0, 1);
          this.explodeProgress = this.easeOutQuad(tt);
        } else {
          if (!this.springVel) this.springVel = 0;
          const stiffness = 0.05;
          const damping = 0.4;
          const target = 0;
          const displacement = this.explodeProgress - target;
          const acc = -stiffness * displacement - damping * this.springVel;
          this.springVel += acc;
          this.explodeProgress += this.springVel;
        }

        const phase = map(t, 0, 1, 0, 180);
        if (phase < 60)
          this.currentColor = lerpColor(
            this.currentColor,
            this.highlightColor,
            0.08
          );
        else
          this.currentColor = lerpColor(
            this.currentColor,
            this.baseColor,
            0.03
          );
      } else {
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.explodeProgress = 0;
        this.springVel = 0;
        this.currentColor = this.baseColor;
      }
    }

    // 기본 이동 적용 (음악 속도 반영)
    this.x += this.speedX * bgSpeedFactor;
    this.y += this.speedY * bgSpeedFactor;

    // 포인터 반응 (회피 + 밝기 변화)
    const dx = this.x - pointerX;
    const dy = this.y - pointerY;
    const distSq = dx * dx + dy * dy;
    const influenceRadius = 160;
    const maxDistSq = influenceRadius * influenceRadius;

    if (distSq < maxDistSq) {
      const dist = sqrt(distSq);
      const proximity = 1 - dist / influenceRadius;
      const force = proximity * 3.5;
      const dirX = dx / (dist + 0.001);
      const dirY = dy / (dist + 0.001);

      this.x += dirX * force;
      this.y += dirY * force;

      const glowStrength = pow(proximity, 2.0);
      const skyColor = color(173, 216, 230, this.alpha * 0.8);
      this.currentColor = lerpColor(
        this.currentColor,
        skyColor,
        0.08 * glowStrength
      );
    } else {
      this.currentColor = lerpColor(this.currentColor, this.baseColor, 0.03);
    }

    // 화면 경계 래핑
    if (this.x < -this.r) this.x = width + this.r;
    if (this.x > width + this.r) this.x = -this.r;
    if (this.y < -this.r) this.y = height + this.r;
    if (this.y > height + this.r) this.y = -this.r;
  }

  display(gfx = null) {
    const use = gfx || this;
    const ctx = gfx ? gfx.drawingContext : drawingContext;

    if (gfx) gfx.noStroke();
    else noStroke();

    const drawX =
      this.x + this.explodeDir.x * this.explodeDistance * this.explodeProgress;
    const drawY =
      this.y + this.explodeDir.y * this.explodeDistance * this.explodeProgress;

    const grad = ctx.createRadialGradient(
      drawX,
      drawY,
      this.r * 0.3,
      drawX,
      drawY,
      this.r * 1.6
    );
    const col = this.currentColor.levels;
    grad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.8)`);
    grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);

    ctx.fillStyle = grad;
    if (gfx) gfx.ellipse(drawX, drawY, this.r * 2);
    else ellipse(drawX, drawY, this.r * 2);
  }

  freeze(intensity = 1) {
    this.isFrozen = true;
    this.freezeTimer = 0;

    const dir = createVector(this.x - width / 2, this.y - height / 2);
    if (dir.magSq() < 1e-6) dir.set(1, 0);
    dir.normalize();
    this.explodeDir = dir;

    this.explodeDistance = map(
      intensity,
      0,
      20,
      0,
      min(max(width, height) * 1.5, 400)
    );

    this.explodeDuration = 270;
    this.elasticAmp = 0.9;
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  easeOutElastic(t, amp = 1.0) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    const base = pow(2, -8 * t) * sin((t * 10 - 0.75) * c4) + 1;
    return (1 - amp) * t + amp * base;
  }
}

// === Export 함수들 ===
export function setupSketch(p5) {
  // 성능 최적화된 픽셀 밀도 설정
  const ratio = window.devicePixelRatio;
  const targetDensity = constrain(ratio * 0.6, 1, 2);
  pixelDensity(targetDensity);

  cnv = p5.createCanvas(p5.windowWidth, p5.windowHeight);
  p5.angleMode(DEGREES);

  // CSS 비율 맞추기
  cnv.style("width", "100vw");
  cnv.style("height", "100vh");

  // GrainPlayer (이어듣기 지원)
  player = new Tone.GrainPlayer({
    url: "../../../src/music/bgm1.mp3",
    loop: true,
    autostart: false,
    grainSize: 0.12,
    overlap: 0.3,
  }).toDestination();

  player.onstop = () => {
    isMusicPlaying = false;
    console.log("Music stopped");
  };

  player.onload = () => {
    console.log("Music file loaded successfully");
  };

  player.onerror = (error) => {
    console.error("Music file loading error:", error);
  };

  spheres = [];
  for (let i = 0; i < 40; i++) spheres.push(new Sphere());

  bgBuffer = p5.createGraphics(p5.width * 0.4, p5.height * 0.4);
  bgBuffer.pixelDensity(1);
}

export function drawSketch(p5) {
  const targetFactor = map(musicSpeed, 0.5, 3.0, 0.7, 1.5);
  bgSpeedFactor = lerp(bgSpeedFactor, targetFactor, 0.05);

  p5.background(255);

  for (let s of spheres) {
    s.update();
    s.display();
  }

  bgBuffer.clear();
  bgBuffer.background(255);
  for (let s of spheres) s.display(bgBuffer);
  bgBuffer.filter(BLUR, blurAmount);

  // Update physics
  CDPlayer.updatePhysics();

  // Use CD Player component
  CDPlayer.drawDevice({
    cx: p5.width / 2,
    cy: p5.height / 2,
    ringSize: 120,
    angleDeg: angle,
    bgBuffer: bgBuffer,
    handleSize: 20,
  });

  if (isPlaying) angle += rotationSpeed * (0.8 + 0.2 * bgSpeedFactor);
}

export function resizeSketch(p5) {
  p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  bgBuffer = p5.createGraphics(p5.width * 0.4, p5.height * 0.4);
  bgBuffer.pixelDensity(1);

  cnv.style("width", "100vw");
  cnv.style("height", "100vh");

  spheres = [];
  for (let i = 0; i < 40; i++) spheres.push(new Sphere());
}

export function onPointerDown(e) {
  const { x, y } = eventToCanvasXY(e, cnv, window.p5);
  updatePointerMap(e, pointers, cnv, window.p5);

  // Tone.js 시작
  if (!isToneStarted) {
    Tone.start()
      .then(() => {
        isToneStarted = true;
        if (player) {
          player.load().catch((err) => {
            console.error("Failed to preload music file:", err);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to start Tone.js:", err);
      });
  }

  const handle = CDPlayer.getHandle();
  const anchor = CDPlayer.getAnchor();

  if (!handle || !anchor) return;

  // 중앙 클릭 (정지 버튼)
  const d = dist(x, y, width / 2, height / 2);
  if (d < 50) {
    isPlaying = false;

    if (player && isMusicPlaying) {
      currentMusicPosition = player.toSeconds(player.position);
      player.stop();
      isMusicPlaying = false;
    }

    const intensity = constrain(map(lastPullStrength, 0, 300, 0, 20), 0, 20);
    for (let s of spheres) s.freeze(intensity);

    rotationSpeed = 0;
    lastPullStrength = 0;
    return;
  }

  // 손잡이 드래그 감지
  const dh = dist(x, y, handle.position.x, handle.position.y);
  if (dh < 80) {
    isDraggingHandle = true;
    if (pointers.has(e.pointerId)) {
      const pointer = pointers.get(e.pointerId);
      pointer.isDraggingHandle = true;
      pointers.set(e.pointerId, pointer);
    }
  }
}

export function onPointerMove(e) {
  const { x, y } = eventToCanvasXY(e, cnv, window.p5);
  updatePointerMap(e, pointers, cnv, window.p5);

  pointerX = x;
  pointerY = y;

  if (isDraggingHandle) {
    CDPlayer.handlePointerMove(x, y);
  }
}

export function onPointerUp(e) {
  const { x, y } = eventToCanvasXY(e, cnv, window.p5);
  updatePointerMap(e, pointers, cnv, window.p5);

  if (!isDraggingHandle) {
    if (pointers.size === 0) {
      pointerX = -9999;
      pointerY = -9999;
    }
    return;
  }

  const handle = CDPlayer.getHandle();
  const anchor = CDPlayer.getAnchor();

  if (handle && anchor) {
    const pull = dist(anchor.x, anchor.y, handle.position.x, handle.position.y);
    const pullDistance = Math.max(0, pull - 100);
    lastPullStrength = pullDistance;

    if (pullDistance > 10) {
      rotationSpeed = map(pullDistance, 0, 150, 1, 15);
      isPlaying = true;

      musicSpeed = map(pullDistance, 10, 300, 0.5, 3.0);
      musicSpeed = constrain(musicSpeed, 0.5, 3.0);
      musicSpeed = round(musicSpeed * 100) / 100;

      if (player) {
        if (player.loaded) {
          if (!isMusicPlaying) {
            try {
              // 이어듣기: 저장된 위치에서 시작
              player.start(undefined, currentMusicPosition);
              isMusicPlaying = true;
              console.log("Music started from position:", currentMusicPosition);
            } catch (error) {
              console.error("Error starting music:", error);
            }
          }

          try {
            player.playbackRate = musicSpeed;
            console.log("Music speed set to:", musicSpeed);
          } catch (error) {
            console.error("Error setting playback rate:", error);
          }
        } else {
          player
            .load()
            .then(() => {
              if (!isMusicPlaying) {
                try {
                  player.start(undefined, currentMusicPosition);
                  isMusicPlaying = true;
                  console.log(
                    "Music started after loading from position:",
                    currentMusicPosition
                  );
                } catch (error) {
                  console.error("Error starting music after load:", error);
                }
              }
              try {
                player.playbackRate = musicSpeed;
                console.log("Music speed set to:", musicSpeed);
              } catch (error) {
                console.error("Error setting playback rate after load:", error);
              }
            })
            .catch((err) => {
              console.error("Failed to load music file:", err);
            });
        }
      }
    }
  }

  isDraggingHandle = false;

  if (pointers.size === 0) {
    pointerX = -9999;
    pointerY = -9999;
  }
}
