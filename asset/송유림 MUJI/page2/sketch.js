// === Matter.js ===
// Now handled by CDPlayer component

let angle = 0;
let rotationSpeed = 0;
let isPlaying = false;
let isDraggingHandle = false;
let lastPullStrength = 0;
let isStopping = false; // 정지 중인지 여부
let stopTimer = 0; // 정지 타이머
let whiteBgAmount = 0; // 핸들 당길 때 배경을 흰색으로 페이드

// 실제 손잡이 움직임 감지용 변수들 (사용하지 않음 - 1번 페이지와 동일하게 단순화)
// let lastHandlePosition = { x: 0, y: 0 };
// let handleMovementThreshold = 15;
// let hasHandleMoved = false;

let colorPhase = 0; // 0=초록,1=노랑,2=하양,3=하늘
let colorTimer = 0;
let colorFade = 0; // 0~1
let bgSpeedFactor = 1.0;

let pointerX = -9999;
let pointerY = -9999;
let pointers = new Map(); // 포인터 객체 생성

// === Graphics ===
let cnv;
let bgBuffer; // 글래스용 블러 버퍼
let cachedBlur; // GPU 블러 캐시
let lastBlurFrame = -999;
let ecoMode = false;
let ecoCheckTimer = 0;
let bgDirty = true; // 블러 및 백버퍼 갱신 필요 여부
let halos = []; // 터치 시 간단한 발광 효과

// === Sprite cache ===
let SPRITES = { main: [], glow: [] }; // r별로 저장
const SPRITE_RADII = [40, 60, 80, 100];

function makeRadialSprite(radius, innerAlpha = 1.0) {
  const g = createGraphics(radius * 2, radius * 2);
  g.pixelDensity(1);
  const ctx = g.drawingContext;
  // 중심부 핫스팟 제거: 내측 반경을 키우고 알파를 낮춰 부드럽게
  const grad = ctx.createRadialGradient(
    radius,
    radius,
    radius * 0.55,
    radius,
    radius,
    radius * 1.4
  );
  grad.addColorStop(0, `rgba(255,255,255,${Math.min(innerAlpha, 0.55)})`);
  grad.addColorStop(0.6, `rgba(255,255,255,${Math.min(innerAlpha, 0.28)})`);
  grad.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(radius, radius, radius, radius, 0, 0, 2 * Math.PI);
  ctx.fill();
  return g;
}

function makeGlowSprite(radius) {
  const g = createGraphics(radius * 2, radius * 2);
  g.pixelDensity(1);
  const ctx = g.drawingContext;
  // 중심 밝기 완화, 퍼짐 증가
  const grad = ctx.createRadialGradient(
    radius,
    radius,
    radius * 0.65,
    radius,
    radius,
    radius * 1.25
  );
  grad.addColorStop(0, `rgba(255,255,255,0.22)`);
  grad.addColorStop(0.7, `rgba(255,255,255,0.12)`);
  grad.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(radius, radius, radius, radius, 0, 0, 2 * Math.PI);
  ctx.fill();
  return g;
}

function initSprites() {
  SPRITE_RADII.forEach((r) => {
    SPRITES.main.push({ r, g: makeRadialSprite(r, 0.9) });
    SPRITES.glow.push({ r, g: makeGlowSprite(r) });
  });
}

function pickSprite(arr, r) {
  let best = arr[0];
  let bd = Math.abs(arr[0].r - r);
  for (let i = 1; i < arr.length; i++) {
    const d = Math.abs(arr[i].r - r);
    if (d < bd) {
      bd = d;
      best = arr[i];
    }
  }
  return best.g;
}

// === Background cache ===
let baseBG;
let ringsLayer;
let ringsDirty = true;
let lastPhase = -1;

function initBG() {
  baseBG = createGraphics(width, height);
  baseBG.pixelDensity(1);
  const ctx = baseBG.drawingContext;
  const g = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    max(width, height) * 0.8
  );
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(1, "rgba(20,20,20,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ringsLayer = createGraphics(width, height);
  ringsLayer.pixelDensity(1);
  ringsDirty = true;
}

