// === Page 5: Vacuum Scene - CD 시리즈 (반복 사이클 버전) ===

let dusts = [];
let sparkles = []; // 큰 반짝(마무리)
let woodFloorBuffer;
let wetLumLayer; // 명도(밝기)만 낮추는 레이어 (회색계)
let wetShineLayer; // 아주 약한 하이라이트(물막 반사)
let evapBuf; // 저해상도 증발 마스크

let cnv;
let pointers = new Map();
let isDraggingHandle = false;
let dragWatch = null; // 드래그 워치독
let pullLockUntil = 0; // pull 이벤트 디바운스

// CD Player 회전
let angle = 0;
let rotationSpeed = 0;
let isPlaying = false; // 재생 상태

// 물걸레 관련 설정
const EVAP_ALPHA = 1; // 프레임당 증발 세기(↑ 빨리 마름) - 더 오래 남도록
const BRUSH_RADIUS = 70; // 기본 브러시 반경 (넓게 닦이는 느낌)
const BRUSH_SPACING = 16; // 스탬프 간격 (큰 값 = 가벼운 비용)
let lastPointer = new Map(); // pointerId -> {x,y}

// 블렌드 모드 관련
let WET_BLEND = "luminosity";
let SUPPORTS_LUMINOSITY = false;
let WET_STRENGTH = 0.95; // 화면에 합성할 때의 강도(0~1) - 눈에 띄게

// ----- 상태 머신 -----
const MODE = {
  DIRTY: "dirty",
  VACUUM: "vacuum",
  READY: "ready",
  SHINE: "shine",
};
let mode = MODE.DIRTY;

// 젖은 자국 지속/감지용 메타
let wetMeter = 0; // 젖은 양의 대략적 지표
let lastWetStampFrame = 0; // 마지막으로 스탬프 찍은 프레임
const WET_IMPULSE = 140; // 스탬프 1번당 젖음 증가량
const WET_DECAY = 4; // 프레임당 젖음 감소량(↓ = 더 오래감)

let sparkleSound = null; // 원하는 경우 loadSound로 넣어도 됨
let suctionSound = null; // 원하는 경우 loadSound로 넣어도 됨
let cleanSound = null; // 청소 소리
let cleanSoundStartTime = 0; // 재생 시작 시간
let isCleaningPlaying = false; // 청소 소리 재생 중인지

function preload() {
  // 사운드 쓰면 여기에:
  // sparkleSound = loadSound("assets/sparkle.mp3");
  // suctionSound = loadSound("assets/suction.mp3");
  try {
    cleanSound = loadSound("../assets/music/clean.wav");
  } catch (e) {
    console.log("청소 소리 로드 실패:", e);
    cleanSound = null;
  }
}

/* =======================
   드래그 안정화 워치독
   ======================= */
function releaseHandle() {
  isDraggingHandle = false;
  // 포인터 플래그 정리
  pointers.forEach((p, id) => {
    if (p.isDraggingHandle) {
      p.isDraggingHandle = false;
      pointers.set(id, p);
    }
  });
}
function startDragWatch() {
  clearTimeout(dragWatch);
  dragWatch = setTimeout(() => releaseHandle(), 1200);
}
function tickDragWatch() {
  clearTimeout(dragWatch);
  dragWatch = setTimeout(() => releaseHandle(), 1200);
}
function stopDragWatch() {
  clearTimeout(dragWatch);
}

/* =======================
   안전한 모드 전환
   ======================= */
function setMode(next) {
  if (mode === next) return;
  mode = next;

  if (mode === MODE.DIRTY) {
    // 새 라운드: 잔여 반짝/핸들/포인터 플래그 정리
    releaseHandle();
    lastPointer.clear();
    isPlaying = false; // 회전 멈춤
    // 청소 소리 정리
    if (isCleaningPlaying && cleanSound) {
      if (cleanSound && typeof cleanSound.stop === "function") {
        cleanSound.stop();
      }
      isCleaningPlaying = false;
    }
    // CD 핸들 위치도 초기화(있으면)
    if (window.CDPlayer && CDPlayer.resetHandle)
      CDPlayer.resetHandle(width, height);
  }
  if (mode === MODE.VACUUM) {
    // 빨아들이는 동안 먼지 추가 금지, 물걸레 가능
    releaseHandle(); // 핸들 끌던 손은 놓인 상태로 간주
  }
  if (mode === MODE.SHINE) {
    // 반짝 도중엔 입력 무시
    releaseHandle();
    isPlaying = false; // 회전 멈춤
  }
}

