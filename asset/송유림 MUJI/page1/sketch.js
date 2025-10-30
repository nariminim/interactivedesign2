// Page 1: Music Player with Floating Spheres

let angle = 0;
let rotationSpeed = 0;
let isPlaying = false;
let isDraggingHandle = false;
let lastPullStrength = 0;
let currentMusicPosition = 0;
let bgSpeedFactor = 1.0;
let pointerX = -9999;
let pointerY = -9999;
let pointers = new Map();

// Music
let player;
let isMusicPlaying = false;
let musicSpeed = 1.0;
let isToneStarted = false;

// Graphics
let bgBuffer;
let cnv;

// Floating Spheres
let spheres = [];

// === Drum (Tone.js Sampler) & Background flash ===
let drumSampler;
let drumColors = {
  kick: null, // set in setup when p5 color() is ready
  snare: null,
  hihat: null,
};
let bgFlashColor = null;
let bgFlashTimer = 0;

function preload() {
  // Tone.js Sampler with free drum samples
  if (typeof Tone !== "undefined" && Tone.Sampler) {
    drumSampler = new Tone.Sampler({
      urls: {
        C1: "kick.mp3",
        D1: "snare.mp3",
        E1: "hihat.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/drum-samples/breakbeat8/",
    }).toDestination();
  }
}

class Sphere {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    const minSize = Math.min(width, height) * 0.1;
    const maxSize = Math.min(width, height) * 0.3;
    this.r = random(minSize, maxSize);
    this.speedX = random(-0.3, 0.8);
    this.speedY = random(0, 0.8);
    this.isFrozen = false;
    this.freezeTimer = 0;
    this.explodeDir = createVector(0, 0);
    this.explodeDistance = 0;
    this.explodeProgress = 0;
    this.explodeDuration = 270;
    this.elasticAmp = 0.9;
    this.alpha = random(80, 150);

    // 초기 파란 계열 색상
    const blueRGBs = [
      [100, 150, 200], // 하늘색
      [70, 130, 180], // 스틸 블루
      [65, 105, 225], // 로열 블루
      [135, 206, 250], // 라이트 스카이 블루
      [0, 191, 255], // 딥 스카이 블루
      [72, 209, 204], // 미디엄 터코이즈
    ];
    const [br, bg, bb] = random(blueRGBs);
    this.initialColor = color(br, bg, bb, this.alpha);

    // 노래 재생 시 파스텔 톤 색상
    const pastelRGB = [
      [255, 183, 197], // pink
      [255, 255, 204], // light yellow
      [179, 205, 224], // light blue
      [204, 213, 174], // mint
      [252, 213, 206], // peach
      [221, 198, 255], // lavender
    ];
    const [pr, pg, pb] = random(pastelRGB);
    this.pastelColor = color(pr, pg, pb, this.alpha);

    this.baseColor = this.initialColor;
    this.highlightColor = lerpColor(
      this.baseColor,
      color(255, 255, 255, this.alpha),
      0.35
    );
    this.currentColor = this.baseColor;
  }
  hit() {
    if (!drumSampler) return;
    const keys = ["C1", "D1", "E1"];
    const sound = random(keys);
    try {
      drumSampler.triggerAttackRelease(sound, "8n");
    } catch (err) {
      // ignore runtime audio errors gracefully
    }
    if (sound === "C1") bgFlashColor = drumColors.kick;
    else if (sound === "D1") bgFlashColor = drumColors.snare;
    else bgFlashColor = drumColors.hihat;
    bgFlashTimer = 1.0;
    this.currentColor = lerpColor(this.currentColor, color(255), 0.5);
  }
  update() {
    // 노래 재생 상태에 따라 baseColor 결정
    if (isMusicPlaying) {
      this.baseColor = lerpColor(this.baseColor, this.pastelColor, 0.05);
    } else {
      this.baseColor = lerpColor(this.baseColor, this.initialColor, 0.05);
    }

    // baseColor가 변경되면 highlightColor도 업데이트
    this.highlightColor = lerpColor(
      this.baseColor,
      color(255, 255, 255, this.alpha),
      0.35
    );

    if (this.isFrozen) {
      this.freezeTimer++;
      const t = this.freezeTimer / this.explodeDuration;
      if (t < 1) {
        if (t < 0.3) {
          const tt = map(t, 0, 0.3, 0, 1);
          this.explodeProgress = tt * (2 - tt); // easeOutQuad
        } else {
          if (!this.springVel) this.springVel = 0;
          const stiffness = 0.05,
            damping = 0.4;
          const target = 0;
          const disp = this.explodeProgress - target;
          const acc = -stiffness * disp - damping * this.springVel;
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
    this.x += this.speedX * bgSpeedFactor;
    this.y += this.speedY * bgSpeedFactor;

    // pointer reaction
    const dx = this.x - pointerX,
      dy = this.y - pointerY;
    const distSq = dx * dx + dy * dy;
    const influenceRadius = 160;
    const maxDistSq = influenceRadius * influenceRadius;
    if (distSq < maxDistSq) {
      const dist = sqrt(distSq);
      const proximity = 1 - dist / influenceRadius;
      const force = proximity * 3.5;
      const dirX = dx / (dist + 1e-3);
      const dirY = dy / (dist + 1e-3);
      this.x += dirX * force;
      this.y += dirY * force;
      const sky = color(173, 216, 230, this.alpha * 0.8);
      this.currentColor = lerpColor(
        this.currentColor,
        sky,
        0.08 * proximity * proximity
      );
    } else {
      this.currentColor = lerpColor(this.currentColor, this.baseColor, 0.03);
    }

    // wrap
    if (this.x < -this.r) this.x = width + this.r;
    if (this.x > width + this.r) this.x = -this.r;
    if (this.y < -this.r) this.y = height + this.r;
    if (this.y > height + this.r) this.y = -this.r;
  }
  display(gfx = null) {
    const ctx = gfx ? gfx.drawingContext : drawingContext;

    // ★ p5 스타일 리셋 방지: p5의 fill/noStroke에 의존하지 않고 직접 그리기
    const drawX =
      this.x + this.explodeDir.x * this.explodeDistance * this.explodeProgress;
    const drawY =
      this.y + this.explodeDir.y * this.explodeDistance * this.explodeProgress;

    const col = this.currentColor.levels;
    const grad = ctx.createRadialGradient(
      drawX,
      drawY,
      this.r * 0.3,
      drawX,
      drawY,
      this.r * 1.6
    );
    grad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.8)`);
    grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(drawX, drawY, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
  }
}

function setup() {
  // 픽셀밀도 최적화
  const ratio = window.devicePixelRatio || 1;
  pixelDensity(constrain(ratio * 0.6, 1, 2));

  cnv = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  cnv.style("width", "100vw");
  cnv.style("height", "100vh");

  // initialize drum reaction colors (after p5 is ready)
  drumColors.kick = color(180, 120, 255, 60);
  drumColors.snare = color(255, 180, 240, 60);
  drumColors.hihat = color(255, 240, 150, 60);

  // 음악
  player = new Tone.GrainPlayer({
    url: "../../../src/music/bgm1.mp3",
    loop: true,
    autostart: false,
    grainSize: 0.12,
    overlap: 0.3,
  }).toDestination();

  player.onstop = () => {
    isMusicPlaying = false;
  };
  player.onload = () => {
    console.log("✅ Music fully loaded");
  };

  // 배경 버퍼 + 구슬
  bgBuffer = createGraphics(width, height);
  bgBuffer.pixelDensity(1);
  spheres = [];
  // 성능 최적화: 구슬 개수 줄이기 (40 → 20)
  for (let i = 0; i < 20; i++) spheres.push(new Sphere());

  // CDPlayer 물리 초기화 (반드시 라이브러리 로드 후)
  if (window.CDPlayer && CDPlayer.initializePhysics) {
    CDPlayer.initializePhysics();
    // 내부(p5) 토글 숨기기, CSS 토글 사용
    if (CDPlayer.setOpacityControlEnabled) {
      CDPlayer.setOpacityControlEnabled(false);
    }
  } else {
    console.error("CDPlayer not loaded yet!");
  }

  // 포인터 이벤트 (p5 이벤트 대신 DOM pointer 사용)
  cnv.elt.addEventListener("pointerdown", onPointerDown);
  cnv.elt.addEventListener("pointermove", onPointerMove);
  cnv.elt.addEventListener("pointerup", onPointerUp);
  cnv.elt.addEventListener("pointercancel", onPointerUp);

  // CSS 토글 DOM과 연동
  const toggle = document.getElementById("opacityToggle");
  const knob = document.getElementById("opacityKnob");
  if (toggle && knob && window.CDPlayer) {
    const knobTravel = 56 - 22; // barWidth - barHeight
    const applyKnob = () => {
      const v = CDPlayer.getOpacity ? CDPlayer.getOpacity() : 0;
      const t = v > 0.5 ? 1 : 0;
      knob.style.transform = `translateX(${t * knobTravel}px)`;
    };
    applyKnob();

    const toggleOnce = () => {
      const v = CDPlayer.getOpacity ? CDPlayer.getOpacity() : 0;
      const nv = v > 0.5 ? 0 : 1;
      if (CDPlayer.setOpacity) CDPlayer.setOpacity(nv);
      applyKnob();
    };

    toggle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleOnce();
    });
  }

  // 첫 클릭 시 Tone.js 초기화 (브라우저 오디오 정책 준수)
  window.addEventListener(
    "pointerdown",
    async () => {
      if (!isToneStarted) {
        await ensureToneStarted();
      }
    },
    { once: true }
  );
}

function draw() {
  const targetFactor = map(musicSpeed, 0.5, 3.0, 0.7, 1.5);
  bgSpeedFactor = lerp(bgSpeedFactor, targetFactor, 0.05);

  // 성능 최적화: filter(BLUR) 대신 저가형 잔상 효과
  background(255, 30);

  // 배경 색상 플래시 오버레이
  if (bgFlashTimer > 0 && bgFlashColor) {
    bgFlashTimer *= 0.9;
    const c = bgFlashColor.levels;
    noStroke();
    fill(c[0], c[1], c[2], 120 * bgFlashTimer);
    rect(0, 0, width, height);
  }

  for (const s of spheres) {
    s.update();
    s.display();
  }

  // 안전하게 CDPlayer 호출
  if (window.CDPlayer && CDPlayer.updatePhysics && CDPlayer.drawDevice) {
    CDPlayer.updatePhysics();
    CDPlayer.drawDevice({
      cx: width / 2,
      cy: height / 2,
      // ringSize 생략 - 컴포넌트 기본값 (96) 사용
      angleDeg: angle,
      handleSize: 20,
      onPullEnd: async (pull) => {
        // 핸들을 당겼을 때만 음악 재생 시도 (배경 변화 없음)
        const pullDistance = constrain(pull, 0, 300);
        lastPullStrength = pullDistance;

        // Tone.js가 완전히 초기화된 후에만 음악 재생
        const ok = await ensureToneStarted();
        if (ok) {
          tryStartMusicFromPull(pullDistance);
        }
      },
    });
  }

  if (isPlaying) angle += rotationSpeed * (0.8 + 0.2 * bgSpeedFactor);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 절대 다시 만들지 말 것 - 기존 bgBuffer 재사용
  if (!bgBuffer) {
    bgBuffer = createGraphics(width, height);
    bgBuffer.pixelDensity(1);
  }

  // CSS 비율만 다시 맞추기
  cnv.style("width", "100vw");
  cnv.style("height", "100vh");

  // 핸들 위치만 리셋 (재초기화 X)
  if (window.CDPlayer && CDPlayer.resetHandle) {
    CDPlayer.resetHandle(width, height);
  }
}

/* ----------------- Pointer events ----------------- */

async function ensureToneStarted() {
  if (isToneStarted) return true;
  try {
    await Tone.start();
    isToneStarted = true;
    console.log("✅ Tone.js started");
    return true;
  } catch (e) {
    console.error("Tone start failed:", e);
    return false;
  }
}

function tryStartMusicFromPull(pullDistance) {
  if (pullDistance <= 10) return;

  rotationSpeed = map(pullDistance, 0, 150, 1, 15);
  isPlaying = true;

  musicSpeed = map(pullDistance, 10, 300, 0.5, 3.0);
  musicSpeed = constrain(musicSpeed, 0.5, 3.0);
  musicSpeed = round(musicSpeed * 100) / 100;

  if (!player) return;

  // Tone.js GrainPlayer는 자동 로드되므로 바로 재생 시도
  if (!isMusicPlaying) {
    try {
      player.start();
      isMusicPlaying = true;
    } catch (e) {
      console.error("Music start error:", e);
    }
  }

  try {
    player.playbackRate = musicSpeed;
  } catch (e) {
    console.error("Playback rate error:", e);
  }
}

function onPointerDown(e) {
  const x = e.offsetX,
    y = e.offsetY;
  pointers.set(e.pointerId, { x, y, isDraggingHandle: false });

  // 먼저 프로그레스바(투명도 슬라이더) 상호작용 처리
  if (window.CDPlayer && CDPlayer.handleOpacityInteraction) {
    CDPlayer.handleOpacityInteraction(x, y, true);
    // 슬라이더 드래그가 시작되었다면 다른 입력은 막음
    if (CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
      return;
    }
  }

  ensureToneStarted();

  const dCenter = dist(x, y, width / 2, height / 2);
  if (dCenter < 50) {
    // stop
    isPlaying = false;
    if (player && isMusicPlaying) {
      player.stop();
      isMusicPlaying = false;
    }
    const intensity = constrain(map(lastPullStrength, 0, 300, 0, 20), 0, 20);
    for (const s of spheres) s.freeze(intensity);
    rotationSpeed = 0;
    lastPullStrength = 0;
    // 핸들을 탄성 있게 원래 자리로 스냅백
    if (window.CDPlayer && CDPlayer.startSnapBack) {
      CDPlayer.startSnapBack();
    }
    return;
  }

  const h = window.CDPlayer ? CDPlayer.getHandle() : null;
  if (h) {
    const dh = dist(x, y, h.position.x, h.position.y);
    if (dh < 80) {
      isDraggingHandle = true;
      CDPlayer.handlePointerDown(x, y);
      const p = pointers.get(e.pointerId);
      if (p) {
        p.isDraggingHandle = true;
        pointers.set(e.pointerId, p);
      }
      return; // prioritize handle interaction
    }
  }

  // Sphere click detection - trigger drum sound (only if not grabbing handle)
  for (const s of spheres) {
    const d = dist(x, y, s.x, s.y);
    if (d < s.r * 0.8) {
      if (typeof s.hit === "function") s.hit();
      return; // prevent further handling when sphere is hit
    }
  }
}

function onPointerMove(e) {
  const x = e.offsetX,
    y = e.offsetY;
  if (pointers.has(e.pointerId)) {
    const p = pointers.get(e.pointerId);
    p.x = x;
    p.y = y;
    pointers.set(e.pointerId, p);
  }
  pointerX = x;
  pointerY = y;
  // 프로그레스바 드래그 중이면 업데이트 우선
  if (window.CDPlayer && CDPlayer.handleOpacityInteraction) {
    CDPlayer.handleOpacityInteraction(x, y, false);
    if (CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
      return;
    }
  }
  if (window.CDPlayer && CDPlayer.handlePointerMove) {
    CDPlayer.handlePointerMove(x, y);
  }
}

function onPointerUp(e) {
  // 프로그레스바 드래그 종료
  if (window.CDPlayer && CDPlayer.stopOpacityDrag) {
    CDPlayer.stopOpacityDrag();
  }

  if (!isDraggingHandle) {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      pointerX = -9999;
      pointerY = -9999;
    }
    return;
  }

  if (window.CDPlayer && CDPlayer.handlePointerUp) {
    CDPlayer.handlePointerUp(e.offsetX, e.offsetY);
  }

  // 음악 재생은 onPullEnd 콜백에서 처리됨 (중복 제거)

  isDraggingHandle = false;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    pointerX = -9999;
    pointerY = -9999;
  }
}