function updateRingsLayer() {
  ringsLayer.clear();
  const ctx = ringsLayer.drawingContext;
  const layers = 3;
  const baseRadius = 250;
  const spread = 320;
  for (let i = 0; i < layers; i++) {
    const ang = (colorTimer * 0.3 + i * (360 / layers)) % 360;
    const radius = baseRadius + sin(colorTimer * 0.015 + i) * spread * 0.4;
    const x = width / 2 + cos(ang) * radius;
    const y = height / 2 + sin(ang) * radius;

    const circleGrad = ctx.createRadialGradient(x, y, 0, x, y, 200);
    if (colorPhase === 0) {
      circleGrad.addColorStop(0, `rgba(150,255,180,${0.1 * colorFade})`);
      circleGrad.addColorStop(0.5, `rgba(255,255,180,${0.08 * colorFade})`);
    } else if (colorPhase === 1) {
      circleGrad.addColorStop(0, `rgba(255,220,120,${0.12 * colorFade})`);
      circleGrad.addColorStop(0.5, `rgba(255,180,200,${0.08 * colorFade})`);
    } else if (colorPhase === 2) {
      circleGrad.addColorStop(0, `rgba(240,250,255,${0.1 * colorFade})`);
      circleGrad.addColorStop(0.5, `rgba(255,240,180,${0.07 * colorFade})`);
    } else {
      circleGrad.addColorStop(0, `rgba(180,210,255,${0.1 * colorFade})`);
      circleGrad.addColorStop(0.5, `rgba(255,230,160,${0.07 * colorFade})`);
    }
    circleGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = circleGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 400, 400, 0, 0, 2 * Math.PI);
    ctx.fill();
  }
  ringsDirty = false;
}

// === Floating Particles ===
let spheres = [];
// === Pool ===
let SPHERE_CAP = 50; // 전역에서는 값만 잡아놓고, setup()에서 실제 계산
let spherePool = [];
let TARGET_SPHERE_COUNT = 40; // 화면 내에서 유지할 목표 개수

// 구슬 외형(크기/색) 재설정 helper: 보라/회색 계열, 대왕 구슬 방지
function resetSphereAppearance(s) {
  const base = Math.min(width, height);
  const minSize = base * 0.025;
  const maxSize = base * 0.07;
  const hardCap = base * 0.075;
  const t = Math.pow(random(), 2.5);
  const size = lerp(minSize, maxSize, t);
  s.r = constrain(size, minSize, hardCap);
  s.originalR = s.r;

  // 보라/회색 계열 팔레트 중 랜덤 선택
  const palette = floor(random(3));
  const a = s.alpha;
  if (palette === 0) {
    // 딥 퍼플
    s.darkColor = color(random(90, 130), random(70, 95), random(140, 190), a);
    s.lightColor = color(210, 200, 230, 120);
    s.glowColor = color(190, 180, 230, a * 0.6);
  } else if (palette === 1) {
    // 라벤더/보라 회색
    s.darkColor = color(
      random(110, 150),
      random(100, 120),
      random(170, 210),
      a
    );
    s.lightColor = color(220, 215, 235, 120);
    s.glowColor = color(200, 195, 240, a * 0.6);
  } else {
    // 그레이시 퍼플
    s.darkColor = color(
      random(120, 160),
      random(120, 135),
      random(160, 200),
      a
    );
    s.lightColor = color(230, 230, 240, 120);
    s.glowColor = color(210, 210, 245, a * 0.6);
  }
  s.currentColor = s.darkColor;
  s.targetColor = s.darkColor;
}

function getSphere(x, y, rising = false) {
  if (spherePool.length) {
    const s = spherePool.pop();
    s.x = x;
    s.y = y;
    s.isFalling = false;
    s.isRising = rising;
    s.alpha = random(60, 120);
    resetSphereAppearance(s);
    s.speedX = random(-0.3, 0.3);
    s.speedY = rising ? random(-1.0, -2.0) : random(-0.2, 0.2);
    return s;
  }
  return new Sphere(x, y, rising);
}

function releaseSphere(s) {
  if (spherePool.length < SPHERE_CAP) spherePool.push(s);
}

function maybeSpawnBubble() {
  if (spheres.length >= SPHERE_CAP) return;
  const nb = getSphere(random(width), height + random(50, 150), true);
  nb.alpha = 0;
  nb.x = random(nb.r, width - nb.r); // 화면 경계 내에서 생성
  spheres.push(nb);
}