function setup() {
  const ratio = window.devicePixelRatio || 1;
  pixelDensity(constrain(ratio * 0.6, 1, 2));

  cnv = createCanvas(windowWidth, windowHeight);
  cnv.style("width", "100vw");
  cnv.style("height", "100vh");
  noStroke();

  // 🔧 바닥/타일 경계 틈 방지: 스무딩 비활성화
  drawingContext.imageSmoothingEnabled = false;

  // 젖은 레이어 생성 (2개)
  wetLumLayer = createGraphics(windowWidth, windowHeight);
  wetShineLayer = createGraphics(windowWidth, windowHeight);
  wetLumLayer.pixelDensity(1);
  wetShineLayer.pixelDensity(1);
  wetLumLayer.clear();
  wetShineLayer.clear();

  // 저해상도 증발 마스크
  evapBuf = createGraphics(
    Math.ceil(windowWidth / 3),
    Math.ceil(windowHeight / 3)
  );
  evapBuf.pixelDensity(1);

  createWoodFloor();

  // 포인터 이벤트
  cnv.elt.addEventListener("pointerdown", onPointerDown);
  cnv.elt.addEventListener("pointermove", onPointerMove);
  cnv.elt.addEventListener("pointerup", onPointerUp);
  cnv.elt.addEventListener("pointercancel", onPointerUp);

  // CDPlayer 초기화
  if (window.CDPlayer && window.CDPlayer.initializePhysics) {
    window.CDPlayer.initializePhysics();
    // 내부(p5) 토글 숨기기, CSS 토글 사용
    if (window.CDPlayer.setOpacityControlEnabled) {
      window.CDPlayer.setOpacityControlEnabled(false);
    }
  }

  // CSS 토글 DOM과 연동
  const toggle = document.getElementById("opacityToggle");
  const knob = document.getElementById("opacityKnob");
  if (toggle && knob && window.CDPlayer) {
    const knobTravel = 56 - 22;
    const applyKnob = () => {
      const v = window.CDPlayer.getOpacity ? window.CDPlayer.getOpacity() : 0;
      const t = v > 0.5 ? 1 : 0;
      knob.style.transform = `translateX(${t * knobTravel}px)`;
    };
    applyKnob();

    const toggleOnce = () => {
      const v = window.CDPlayer.getOpacity ? window.CDPlayer.getOpacity() : 0;
      const nv = v > 0.5 ? 0 : 1;
      if (window.CDPlayer.setOpacity) window.CDPlayer.setOpacity(nv);
      applyKnob();
    };

    toggle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleOnce();
    });
  }

  // 손잡이 당기면 흡입 시작 (디바운스 적용)
  window.currentOnPullEnd = (pull) => {
    const now = millis ? millis() : performance.now();
    if (now < pullLockUntil) return; // 100ms 락
    pullLockUntil = now + 100;

    if (pull > 10 && mode === MODE.DIRTY) {
      setMode(MODE.VACUUM);
      isPlaying = true; // 회전 시작
      if (suctionSound) suctionSound.play();

      // 청소 소리 재생 (clean.wav의 2초~5초 구간)
      if (cleanSound) {
        try {
          cleanSound.play();
          if (typeof cleanSound.jump === "function") {
            cleanSound.jump(2); // 2초부터 시작
          } else if (typeof cleanSound.currentTime === "function") {
            cleanSound.currentTime(2);
          }
          cleanSoundStartTime = millis();
          isCleaningPlaying = true;
        } catch (e) {
          console.log("청소 소리 재생 실패:", e);
        }
      }
    }
  };

  // luminosity 지원 감지
  SUPPORTS_LUMINOSITY = detectLuminositySupport();
  if (!SUPPORTS_LUMINOSITY) {
    // 폴백: 색감 왜곡이 적은 순으로 시도
    WET_BLEND = "soft-light"; // 1순위
    // 일부 캔버스 구현에서 soft-light도 약하면 multiply로
    // WET_BLEND = 'multiply';
  }

  // 드래그 안정화 이벤트 리스너
  window.addEventListener("blur", releaseHandle);
  cnv.elt.addEventListener("mouseleave", releaseHandle);
}