class Sphere {
  constructor(x = random(width), y = random(height), rising = false) {
    this.x = x;
    this.y = y;
    // 구슬 크기 다양화 (작은 비중↑, 대왕 금지)
    const base = Math.min(width, height);
    const minSize = base * 0.025;
    const maxSize = base * 0.07;
    const hardCap = base * 0.075;
    const t = Math.pow(random(), 2.5);
    const size = lerp(minSize, maxSize, t);
    this.r = constrain(size, minSize, hardCap);
    this.speedX = random(-0.3, 0.3);
    this.speedY = rising ? random(-1.0, -2.0) : random(-0.2, 0.2);
    this.gravity = rising ? 0 : 0.15; // 떨어질 땐 아래로, 올라올 땐 위로
    this.alpha = random(60, 120);
    this.isFalling = false;
    this.isRising = rising;
    this.originalR = this.r;
    this.lastTouchTime = 0; // 마지막 터치 시간 (중복 방지용)

    // 화면 경계 내로 제한 (반지름 고려)
    this.x = constrain(this.x, this.r, width - this.r);
    this.y = constrain(this.y, this.r, height - this.r);

    // 보라/회색 계열로 랜덤 팔레트 적용
    const palette = floor(random(3));
    if (palette === 0) {
      this.darkColor = color(
        random(90, 130),
        random(70, 95),
        random(140, 190),
        this.alpha
      );
      this.lightColor = color(210, 200, 230, 120);
      this.glowColor = color(190, 180, 230, this.alpha * 0.6);
    } else if (palette === 1) {
      this.darkColor = color(
        random(110, 150),
        random(100, 120),
        random(170, 210),
        this.alpha
      );
      this.lightColor = color(220, 215, 235, 120);
      this.glowColor = color(200, 195, 240, this.alpha * 0.6);
    } else {
      this.darkColor = color(
        random(120, 160),
        random(120, 135),
        random(160, 200),
        this.alpha
      );
      this.lightColor = color(230, 230, 240, 120);
      this.glowColor = color(210, 210, 245, this.alpha * 0.6);
    }

    this.currentColor = this.darkColor;
    this.targetColor = this.darkColor;
  }

  update() {
    if (this.isFalling) {
      this.speedY += this.gravity;
      this.y += this.speedY;
      this.alpha -= 2; // 서서히 사라짐
      if (this.y > height + this.r * 2) this.alpha = 0; // 화면 아래로 사라짐
    }

    if (this.isRising) {
      this.y += this.speedY;
      this.alpha += 2;
      this.r = lerp(this.r, this.originalR * 1.2, 0.02);
      // 상단 30% 지점에 도달하면 멈춤 (random 제거로 안정성 향상)
      if (this.y < height * 0.3) {
        this.isRising = false; // 상단 근처에서 멈춤
      }
    }

    // 평상시 움직임 (떨어지거나 올라오지 않을 때만)
    if (!this.isFalling && !this.isRising) {
      this.x += this.speedX * bgSpeedFactor;
      this.y += this.speedY * bgSpeedFactor;

      // 화면 경계 내에 제한
      this.x = constrain(this.x, this.r, width - this.r);
      this.y = constrain(this.y, this.r, height - this.r);
    }

    // === 포인터 반응 (제곱거리 비교로 최적화) ===
    let isInfluenced = false;
    let totalForceX = 0;
    let totalForceY = 0;
    let maxGlowStrength = 0;

    const influenceRadius = 200;
    const maxDistSq = influenceRadius * influenceRadius;
    for (let pointer of pointers.values()) {
      const dx = this.x - pointer.x;
      const dy = this.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < maxDistSq) {
        isInfluenced = true;
        const proximity = 1 - d2 / maxDistSq; // 근사치로 충분
        const glowStrength = Math.pow(proximity, 1.5);
        if (glowStrength > maxGlowStrength) maxGlowStrength = glowStrength;
        const inv = 1.0 / (Math.sqrt(d2) + 0.001); // 꼭 필요한 곳에서만 sqrt
        const force = proximity * 8;
        totalForceX += dx * inv * force;
        totalForceY += dy * inv * force;
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

      // 포인터 반응 시에도 화면 경계 내에 제한
      this.x = constrain(this.x, this.r, width - this.r);
      this.y = constrain(this.y, this.r, height - this.r);
    } else {
      if (isPlaying) {
        // 재생 중엔 초록빛으로 서서히 변화
        const greenTarget = color(80, 200, 120, 200);
        this.targetColor = greenTarget;
        this.currentColor = lerpColor(
          this.currentColor,
          this.targetColor,
          0.035
        );
        this.alpha = lerp(this.alpha, 120, 0.02);
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
  }

  // 터치 처리 (중복 방지 포함)
  onTouch() {
    const currentTime = millis();
    const touchCooldown = 400; // 약간 줄여서 반응성 향상

    // 이미 완전히 사라진 버블이면 패스
    if (this.alpha <= 0) return false;

    // 터치 쿨다운만 검사 (isFalling 제거)
    if (currentTime - this.lastTouchTime < touchCooldown) {
      return false;
    }

    // === 정상 처리 ===
    this.isFalling = true;
    this.speedY = random(2, 5);
    this.lastTouchTime = currentTime;

    // 간단한 halo 발광 효과 추가 (저비용)
    halos.push({
      x: this.x,
      y: this.y,
      r: this.r * 1.4,
      alpha: 150,
      life: 30,
    });

    // ✅ 떨어질 때 새 버블 생성
    if (spheres.length < SPHERE_CAP) {
      const nb = getSphere(
        random(width),
        height + random(60, 160), // 화면 아래에서 시작
        true // 떠오르는 모션
      );
      nb.alpha = 1; // 투명하지 않게 시작
      nb.x = random(nb.r, width - nb.r);
      nb.y = height + nb.r + random(20, 80);
      nb.speedY = random(-1.8, -2.6);
      spheres.push(nb);
    }

    return true;
  }

  // 터치 가능한지 확인
  isTouchable() {
    return this.alpha > 0;
  }

  display(gfx = null) {
    if (this.alpha <= 0) return;
    const ctx = gfx ? gfx.drawingContext : drawingContext;

    // 메인 스피어: 미리 만든 라디얼 스프라이트 + tint
    const sprite = pickSprite(SPRITES.main, this.r);
    const col = this.currentColor.levels; // [r,g,b,a]
    if (gfx) {
      gfx.push();
      gfx.imageMode(CENTER);
      gfx.drawingContext.save();
      gfx.drawingContext.globalAlpha = this.alpha / 255;
      if (typeof gfx.tint === "function") {
        gfx.tint(col[0], col[1], col[2]);
        gfx.image(sprite, this.x, this.y, this.r * 2, this.r * 2);
        gfx.noTint();
      } else {
        // 폴백: tint 미지원이면 무채색 스프라이트 + 알파만
        gfx.image(sprite, this.x, this.y, this.r * 2, this.r * 2);
      }
      gfx.drawingContext.restore();
      gfx.pop();
    } else {
      push();
      imageMode(CENTER);
      drawingContext.save();
      drawingContext.globalAlpha = this.alpha / 255;
      tint(col[0], col[1], col[2]);
      image(sprite, this.x, this.y, this.r * 2, this.r * 2);
      noTint();
      drawingContext.restore();
      pop();
    }
  }
}

// === CD Player now uses shared component ===

// === Setup ===
// === Sound Effects ===
let glassDropSound;
let audioContextStarted = false;

// iPhone Safari 대응을 위한 AudioContext 초기화 지연
function ensureAudioContext() {
  if (!audioContextStarted) {
    if (
      glassDropSound &&
      glassDropSound.context &&
      glassDropSound.context.state === "suspended"
    ) {
      glassDropSound.context.resume();
    }
    audioContextStarted = true;
  }
}

// 유리구슬 떨어지는 소리 생성
function createGlassDropSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  glassDropSound = {
    context: audioContext,
    play: function () {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      // 유리구슬 같은 높은 주파수에서 시작
      osc.frequency.setValueAtTime(800, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        200,
        audioContext.currentTime + 0.3
      );

      // 볼륨 조절 (페이드 아웃)
      gain.gain.setValueAtTime(0.25, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );

      // 사인파로 유리 같은 소리
      osc.type = "sine";

      osc.start();
      osc.stop(audioContext.currentTime + 0.3);
    },
  };
}

// 소리 재생 함수
function playGlassDropSound() {
  if (glassDropSound) {
    try {
      glassDropSound.play();
    } catch (error) {
      console.log("Sound playback failed:", error);
    }
  }
}

function setup() {
  // 성능 최적화된 픽셀 밀도 설정
  const ratio = window.devicePixelRatio; // 예: iPhone = 3.0, Android = 2.0
  const targetDensity = constrain(ratio * 0.6, 1, 2); // 절반 수준으로 제한
  pixelDensity(targetDensity);

  console.log("DevicePixelRatio:", window.devicePixelRatio);
  console.log("Canvas pixelDensity:", pixelDensity());

  cnv = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  // CSS 비율 맞추기 - 좌표계 일치를 위해 auto 사용
  cnv.style("width", "100vw");
  cnv.style("height", "auto");

  // CDPlayer 컴포넌트 초기화 (안전한 방식)
  if (window.CDPlayer && CDPlayer.initializePhysics) {
    CDPlayer.initializePhysics();
    // 내부(p5) 토글 숨기기, CSS 토글 사용
    if (CDPlayer.setOpacityControlEnabled) {
      CDPlayer.setOpacityControlEnabled(false);
    }
  } else {
    console.error("CDPlayer not loaded yet!");
  }

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

  // 포인터 이벤트 리스너
  cnv.elt.addEventListener("pointerdown", pointerDown);
  cnv.elt.addEventListener("pointermove", pointerMove);
  cnv.elt.addEventListener("pointerup", pointerUp);

  // 화면 크기에 따라 다운스케일 조정 (모바일: 더 낮춤)
  const isMobile = windowWidth < 800 || windowHeight < 800;
  SPHERE_CAP = isMobile ? 20 : 50; // setup()에서 실제 계산
  const scaleFactor = isMobile ? 0.25 : 0.4;
  bgBuffer = createGraphics(width * scaleFactor, height * scaleFactor);
  bgBuffer.pixelDensity(1); // 내부 버퍼는 굳이 고밀도 필요 없음

  // GPU 블러 캐시 버퍼
  cachedBlur = createGraphics(width, height);
  cachedBlur.pixelDensity(1);

  // 스프라이트/배경 초기화
  initSprites();
  initBG();

  // 화면 크기에 따라 구체 수 조정 (모바일: 절반, 데스크톱: 전체)
  const numSpheres = isMobile ? 15 : 40; // 모바일일 때 반으로 줄임

  spheres = [];
  for (let i = 0; i < numSpheres; i++) spheres.push(new Sphere());
  TARGET_SPHERE_COUNT = numSpheres; // 초기 목표 개수 고정

  // Physics engine now handled by CDPlayer component
}

// === Draw ===
function draw() {
  if (isPlaying) {
    colorFade = lerp(colorFade, 1, 0.04);
    colorTimer++;
    isStopping = false;
    stopTimer = 0;
    // 배경 흰색 페이드 인 (더 천천히)
    whiteBgAmount = lerp(whiteBgAmount, 1, 0.025);
  } else if (isStopping) {
    stopTimer++;
    const stopDuration = 90;
    const stopProgress = min(stopTimer / stopDuration, 1);

    rotationSpeed = lerp(rotationSpeed, 0, 0.08);
    colorFade = lerp(colorFade, 0, 0.05);
    // 배경 흰색 페이드 아웃 (느리게 유지)
    whiteBgAmount = lerp(whiteBgAmount, 0, 0.03);

    if (stopProgress >= 1 && rotationSpeed < 0.1) {
      isStopping = false;
      rotationSpeed = 0;
      stopTimer = 0;
      colorFade = 0;
      colorPhase = 0;
    }
  } else {
    colorFade = lerp(colorFade, 0, 0.02);
    rotationSpeed = lerp(rotationSpeed, 0, 0.05);
    // 배경 흰색 페이드 아웃 (느리게 유지)
    whiteBgAmount = lerp(whiteBgAmount, 0, 0.02);
  }

  const bgCtx = drawingContext;
  // 바닥 그라디언트 캐시 사용
  image(baseBG, 0, 0);

  // 기존 메인 그라디언트 대신 링 레이어 캐시 사용
  if (isPlaying && colorFade > 0.3) {
    if (ringsDirty || lastPhase !== colorPhase || frameCount % 2 === 0) {
      updateRingsLayer();
      lastPhase = colorPhase;
    }
    image(ringsLayer, 0, 0);
  }

  // 흰색 오버레이로 전체 배경을 서서히 흰색으로 전환
  if (whiteBgAmount > 0.001) {
    bgCtx.save();
    bgCtx.globalAlpha = constrain(whiteBgAmount, 0, 1);
    bgCtx.fillStyle = "#ffffff";
    bgCtx.fillRect(0, 0, width, height);
    bgCtx.restore();
  }

  // 상단 링은 캐시에서 처리하므로 제거

  // 스피어 업데이트 및 렌더링
  let removedCount = 0; // 이번 프레임에 사라진 개수 카운트

  for (let i = spheres.length - 1; i >= 0; i--) {
    const s = spheres[i];
    s.update();
    s.display();

    if (s.alpha <= 0) {
      const removed = spheres.splice(i, 1)[0];
      if (removed) {
        releaseSphere(removed);
        removedCount++;
        bgDirty = true;
      }
    }
  }

  // === 이번 프레임에 제거된 개수만큼 '바닥에서' 즉시 보충 ===
  for (let k = 0; k < removedCount; k++) {
    const nb = getSphere(
      random(width),
      height + random(60, 160), // 화면 아래에서 시작
      true // 떠오르는 모션
    );
    nb.alpha = 1; // 투명하지 않게 시작
    nb.x = random(nb.r, width - nb.r); // 화면 경계 내에서 생성
    nb.y = height + nb.r + random(20, 80); // 실제 반지름 고려해 캔버스 아래에서 시작
    nb.speedY = random(-1.8, -2.6); // 위로 더 또렷하게 올라오도록
    spheres.push(nb);
  }

  // (선택) 안전망 - 목표 개수 미만이면 추가 보충
  while (spheres.length < min(TARGET_SPHERE_COUNT, SPHERE_CAP)) {
    const nb = getSphere(random(width), height + random(60, 160), true);
    nb.alpha = 1; // 투명하지 않게 시작
    nb.x = random(nb.r, width - nb.r); // 화면 경계 내에서 생성
    nb.y = height + nb.r + random(20, 80);
    nb.speedY = random(-1.8, -2.6);
    spheres.push(nb);
  }

  // === Halo 발광 효과 ===
  for (let i = halos.length - 1; i >= 0; i--) {
    const h = halos[i];
    noStroke();
    fill(180, 240, 255, h.alpha);
    ellipse(h.x, h.y, h.r);
    h.alpha *= 0.9;
    h.r *= 1.05;
    h.life--;
    if (h.life <= 0) halos.splice(i, 1);
  }

  bgBuffer.clear();
  for (let s of spheres) s.display(bgBuffer);
  // 스피어가 있었다면 더티 처리
  if (spheres.length) bgDirty = true;

  // GPU 블러 + 프레임 스키핑으로 모바일 성능 최적화
  ecoCheckTimer++;
  const isMobile = windowWidth < 800 || windowHeight < 800;

  // 에코 모드 자동 전환 (1초마다 FPS 체크)
  if (ecoCheckTimer % 60 === 0) {
    ecoMode = frameRate() < 40;
  }

  const skip = ecoMode ? 3 : isMobile ? 2 : 1; // 모바일: 2프레임에 1번, 에코: 3프레임에 1번

  if (bgDirty && frameCount - lastBlurFrame >= skip && !ecoMode) {
    // GPU 블러 캐시 업데이트
    const blurPx = isMobile ? 2 : 5;
    cachedBlur.clear();
    cachedBlur.drawingContext.save();
    cachedBlur.drawingContext.filter = `blur(${blurPx}px)`;
    cachedBlur.image(bgBuffer, 0, 0, width, height);
    cachedBlur.drawingContext.filter = "none";
    cachedBlur.drawingContext.restore();
    lastBlurFrame = frameCount;
    bgDirty = false;
  }

  // 메인 캔버스에 블러 결과 렌더링
  if (!ecoMode) {
    const alpha = isMobile ? 0.6 : 0.8;
    push();
    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    image(cachedBlur, 0, 0, width, height);
    drawingContext.restore();
    pop();
  } else {
    // 에코 모드: 블러 없이 투명도만
    push();
    drawingContext.save();
    drawingContext.globalAlpha = 0.45;
    image(bgBuffer, 0, 0, width, height);
    drawingContext.restore();
    pop();
  }

  // Update physics (조건부/저주파)
  const needPhysics = isDraggingHandle || isPlaying || isStopping;
  if (needPhysics) {
    const physSkip = ecoMode
      ? 2
      : windowWidth < 800 || windowHeight < 800
      ? 1
      : 0;
    if (frameCount % (physSkip + 1) === 0) {
      CDPlayer.updatePhysics();
    }
  }

  // Use CD Player component (배경 패널 제거)
  CDPlayer.drawDevice({
    cx: width / 2,
    cy: height / 2,
    // ringSize 생략 - 컴포넌트 기본값 (96) 사용
    angleDeg: angle,
    bgBuffer: bgBuffer,
    handleSize: 20,
  });

  if (isPlaying || isStopping) {
    angle += rotationSpeed * 0.8;
  }
}

// === 포인터 이벤트 함수들 ===
function pointerDown(event) {
  // iPhone Safari 대응: 첫 입력 시 AudioContext 초기화 및 소리 생성
  if (!glassDropSound) {
    createGlassDropSound();
  }
  ensureAudioContext();

  // 좌표 변환: CSS 픽셀 → p5 내부 픽셀
  const rect = cnv.elt.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * width;
  const y = ((event.clientY - rect.top) / rect.height) * height;

  pointers.set(event.pointerId, {
    x: x,
    y: y,
    pressure: event.pressure || 1,
    isDraggingHandle: false,
  });

  // 1) 슬라이더 먼저 처리 (가장 우선순위)
  if (CDPlayer && CDPlayer.handleOpacityInteraction) {
    CDPlayer.handleOpacityInteraction(x, y, true);

    // 슬라이더 드래그가 시작되면 Matter MouseConstraint 막기
    if (CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
      const mc = CDPlayer.getMouseConstraint();
      if (mc && mc.mouse) {
        mc.mouse.pressed = false;
        mc.mouse.button = -1;
      }
      return; // 슬라이더를 드래그 중이면 핸들로 포인터 전달하지 않음
    }
  }

  // === 스피어 터치 감지 (제곱거리 비교) ===
  let touchedSphere = null;
  for (let s of spheres) {
    if (s.isTouchable()) {
      const dx2 = x - s.x;
      const dy2 = y - s.y;
      if (dx2 * dx2 + dy2 * dy2 < s.r * s.r) {
        touchedSphere = s;
        break;
      }
    }
  }

  if (touchedSphere) {
    // 스피어 터치 처리 (중복 방지 포함)
    const touchProcessed = touchedSphere.onTouch();

    if (touchProcessed) {
      // 유리구슬 떨어지는 소리 재생
      playGlassDropSound();

      console.log("Sphere touched! Falling and new bubble created");
    }

    event.preventDefault();
    return;
  }

  // 중앙 클릭 (정지 버튼)
  const d = dist(x, y, width / 2, height / 2);
  if (d < 30) {
    // 재생 중일 때만 정지 시작 (pull 여부 무관)
    if (isPlaying || isStopping) {
      isPlaying = false;
      isStopping = true;
      stopTimer = 0;
      rotationSpeed = 0;
      lastPullStrength = 0;

      // 핸들을 탄성 있게 원위치로 복귀
      if (window.CDPlayer && CDPlayer.startSnapBack) {
        CDPlayer.startSnapBack();
      }
      event.preventDefault();
      return;
    }
  }

  // === 손잡이 거리 측정 ===
  const handle = CDPlayer.getHandle();
  if (!handle) return;

  const distToHandle = dist(x, y, handle.position.x, handle.position.y);
  if (distToHandle < 80) {
    // 손잡이 근처에서만 드래그 시작 (1번 페이지와 동일한 거리)
    isDraggingHandle = true;
    console.log("Handle drag started");
    // 핸들을 잡는 순간 배경과 구슬 색 변화가 빠르게 느껴지도록 약간 가속
    whiteBgAmount = max(whiteBgAmount, 0.2);

    if (pointers.has(event.pointerId)) {
      const pointer = pointers.get(event.pointerId);
      pointer.isDraggingHandle = true;
      pointers.set(event.pointerId, pointer);
    }
  } else {
    console.log("🧊 Ignored click outside handle:", distToHandle);
  }
}

function pointerMove(event) {
  // 좌표 변환: CSS 픽셀 → p5 내부 픽셀
  const rect = cnv.elt.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * width;
  const y = ((event.clientY - rect.top) / rect.height) * height;

  if (pointers.has(event.pointerId)) {
    const pointer = pointers.get(event.pointerId);
    pointer.x = x;
    pointer.y = y;
    pointers.set(event.pointerId, pointer);
  }

  pointerX = x;
  pointerY = y;

  // 슬라이더 드래그 중인지 먼저 체크
  if (CDPlayer && CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
    // 슬라이더 드래그 계속 업데이트
    if (CDPlayer.handleOpacityInteraction) {
      CDPlayer.handleOpacityInteraction(x, y, true);
    }

    // Matter가 잡아가지 못하도록 계속 해제
    const mc = CDPlayer.getMouseConstraint();
    if (mc && mc.mouse) {
      mc.mouse.pressed = false;
      mc.mouse.button = -1;
      mc.mouse.position.x = x;
      mc.mouse.position.y = y;
    }
  } else {
    // === 드래그 중 여러 스피어 동시 터치 ===
    // 드래그하면서 지나가는 모든 스피어가 떨어지게 함
    for (let s of spheres) {
      if (s.isTouchable()) {
        const dx2 = x - s.x;
        const dy2 = y - s.y;
        const r2 = s.r * s.r * 0.64; // (0.8r)^2
        if (dx2 * dx2 + dy2 * dy2 < r2) {
          // 살짝 여유 있게
          const touched = s.onTouch();
          if (touched) {
            playGlassDropSound();
          }
        }
      }
    }

    // 드래그 중일 때만 업데이트
    if (isDraggingHandle) {
      CDPlayer.handlePointerMove(x, y);
    }
  }
}

function pointerUp(event) {
  // 좌표 변환: CSS 픽셀 → p5 내부 픽셀
  const rect = cnv.elt.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * width;
  const y = ((event.clientY - rect.top) / rect.height) * height;

  // 슬라이더 드래그 중지 먼저 체크
  if (CDPlayer && CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
    if (CDPlayer.stopOpacityDrag) {
      CDPlayer.stopOpacityDrag();
    }
    pointers.delete(event.pointerId);
    if (pointers.size === 0) {
      pointerX = -9999;
      pointerY = -9999;
    }
    return;
  }

  if (!isDraggingHandle) {
    // 손잡이를 드래그하지 않았다면 아무것도 하지 않음
    pointers.delete(event.pointerId);
    if (pointers.size === 0) {
      pointerX = -9999;
      pointerY = -9999;
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

    colorPhase = floor(random(4));
    colorTimer = 0;
    console.log("공기청정기 실행 - 실제 손잡이 움직임 감지됨");
  }

  isDraggingHandle = false;

  pointers.delete(event.pointerId);
  if (pointers.size === 0) {
    pointerX = -9999;
    pointerY = -9999;
  }

  CDPlayer.handlePointerUp(x, y);

  // 정지 상태라면 핸들을 기본 위치로 탄성 복귀
  if (!isPlaying && window.CDPlayer && CDPlayer.startSnapBack) {
    CDPlayer.startSnapBack();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bgBuffer = createGraphics(width * 0.4, height * 0.4); // 다운스케일로 성능 최적화
  bgBuffer.pixelDensity(1); // 내부 버퍼는 굳이 고밀도 필요 없음

  // CSS 비율 재조정 - 좌표계 일치를 위해 auto 사용
  cnv.style("width", "100vw");
  cnv.style("height", "auto");

  // CDPlayer 컴포넌트 초기화 (안전한 방식)
  if (window.CDPlayer && CDPlayer.initializePhysics) {
    CDPlayer.initializePhysics();
  } else {
    console.error("CDPlayer not loaded yet!");
  }

  // 화면 크기에 따라 구체 수 조정 (모바일: 절반, 데스크톱: 전체)
  const isMobile = windowWidth < 800 || windowHeight < 800;
  SPHERE_CAP = isMobile ? 20 : 50; // 🔁 CAP 재계산
  const numSpheres = isMobile ? 15 : 40; // 모바일일 때 반으로 줄임

  spheres = [];
  for (let i = 0; i < numSpheres; i++) spheres.push(new Sphere());
  TARGET_SPHERE_COUNT = numSpheres; // 리사이즈 후 목표 개수 갱신

  // 스프라이트/배경 재생성
  SPRITES = { main: [], glow: [] };
  initSprites();
  initBG();
  cachedBlur = createGraphics(width, height);
  cachedBlur.pixelDensity(1);
  bgDirty = true;

  // 크기 재조정 (화면 비율 변화 대응)
  for (let s of spheres) {
    const base = Math.min(width, height);
    const minSize = base * 0.025;
    const maxSize = base * 0.07;
    const t = Math.pow(random(), 2.5);
    s.r = lerp(minSize, maxSize, t);
    s.originalR = s.r;
  }
}