function detectLuminositySupport() {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const ctx = c.getContext("2d");
  // 바닥(빨강)
  ctx.fillStyle = "rgb(200,0,0)";
  ctx.fillRect(0, 0, 2, 2);
  // 위에 어두운 회색 소스
  const s = document.createElement("canvas");
  s.width = s.height = 2;
  const sx = s.getContext("2d");
  sx.fillStyle = "rgb(40,40,40)";
  sx.fillRect(0, 0, 2, 2);
  ctx.globalCompositeOperation = "luminosity";
  ctx.drawImage(s, 0, 0);
  const p = ctx.getImageData(1, 1, 1, 1).data; // [r,g,b,a]
  // 지원되면 빨강의 명도가 확 낮아져 r 값이 크게 내려갑니다.
  return p[0] < 120;
}

function draw() {
  // === 청소 소리 볼륨 페이드 인/아웃 처리 ===
  if (isCleaningPlaying && cleanSound) {
    const elapsed = millis() - cleanSoundStartTime; // 경과 시간 (ms)
    if (elapsed >= 3000) {
      // 3초가 지나면 정지
      if (cleanSound && typeof cleanSound.stop === "function") {
        cleanSound.stop();
      }
      isCleaningPlaying = false;
    } else {
      // 볼륨 페이드 인/아웃 계산
      let volume = 1;
      if (elapsed < 1500) {
        // 첫 1.5초: 0 → 1 (페이드 인)
        volume = elapsed / 1500;
      } else {
        // 마지막 1.5초: 1 → 0 (페이드 아웃)
        volume = 1 - (elapsed - 1500) / 1500;
      }
      if (cleanSound && typeof cleanSound.setVolume === "function") {
        cleanSound.setVolume(volume);
      }
    }
  }

  // === CD Player 회전 업데이트 ===
  if (isPlaying) {
    // 재생 중이면 계속 회전
    rotationSpeed = lerp(rotationSpeed, 2.0, 0.05);
  } else {
    // 평상시엔 천천히 감속
    rotationSpeed = lerp(rotationSpeed, 0, 0.08);
  }
  angle += rotationSpeed;

  // 🔧 바닥은 항상 기본 블렌드 & 전역 알파 1로 초기화 (CD 뒤에서만 밝아 보이는 이슈 방지)
  blendMode(BLEND);
  drawingContext.globalAlpha = 1;

  // === 배경: 나무 마루 패턴 (행마다 어긋나도록 타일 시작 오프셋 적용) ===
  if (woodFloorBuffer) {
    for (let y = 0, row = 0; y < height; y += woodFloorBuffer.height, row++) {
      // 행마다 반 타일만큼 번갈아 어긋나게 + 노이즈로 추가 변주
      const stagger = (row % 2) * (woodFloorBuffer.width * 0.5);

      // 🔧 지터/오프셋을 정수 스냅해서 서브픽셀 틈 방지
      const jitterFloat = noise(row * 0.37) * woodFloorBuffer.width;
      const jitter = Math.round(jitterFloat) % woodFloorBuffer.width;

      const startX = Math.round(-((stagger + jitter) % woodFloorBuffer.width));
      const yy = Math.round(y);

      for (let x = startX; x < width; x += woodFloorBuffer.width) {
        image(woodFloorBuffer, Math.round(x), yy);
      }
    }
  }

  // === 상태별 업데이트 ===
  const MAX_DUST = 260,
    MAX_SPARK = 120;

  if (mode === MODE.VACUUM) {
    for (let i = dusts.length - 1; i >= 0; i--) {
      const dead = dusts[i].suckToCenter();
      if (dead) dusts.splice(i, 1);
    }
    if (dusts.length === 0) {
      // 먼지 다 사라졌지만, 아직 큰 반짝은 금지
      setMode(MODE.READY);
    }
  } else if (mode === MODE.DIRTY) {
    for (let d of dusts) d.update();
    if (dusts.length > MAX_DUST) dusts.splice(0, dusts.length - MAX_DUST);
  }

  // 물리 업데이트
  if (window.CDPlayer && CDPlayer.updatePhysics) {
    CDPlayer.updatePhysics();
  }

  // 먼지 렌더
  for (let d of dusts) d.display();

  // === 합성: 젖은 레이어 ===
  push();
  drawingContext.save();
  // 효과 강도(전역 알파) 크게 줘서 확 보이게
  drawingContext.globalAlpha = WET_STRENGTH;
  // 1) 명도(또는 폴백 블렌드) 적용
  drawingContext.globalCompositeOperation = WET_BLEND;
  image(wetLumLayer, 0, 0);
  // 2) 물막 하이라이트는 아주 약하게 screen
  drawingContext.globalCompositeOperation = "screen";
  drawingContext.globalAlpha = 0.18; // 약하게
  image(wetShineLayer, 0, 0);
  drawingContext.restore();
  pop();

  // 큰 마무리 반짝
  for (let i = sparkles.length - 1; i >= 0; i--) {
    sparkles[i].update();
    sparkles[i].display();
    if (sparkles[i].isDead()) sparkles.splice(i, 1);
  }
  if (sparkles.length > MAX_SPARK)
    sparkles.splice(0, sparkles.length - MAX_SPARK);

  // === CDPlayer 렌더링은 맨 마지막 ===
  if (window.CDPlayer && window.CDPlayer.drawDevice) {
    window.CDPlayer.drawDevice({
      cx: width / 2,
      cy: height / 2,
      handleSize: 26,
      angleDeg: angle,
      onPullEnd: window.currentOnPullEnd,
    });
  }

  // --- 젖음 메타 감소 ---
  wetMeter = Math.max(0, wetMeter - WET_DECAY);

  // SHINE 모드가 끝나면 자국 정리하고 DIRTY로
  if (mode === MODE.SHINE && sparkles.length === 0) {
    // 물자국 아주 옅은 찌꺼기까지 정리 (자연스러운 느낌 유지하면서 마무리)
    forceFinishEvap();
    wetMeter = 0;
    setMode(MODE.DIRTY);
  }

  // === 프레임 마지막: 젖은 레이어 증발(점점 사라짐) ===
  if (frameCount % 3 === 0) {
    // 매 3프레임에 한 번만 증발 (더 오래감)
    evaporateWetLayersEdgeFirst();
  }
}

/* =======================
   나무 마루바닥 텍스처
   ======================= */
function createWoodFloor() {
  const patternWidth = 320;
  const patternHeight = 100;
  woodFloorBuffer = createGraphics(patternWidth, patternHeight);

  // 🔧 버퍼도 스무딩 비활성화
  woodFloorBuffer.drawingContext.imageSmoothingEnabled = false;

  const ctx = woodFloorBuffer.drawingContext;

  // 더 어두운 톤의 팔레트 생성 + 매번 다른 배치가 되도록 섞기
  const colors = [
    { top: [120, 78, 44], bottom: [92, 58, 34] },
    { top: [132, 88, 52], bottom: [100, 66, 40] },
    { top: [115, 74, 42], bottom: [88, 56, 32] },
    { top: [126, 82, 48], bottom: [96, 62, 38] },
  ]
    .map((c) => {
      // 팔레트 지터(소폭 랜덤)로 매번 차이를 부여
      function j(v) {
        return constrain(v + Math.floor(random(-10, 6)), 0, 255);
      }
      return {
        top: [j(c.top[0]), j(c.top[1]), j(c.top[2])],
        bottom: [j(c.bottom[0]), j(c.bottom[1]), j(c.bottom[2])],
      };
    })
    .sort(() => Math.random() - 0.5);

  function drawPlank(x, y, w, h, idx) {
    const base = colors[idx % colors.length];
    // 플랭크 단위로 아주 미세한 명도 변화를 추가
    function j(v) {
      return constrain(v + Math.floor(random(-8, 9)), 0, 255);
    }
    const c = {
      top: [j(base.top[0]), j(base.top[1]), j(base.top[2])],
      bottom: [j(base.bottom[0]), j(base.bottom[1]), j(base.bottom[2])],
    };
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, `rgb(${c.top})`);
    g.addColorStop(1, `rgb(${c.bottom})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // 🔧 타일 이을 때 보이는 경계선 방지: stroke를 1px inset
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  // 바탕 톤을 더 어둡게
  woodFloorBuffer.background(118, 78, 44);
  // 줄 1
  drawPlank(0, 0, 140, 25, 0);
  drawPlank(140, 0, 100, 25, 2);
  drawPlank(240, 0, 80, 25, 1);
  // 줄 2
  drawPlank(-40, 25, 120, 25, 3);
  drawPlank(80, 25, 140, 25, 1);
  drawPlank(220, 25, 140, 25, 2);
  // 줄 3
  drawPlank(0, 50, 160, 25, 0);
  drawPlank(160, 50, 160, 25, 3);
  // 줄 4
  drawPlank(-20, 75, 100, 25, 1);
  drawPlank(80, 75, 120, 25, 2);
  drawPlank(200, 75, 140, 25, 0);

  // 질감 오버레이 (진한 배경에 맞게 조정)
  for (let y = 0; y < patternHeight; y += 6) {
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, y, patternWidth, 2);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, y + 2, patternWidth, 2);
    ctx.fillStyle = "rgba(255,255,255,0.015)";
    ctx.fillRect(0, y + 4, patternWidth, 2);
  }

  // 🔧 타일 경계 블리드(무늬 연장)로 심리스 보정
  makeSeamless(woodFloorBuffer);
}

// 🔧 심리스 타일을 위한 1px 블리드 함수
function makeSeamless(g) {
  const ctx = g.drawingContext;
  const w = g.width,
    h = g.height;

  // 좌측 1px 컬럼을 우측 테두리에 복사
  ctx.drawImage(g.canvas, 0, 0, 1, h, w - 1, 0, 1, h);
  // 우측 1px 컬럼을 좌측 테두리에 복사
  ctx.drawImage(g.canvas, w - 1, 0, 1, h, 0, 0, 1, h);

  // 상단 1px 로우를 하단 테두리에 복사
  ctx.drawImage(g.canvas, 0, 0, w, 1, 0, h - 1, w, 1);
  // 하단 1px 로우를 상단 테두리에 복사
  ctx.drawImage(g.canvas, 0, h - 1, w, 1, 0, 0, w, 1);
}

/* =======================
   입력 이벤트
   ======================= */
function onPointerDown(e) {
  const x = e.offsetX,
    y = e.offsetY;
  pointers.set(e.pointerId, { x, y, isDraggingHandle: false });
  lastPointer.set(e.pointerId, { x, y });

  // 1) 슬라이더 먼저 처리 (가장 우선순위)
  if (CDPlayer && CDPlayer.handleOpacityInteraction) {
    CDPlayer.handleOpacityInteraction(x, y, true);

    if (CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
      const mc = CDPlayer.getMouseConstraint();
      if (mc && mc.mouse) {
        mc.mouse.pressed = false;
        mc.mouse.button = -1;
      }
      return;
    }
  }

  // 중앙 버튼: READY일 때만 SHINE 허용 (FADE_OUT 진행 중엔 무시)
  const d = dist(x, y, width / 2, height / 2);
  if (d < 80 && mode === MODE.READY) {
    // 마무리 반짝 시작
    setMode(MODE.SHINE);
    isPlaying = false; // 회전 멈춤
    dusts = [];
    if (sparkleSound) sparkleSound.play();
    // 바닥 전체 반짝
    for (let i = 0; i < 80; i++) {
      sparkles.push(new Sparkle(random(width), random(height)));
    }
    return;
  }

  // CD 손잡이
  const h = window.CDPlayer ? CDPlayer.getHandle() : null;
  if (h) {
    const dh = dist(x, y, h.position.x, h.position.y);
    if (dh < 80) {
      isDraggingHandle = true;
      if (CDPlayer && CDPlayer.handlePointerDown) {
        CDPlayer.handlePointerDown(x, y);
      }
      const p = pointers.get(e.pointerId);
      if (p) {
        p.isDraggingHandle = true;
        pointers.set(e.pointerId, p);
      }
      startDragWatch(); // 워치독 시작
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

    if (!p.isDraggingHandle) {
      if (mode === MODE.DIRTY) {
        // 먼지 생성 (성능 보호)
        const add = 2;
        for (let i = 0; i < add; i++) {
          if (dusts.length < 260)
            dusts.push(new Dust(x + random(-12, 12), y + random(-12, 12)));
        }
      } else if (mode === MODE.VACUUM || mode === MODE.READY) {
        // 물걸레로 젖은 흔적 남기기
        paintWetStroke(e.pointerId, x, y);
      }
      // SHINE에서는 입력 무시(자연스러운 피니시)
    }
  }

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
    if (CDPlayer && CDPlayer.handlePointerMove) {
      CDPlayer.handlePointerMove(x, y);
    }

    // 워치독 틱 (드래그 중이면 자동 갱신)
    if (isDraggingHandle) {
      tickDragWatch();
    }
  }
}

function onPointerUp(e) {
  stopDragWatch(); // 워치독 해제

  // 슬라이더 드래그 중지 먼저 체크
  if (CDPlayer && CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
    if (CDPlayer.stopOpacityDrag) {
      CDPlayer.stopOpacityDrag();
    }
    pointers.delete(e.pointerId);
    return;
  }

  if (!isDraggingHandle) {
    pointers.delete(e.pointerId);
    lastPointer.delete(e.pointerId);
    return;
  }
  if (CDPlayer && CDPlayer.handlePointerUp) {
    CDPlayer.handlePointerUp(e.offsetX, e.offsetY);
  }
  // 재생 중이 아닐 때 핸들을 탄성 복귀
  if (!isPlaying && window.CDPlayer && CDPlayer.startSnapBack) {
    CDPlayer.startSnapBack();
  }
  isDraggingHandle = false;
  pointers.delete(e.pointerId);
  lastPointer.delete(e.pointerId);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cnv.style("width", "100vw");
  cnv.style("height", "100vh");

  // wetLumLayer 리사이즈
  const nl = createGraphics(windowWidth, windowHeight);
  nl.pixelDensity(1);
  nl.clear();
  nl.image(wetLumLayer, 0, 0, nl.width, nl.height);
  wetLumLayer = nl;

  // wetShineLayer 리사이즈
  const ns = createGraphics(windowWidth, windowHeight);
  ns.pixelDensity(1);
  ns.clear();
  ns.image(wetShineLayer, 0, 0, ns.width, ns.height);
  wetShineLayer = ns;

  // evapBuf 리사이즈
  evapBuf = createGraphics(
    Math.ceil(windowWidth / 3),
    Math.ceil(windowHeight / 3)
  );
  evapBuf.pixelDensity(1);

  if (window.CDPlayer && CDPlayer.resetHandle) {
    CDPlayer.resetHandle(width, height);
  }
}

/* =======================
   에지 우선 증발 (가장자리부터 마르는 효과)
   ======================= */
function evaporateWetLayersEdgeFirst() {
  // 1) 젖은 레이어를 저해상도 버퍼로 다운샘플 (알파만 거칠게 추출)
  evapBuf.clear();
  // 젖은(명도) 레이어만 보면 충분
  evapBuf.push();
  // 약간 흐리게 (가장자리 감쇠를 위해)
  evapBuf.drawingContext.filter = "blur(1.2px)"; // 가벼운 블러
  evapBuf.image(wetLumLayer, 0, 0, evapBuf.width, evapBuf.height);
  evapBuf.pop();

  // 2) 노이즈 + 가장자리 편향으로 아주 얇게 깎아내기
  const ctxL = wetLumLayer.drawingContext;
  ctxL.save();
  ctxL.globalCompositeOperation = "destination-out";
  ctxL.globalAlpha = 0.05; // 약간 빠른 증발 (0.04 → 0.05)

  // 스케일업해서 덮는 동안 약간의 요철(노이즈) 부여
  for (let i = 0; i < 2; i++) {
    // 살짝 다른 스케일/오프셋로 두 번
    const w = width * (1 + i * 0.02);
    const h = height * (1 + i * 0.02);
    const ox = -(w - width) * 0.5 + (i ? 7 : -7);
    const oy = -(h - height) * 0.5 + (i ? -5 : 5);
    ctxL.drawImage(
      evapBuf.canvas,
      0,
      0,
      evapBuf.width,
      evapBuf.height,
      ox,
      oy,
      w,
      h
    );
  }
  ctxL.restore();

  // 3) 하이라이트 레이어는 더 느리게 (막이 마르듯)
  const ctxS = wetShineLayer.drawingContext;
  ctxS.save();
  ctxS.globalCompositeOperation = "destination-out";
  ctxS.globalAlpha = 0.03; // 약간 빠른 증발 (0.02 → 0.03)
  ctxS.drawImage(
    evapBuf.canvas,
    0,
    0,
    evapBuf.width,
    evapBuf.height,
    0,
    0,
    width,
    height
  );
  ctxS.restore();
}

/* =======================
   빠른 마무리 증발
   ======================= */
function forceFinishEvap() {
  // 남은 자국을 10~15프레임 정도 빠르게 증발시켜서 "잔상 없이" 사라지게
  for (let i = 0; i < 12; i++) {
    fastEvaporateStep();
  }
}

// 평소보다 조금 강한 증발 한 스텝
function fastEvaporateStep() {
  // 명도 레이어
  const ctxL = wetLumLayer.drawingContext;
  ctxL.save();
  ctxL.globalCompositeOperation = "destination-out";
  ctxL.globalAlpha = 0.08; // 보통보다 강하게
  ctxL.fillRect(0, 0, wetLumLayer.width, wetLumLayer.height);
  ctxL.restore();

  // 하이라이트 레이어
  const ctxS = wetShineLayer.drawingContext;
  ctxS.save();
  ctxS.globalCompositeOperation = "destination-out";
  ctxS.globalAlpha = 0.06;
  ctxS.fillRect(0, 0, wetShineLayer.width, wetShineLayer.height);
  ctxS.restore();
}

/* =======================
   먼지 (스파이럴 흡입)
   ======================= */
class Dust {
  constructor(x, y) {
    this.cx = () => width / 2;
    this.cy = () => height / 2;
    const dx = x - this.cx(),
      dy = y - this.cy();
    this.r = Math.sqrt(dx * dx + dy * dy);
    this.theta = Math.atan2(dy, dx);

    this.angVel = random(0.01, 0.03);
    this.spinUp = random(0.003, 0.008);
    this.radVel = 0;
    this.suction = random(0.08, 0.16);

    this.size = random(8, 20);
    this.alpha = random(100, 200);
    this.wobble = random(1000);

    // 회색조에서 다양한 명암 (흰색에 가까운 밝은 회색부터 검은색에 가까운 매우 어두운 회색까지)
    const brightness = random();
    if (brightness < 0.15) {
      // 매우 밝은 회색
      this.color = [random(220, 250), random(220, 250), random(220, 250)];
    } else if (brightness < 0.35) {
      // 밝은 회색
      this.color = [random(170, 210), random(170, 210), random(170, 210)];
    } else if (brightness < 0.6) {
      // 중간 회색
      this.color = [random(100, 160), random(100, 160), random(100, 160)];
    } else if (brightness < 0.8) {
      // 어두운 회색
      this.color = [random(50, 90), random(50, 90), random(50, 90)];
    } else {
      // 매우 어두운 회색 (거의 검은색)
      this.color = [random(15, 40), random(15, 40), random(15, 40)];
    }
  }
  update() {
    const j = (noise(this.wobble) - 0.5) * 2.0;
    const k = (noise(this.wobble + 999) - 0.5) * 2.0;
    this.wobble += 0.02;
    this.r += j * 0.4;
    this.theta += k * 0.02;
    this.r = constrain(this.r, 0, max(width, height) * 0.8);
  }
  suckToCenter() {
    this.angVel = min(this.angVel + this.spinUp, 0.45);
    this.radVel = max(
      this.radVel - (this.suction * 0.06 + this.r * 0.0009),
      -12
    );
    this.theta += this.angVel;
    this.r += this.radVel;
    this.theta += (noise(this.wobble) - 0.5) * 0.02;
    this.r += (noise(this.wobble + 333) - 0.5) * 0.3;
    this.wobble += 0.05;
    return this.r < 16;
  }
  display() {
    const x = this.cx() + Math.cos(this.theta) * this.r;
    const y = this.cy() + Math.sin(this.theta) * this.r;
    push();
    translate(x, y);
    noStroke();
    for (let i = 0; i < 3; i++) {
      fill(this.color[0], this.color[1], this.color[2], this.alpha / (i + 1));
      ellipse(0, 0, this.size * (1.2 - i * 0.3));
    }
    pop();
  }
}

/* =======================
   물걸레 관련 함수
   ======================= */
function paintWetStroke(id, x, y) {
  const prev = lastPointer.get(id);
  // 첫 스탬프면 현재만 찍고 저장
  if (!prev) {
    stampWetBrush(x, y, 0);
    lastPointer.set(id, { x, y });
    return;
  }
  const dx = x - prev.x,
    dy = y - prev.y;
  const distLen = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.floor(distLen / BRUSH_SPACING));
  const ang = Math.atan2(dy, dx);

  for (let i = 1; i <= steps; i++) {
    const sx = prev.x + (dx * i) / steps;
    const sy = prev.y + (dy * i) / steps;
    stampWetBrush(sx, sy, ang);
  }
  lastPointer.set(id, { x, y });
}

function stampWetBrush(cx, cy, angle) {
  // === A) 명도 레이어(회색) : 중앙 어둡고 가장자리로 부드럽게 ===
  {
    const ctx = wetLumLayer.drawingContext;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const rx = BRUSH_RADIUS * 1.85; // 반경 확장
    const ry = BRUSH_RADIUS * 1.05; // 반경 확장

    // 회색 그라디언트: 어두운 회색(젖음) → 밝은 회색(거의 영향 없음)
    const grad = ctx.createRadialGradient(0, 0, ry * 0.2, 0, 0, rx);
    grad.addColorStop(0.0, "rgba(25,25,25,1.0)"); // 더 진하게
    grad.addColorStop(0.55, "rgba(60,60,60,0.8)"); // 더 진하고 두껍게
    grad.addColorStop(1.0, "rgba(128,128,128,0.0)"); // 에지 투명
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // === B) 하이라이트 레이어(미세한 광택) : 방향성 살짝 ===
  {
    const ctx = wetShineLayer.drawingContext;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const rx = BRUSH_RADIUS * 1.2;
    const ry = BRUSH_RADIUS * 0.55;

    const shine = ctx.createLinearGradient(
      -rx * 0.3,
      -ry * 0.2,
      rx * 0.5,
      ry * 0.3
    );
    shine.addColorStop(0.0, "rgba(255,255,255,0.22)");
    shine.addColorStop(0.8, "rgba(255,255,255,0.0)");
    ctx.fillStyle = shine;

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 젖은 양/시간 기록
  wetMeter += WET_IMPULSE;
  lastWetStampFrame = frameCount;
}

/* =======================
   큰 마무리 반짝 (정지 버튼)
   ======================= */
class Sparkle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = random(2, 12);
    this.life = random(40, 70);
    this.alpha = 255;
    this.angle = random(TWO_PI);
    this.rotVel = random(-0.25, 0.25);
  }
  update() {
    this.life--;
    this.alpha = map(this.life, 0, 60, 0, 255);
    this.angle += this.rotVel;
  }
  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    stroke(255, this.alpha);
    strokeWeight(1.2);
    line(-this.r, 0, this.r, 0);
    line(0, -this.r, 0, this.r);
    point(0, 0);
    pop();
  }
  isDead() {
    return this.life <= 0;
  }
}
