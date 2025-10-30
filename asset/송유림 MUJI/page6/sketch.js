// === Page 6: Wave & Rainbow Effect - CD Player 기반 파동 효과 ===

let particles = []; // 점 번짐 효과를 위한 파티클 배열
let isRainbow = false;
let hueBase = 210; // 기본 파란색 (HSB hue)
let hueShift = 210;
let rainbowPhase = 0;

let cnv;
let isDraggingHandle = false;
let lastMouseX = 0;
let lastMouseY = 0;

// CDPlayer 회전
let angle = 0;
let rotationSpeed = 0;
let isPlaying = false;

// 끊김 없는 드로잉 상태
let isDrawing = false;
const STROKE_SPACING = 10; // 점 간 간격
let lastDraw = new Map(); // pointerId -> {x,y}

// === Graphics ===
let bgBuffer; // 배경용 버퍼

// 포인터 처리
let pointers = new Map();

// === 메시지 드론쇼 효과 ===
let messageText = "";
let messageChars = []; // 캐릭터별 상태 배열
let messagePhase = 0; // 0: 대기, 1: 나타나는 중, 2: 파티클 변환 중
let messageParticles = []; // 메시지 파티클 배열
let messageFont; // cachildren modu 폰트
let messageWaitFrames = 0; // 파티클 전환 대기 프레임

function preload() {
  // cachildren modu 폰트 로드
  messageFont = loadFont("../assets/fonts/cachildren modu.ttf");
}

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);

  // HSB 색상 모드 (Hue: 0-360, Saturation: 0-100, Brightness: 0-100, Alpha: 0-100)
  colorMode(HSB, 360, 100, 100, 100);

  // 배경 버퍼 초기화
  bgBuffer = createGraphics(width, height);
  bgBuffer.pixelDensity(1);

  // 컬러모드를 설정된 메인 캔버스와 동일하게
  bgBuffer.colorMode(HSB, 360, 100, 100, 100);

  // CDPlayer 초기화 (page5 방식)
  if (window.CDPlayer && window.CDPlayer.initializePhysics) {
    window.CDPlayer.initializePhysics();
    // 내부(p5) 토글 숨기기, CSS 토글 사용
    if (window.CDPlayer.setOpacityControlEnabled) {
      window.CDPlayer.setOpacityControlEnabled(false);
    }
    // 불투명도 설정 (다른 페이지와 비슷하게)
    if (window.CDPlayer.setOpacity) {
      window.CDPlayer.setOpacity(1.0); // 전체 불투명
    }
  }

  // CSS 토글 DOM과 연동 (page5 방식)
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

  // 핸들 당기면 무지개 모드 토글 (page5 onPullEnd 방식)
  window.currentOnPullEnd = (pullDistance) => {
    handlePullEnd(pullDistance);
  };

  // pointer 이벤트 리스너 추가 (page5 방식)
  cnv.elt.addEventListener("pointerdown", onPointerDown);
  cnv.elt.addEventListener("pointermove", onPointerMove);
  cnv.elt.addEventListener("pointerup", onPointerUp);
  cnv.elt.addEventListener("pointercancel", onPointerUp);

  // 드래그 안정화 이벤트 리스너
  window.addEventListener("blur", releaseHandle);
  cnv.elt.addEventListener("mouseleave", releaseHandle);
}

/* =======================
   센터 정지 버튼 유틸
   ======================= */
function getCDCenter() {
  if (window.CDPlayer && window.CDPlayer.getAnchor) {
    const a = window.CDPlayer.getAnchor();
    if (a) return a;
  }
  return { x: width / 2, y: height / 2 };
}

function isCenterPress(x, y, r = 80) {
  const c = getCDCenter();
  return dist(x, y, c.x, c.y) < r;
}

// 재생/무지개/회전 모두 "즉시 정지"
function stopPlayback({ clearParticles = false } = {}) {
  isPlaying = false;
  rotationSpeed = 0;
  isRainbow = false;
  rainbowPhase = 0;
  if (clearParticles) particles = [];

  // 메시지 파티클은 항상 제거
  particles = particles.filter((p) => !p.isMessageParticle);

  // 메시지 상태 초기화
  messagePhase = 0;
  messageText = "";
  messageChars = [];

  // Matter가 뭔가 잡고 있으면 해제
  if (window.CDPlayer && window.CDPlayer.getMouseConstraint) {
    const mc = window.CDPlayer.getMouseConstraint();
    if (mc && mc.mouse) {
      mc.mouse.pressed = false;
      mc.mouse.button = -1;
    }
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

function onPointerDown(e) {
  e.preventDefault();
  e.stopPropagation();

  const x = e.offsetX;
  const y = e.offsetY;
  pointers.set(e.pointerId, { x, y, isDraggingHandle: false });

  // ✅ 1) 중앙 정지 버튼이 최우선
  if (isCenterPress(x, y, 80)) {
    stopPlayback({ clearParticles: false }); // 필요하면 true로 바꾸면 잔상도 지움
    return; // CDPlayer나 그리기 로직에 이벤트 넘기지 않음
  }

  // 2) CD 핸들/디바이스 상호작용
  if (window.CDPlayer && window.CDPlayer.handlePointerDown) {
    window.CDPlayer.handlePointerDown(x, y);
  }

  // 3) 트레일 드로잉 시작 (센터가 아니고 핸들 안끌 때)
  isDrawing = true;
  lastDraw.set(e.pointerId, { x, y });
  // 눌렀을 때 첫 포인트 살짝
  spawnTrailPoint(x, y);
}

function onPointerMove(e) {
  e.preventDefault();
  e.stopPropagation();

  const x = e.offsetX;
  const y = e.offsetY;

  if (pointers.has(e.pointerId)) {
    const p = pointers.get(e.pointerId);
    p.x = x;
    p.y = y;
    pointers.set(e.pointerId, p);
  }

  // CD Player 상호작용
  if (window.CDPlayer && window.CDPlayer.handlePointerMove) {
    window.CDPlayer.handlePointerMove(x, y);
  }

  // ✅ 드로잉: 마지막 점에서 현재 점까지 일정 간격으로 보간하여 부드럽게 이어 그리기
  if (isDrawing && lastDraw.has(e.pointerId)) {
    const prev = lastDraw.get(e.pointerId);
    const dx = x - prev.x;
    const dy = y - prev.y;
    const distLen = Math.hypot(dx, dy);
    if (distLen >= STROKE_SPACING * 0.5) {
      const steps = Math.max(1, Math.floor(distLen / STROKE_SPACING));
      for (let i = 1; i <= steps; i++) {
        const sx = prev.x + (dx * i) / steps;
        const sy = prev.y + (dy * i) / steps;
        spawnTrailPoint(sx, sy);
      }
      lastDraw.set(e.pointerId, { x, y });
    }
  }

  // (선택) 화면 아무 곳 터치 파동 - 너무 과하면 아래 블록은 꺼도 됨
  const c = getCDCenter();
  const distFromCenter = dist(x, y, c.x, c.y);
  const minDist = 150;
  if (distFromCenter > minDist) {
    spawnParticleExplosion(x, y, isRainbow ? 8 : 5, 20);
  }
}

function onPointerUp(e) {
  e.preventDefault();
  e.stopPropagation();

  if (window.CDPlayer && window.CDPlayer.handlePointerUp) {
    window.CDPlayer.handlePointerUp(e.offsetX, e.offsetY);
  }

  isDraggingHandle = false;
  isDrawing = false;
  pointers.delete(e.pointerId);
  lastDraw.delete(e.pointerId);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bgBuffer = createGraphics(width, height);
  bgBuffer.pixelDensity(1);
  bgBuffer.colorMode(HSB, 360, 100, 100, 100);

  // ✅ 캔버스 크기 바뀌면 CDPlayer의 앵커/핸들도 새 좌표로 리셋
  if (window.CDPlayer && window.CDPlayer.resetHandle) {
    window.CDPlayer.resetHandle(width, height);
  }
}

function draw() {
  // ✅ CDPlayer 물리 업데이트 (반드시 매 프레임 호출)
  if (window.CDPlayer && window.CDPlayer.updatePhysics) {
    window.CDPlayer.updatePhysics();
  }

  // 잔상 효과를 위한 반투명 배경 (알파 낮춰서 파티클이 잘 보이도록)
  background(0, 0, 0, 5); // 검은색, 5% 투명도 (잔상 유지)

  // CD Player 회전 업데이트 (page5 방식)
  if (isPlaying) {
    // 재생 중이면 계속 회전
    rotationSpeed = lerp(rotationSpeed, 2.0, 0.05);
  } else {
    // 평상시엔 천천히 감속
    rotationSpeed = lerp(rotationSpeed, 0, 0.08);
  }
  angle += rotationSpeed;
  if (angle >= 360) angle -= 360;

  // 무지개 모드일 때 색상 변화 및 기존 파티클 변환
  if (isRainbow) {
    rainbowPhase = (rainbowPhase + 2) % 360;
    hueBase = rainbowPhase;

    // 기존 파티클들을 무지개 색으로 변환 (일렁이는 효과)
    for (let p of particles) {
      if (!p.hue) {
        // 아직 무지개 색이 아니면 변환
        p.hue = (rainbowPhase + p.life * 2) % 360;
      } else {
        // 이미 무지개 색이면 계속 변화
        p.hue = (p.hue + 3) % 360;
      }
    }
  } else {
    hueBase = 210; // 파란색으로 고정
  }

  // 파티클 업데이트 및 그리기
  updateAndDrawParticles();

  // CD Player 그리기 (page5 방식) - blendMode 복구 후 렌더링
  blendMode(BLEND); // 블렌드 모드 복구
  if (window.CDPlayer && window.CDPlayer.drawDevice) {
    window.CDPlayer.drawDevice({
      cx: width / 2,
      cy: height / 2,
      handleSize: 26,
      angleDeg: angle,
      onPullEnd: window.currentOnPullEnd,
      bgBlur: bgBuffer, // ✅ 배경 버퍼로 글래스 효과 강화
      bgBuffer: bgBuffer,
    });
  }

  // 회전 중일 때 무지개 파티클 생성 (색상 변하는 인터렉션)
  if (isPlaying && isRainbow) {
    if (frameCount % 3 === 0) {
      // 매 3프레임마다 생성하여 부드러운 효과
      const cx = width / 2;
      const cy = height / 2;
      const spawnAngle = radians(angle + random(-30, 30));
      const spawnDist = 90 + random(-30, 30);

      for (let i = 0; i < 4; i++) {
        const a = spawnAngle + radians(i * 15);
        const d = spawnDist + i * 5;
        const x = cx + cos(a) * d;
        const y = cy + sin(a) * d;

        particles.push({
          x: x,
          y: y,
          size: random(6, 15),
          life: 0,
          maxLife: random(60, 90),
          hue: (rainbowPhase + i * 15) % 360,
        });
      }
    }
  }

  // 메시지 렌더링
  drawMessage();
}

function updateAndDrawParticles() {
  blendMode(ADD); // 블렌드 모드로 빛 번짐 효과

  noStroke();

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    // 수명 감소
    p.life++;

    // 파티클이 살아있으면 그리기
    if (p.life < p.maxLife) {
      // 투명도 계산 (점점 사라지도록)
      const alpha = map(p.life, 0, p.maxLife, 100, 0);

      // 색상 계산 (무지개 모드일 때 hue가 변함)
      // 파티클에 고정 hue가 있으면 그것을 사용, 없으면 기본 hue 사용
      const hue =
        p.hue !== undefined
          ? p.hue
          : isRainbow
          ? (hueBase + p.life * 2) % 360
          : hueBase;

      // 크기 증가 (점점 커지도록)
      const size = map(p.life, 0, p.maxLife, 2, p.size);

      // 색상 설정
      fill(hue, 80, 100, alpha);

      // 점 그리기
      ellipse(p.x, p.y, size);

      // 움직임 처리
      if (p.vx !== undefined && p.vy !== undefined) {
        // vx, vy 속도가 있으면 그것을 사용
        p.x += p.vx;
        p.y += p.vy;
        // 점점 느려지도록
        p.vx *= 0.98;
        p.vy *= 0.98;
      } else {
        // 기존 방식: 부드러운 자연스러운 움직임
        p.x += random(-0.3, 0.3);
        p.y += random(-0.3, 0.3);
      }
    } else {
      // 수명이 다하면 제거
      // 메시지 파티클이 사라질 때 작은 "핑" 소리 생성
      if (p.isMessageParticle && random() < 0.05) {
        // 랜덤하게 5% 확률로만 소리 나기 (너무 많은 소리 방지)
        const osc = new p5.Oscillator("sine");
        osc.freq(random(800, 1200)); // 높은 톤
        osc.amp(0.1); // 작은 볼륨
        osc.start();
        osc.stop(0.01); // 매우 짧게
      }

      particles.splice(i, 1);
    }
  }

  blendMode(BLEND); // 원래 블렌드 모드로 복귀
}

function handlePullEnd(pullDistance) {
  console.log("Pull distance:", pullDistance);

  // 핸들을 충분히 당긴 경우 무지개 모드 토글
  if (pullDistance > 10) {
    isRainbow = !isRainbow;

    if (isRainbow) {
      // 무지개 모드 활성화 - 파티클 생성
      spawnParticleExplosion(width / 2, height / 2, 150, 80);
      isPlaying = true;
      rotationSpeed = 2;
    } else {
      // 일반 모드로 복귀
      rainbowPhase = 0;
      isPlaying = false;
    }

    // 스냅백 시작
    if (window.CDPlayer && window.CDPlayer.startSnapBack) {
      window.CDPlayer.startSnapBack();
    }
  }
}

function spawnTrailPoint(x, y) {
  particles.push({
    x,
    y,
    size: random(3, 8),
    life: 0,
    maxLife: random(60, 90),
    // 무지개 모드일 때만 hue 지정, 아니면 기본값
    ...(isRainbow ? { hue: (rainbowPhase + random(-10, 10) + 360) % 360 } : {}),
  });
}

function spawnParticleExplosion(x, y, count, radius) {
  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const distance = random(radius);
    const px = x + cos(angle) * distance;
    const py = y + sin(angle) * distance;

    particles.push({
      x: px,
      y: py,
      size: random(4, 16),
      life: 0,
      maxLife: random(80, 120), // 더 오래 남도록
    });
  }
}

// === 메시지 드론쇼 처리 ===
function showMessage(text) {
  messageText = text;
  messageChars = [];
  messagePhase = 1; // 나타나는 중
  messageParticles = [];
  messageWaitFrames = 0; // 타이머 초기화

  // 캐릭터별 초기 상태 설정
  for (let i = 0; i < messageText.length; i++) {
    messageChars.push({
      char: messageText[i],
      alpha: 0,
      scale: 0,
      delay: i * 15, // 캐릭터마다 15프레임씩 지연
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      index: i,
    });
  }
}

function drawMessage() {
  if (messagePhase === 0) return;

  push();

  if (messagePhase === 1) {
    // 글자가 점점 나타나는 애니메이션
    drawMessageAppear();
  } else if (messagePhase === 2) {
    // 파티클로 변환되는 애니메이션
    drawMessageParticles();
  }

  pop();
}

function drawMessageAppear() {
  if (!messageFont) return;

  textFont(messageFont);
  textAlign(CENTER, CENTER);

  let allAppeared = true;
  const fontSize = 80;
  textSize(fontSize);

  for (let i = 0; i < messageChars.length; i++) {
    let char = messageChars[i];

    if (char.delay > 0) {
      char.delay--;
      allAppeared = false;
      continue;
    }

    // 알파와 스케일 증가
    char.alpha = min(char.alpha + 5, 100);
    char.scale = lerp(char.scale, 1, 0.1);

    if (char.alpha < 100 || char.scale < 0.99) {
      allAppeared = false;
    }

    // 텍스트 크기 계산
    const textW = textWidth(char.char);
    const textH = textAscent() + textDescent();

    // 전체 텍스트 너비 계산
    let totalWidth = 0;
    for (let j = 0; j < messageChars.length; j++) {
      if (messageChars[j].delay === 0) {
        totalWidth += textWidth(messageChars[j].char) * 1.2; // 1.2배 간격
      }
    }

    // 현재 캐릭터 위치 계산
    let xOffset = -totalWidth / 2 + textW / 2;
    for (let j = 0; j < i; j++) {
      if (messageChars[j].delay === 0) {
        xOffset += textWidth(messageChars[j].char) * 1.2;
      }
    }

    char.x = width / 2 + xOffset;
    char.y = height / 2 - 180; // 30픽셀 위로
    char.width = textW;
    char.height = textH;

    push();
    translate(char.x, char.y);
    scale(char.scale);

    // 무지개 색상 적용
    const hue = (hueBase + i * 30) % 360;
    fill(hue, 80, 100, char.alpha);
    noStroke();

    text(char.char, 0, 0);
    pop();
  }

  // 모두 나타났으면 파티클 단계로 전환
  if (allAppeared && messageChars.length > 0) {
    if (messageWaitFrames === 0) {
      messageWaitFrames = 60; // 60프레임 대기
    }
    messageWaitFrames--;

    if (messageWaitFrames <= 0) {
      messagePhase = 2;
      createMessageParticles();
    }
  }
}

function createMessageParticles() {
  // 글자 자체를 터치 파티클로 찍어낸다 - 훨씬 넓게 터지도록!
  textToTouchParticles(messageText, {
    size: 96,
    cell: 3, // 더 촘촘하게 (3픽셀마다 파티클)
    cx: width / 2,
    cy: height / 2 - 160,
    jitter: 4.0, // 훨씬 많이 퍼져나가게
    lifeMin: 100, // 더 오래 살아있게
    lifeMax: 180, // 더 오래 살아있게
    sizeMin: 5, // 파티클 크기도 더 크게
    sizeMax: 12,
  });
}

// 텍스트를 '터치 점 파티클'로 찍어내는 함수
function textToTouchParticles(
  text,
  {
    font = messageFont,
    size = 120,
    cell = 8,
    alphaThresh = 128,
    cx = width / 2,
    cy = height / 2,
    jitter = 0.8,
    lifeMin = 60,
    lifeMax = 90,
    sizeMin = 3,
    sizeMax = 8,
  } = {}
) {
  if (!font || !text || !text.length) return;

  // 1) 텍스트 폭/높이 계산
  const boundsArr = [...text].map((ch) => font.textBounds(ch, 0, 0, size));
  const tracking = 0.12; // 글자 사이 간격(폭 비율). 필요시 옵션화
  const totalWidth = boundsArr.reduce(
    (acc, b, i) => acc + b.w * (1 + (i < boundsArr.length - 1 ? tracking : 0)),
    0
  );

  // 2) 오프스크린 캔버스(여유 margin 포함)
  const pad = 20;
  const gW = Math.ceil(totalWidth + pad * 2);
  const gH = Math.ceil(size * 1.4 + pad * 2); // ascent/desc 보정치
  const g = createGraphics(gW, gH);
  g.pixelDensity(1);
  g.clear();
  g.colorMode(HSB, 360, 100, 100, 100);
  g.textFont(font);
  g.textSize(size);
  g.textAlign(LEFT, BASELINE);
  g.noStroke();
  g.fill(0, 0, 100, 100); // 흰 글자(알파 100)

  // 3) 텍스트를 왼쪽→오른쪽으로 렌더 (tracking 반영)
  let penX = pad;
  const baseY = pad + size; // 베이스라인: 상단 패딩 + 폰트크기
  for (let i = 0; i < text.length; i++) {
    g.text(text[i], penX, baseY);
    penX += boundsArr[i].w * (1 + (i < boundsArr.length - 1 ? tracking : 0));
  }

  // 4) 픽셀 읽고 격자로 샘플하여 파티클 생성
  g.loadPixels();

  // 화면 배치 좌표(전체 텍스트를 화면 중앙에 정렬)
  const startX = Math.floor(cx - gW / 2);
  const startY = Math.floor(cy - gH * 0.58); // 시각적 가운데 보정(경험값)

  for (let y = 0; y < gH; y += cell) {
    for (let x = 0; x < gW; x += cell) {
      const idx = (y * gW + x) * 4;
      const a = g.pixels[idx + 3];
      if (a >= alphaThresh) {
        const px = startX + x + random(-jitter, jitter);
        const py = startY + y + random(-jitter, jitter);

        // 메시지 파티클은 빠른 속도로 멀리 퍼지게 함
        const spreadAngle = random(TWO_PI); // 무작위 방향
        const spreadSpeed = random(1.5, 3.0); // 훨씬 빠르게 퍼짐

        particles.push({
          x: px,
          y: py,
          vx: cos(spreadAngle) * spreadSpeed,
          vy: sin(spreadAngle) * spreadSpeed,
          size: random(sizeMin, sizeMax),
          life: 0,
          maxLife: random(lifeMin, lifeMax),
          ...(isRainbow
            ? { hue: (hueBase + random(-10, 10) + 360) % 360 }
            : {}), // 무지개 모드면 색상 지정
          isMessageParticle: true,
        });
      }
    }
  }
}

function drawMessageParticles() {
  // 파티클들은 기존 particles 배열에 추가되었으므로
  // updateAndDrawParticles에서 자동으로 렌더링됨

  // 메시지 파티클이 모두 사라졌는지 확인
  let hasMessageParticles = false;
  for (let p of particles) {
    if (p.isMessageParticle && p.life < p.maxLife) {
      hasMessageParticles = true;
      break;
    }
  }

  if (!hasMessageParticles && messagePhase === 2) {
    messagePhase = 0;
    messageText = "";
    messageChars = [];
  }
}

// 전역 함수로 노출
window.sendMessageToDroneShow = function (text) {
  showMessage(text);
};

// === 터치/마우스 이벤트 (이중 호출 방지를 위해 비활성화) ===
// DOM 포인터 이벤트(cnv.elt.addEventListener)를 사용하므로 주석 처리
/*
function touchStarted() {
  handlePointerEvent(mouseX, mouseY, true);
}

function mousePressed() {
  handlePointerEvent(mouseX, mouseY, true);
}

function touchMoved() {
  handlePointerEvent(mouseX, mouseY, false);
}

function mouseDragged() {
  handlePointerEvent(mouseX, mouseY, false);
}

function touchEnded() {
  handlePointerEventEnd();
}

function mouseReleased() {
  handlePointerEventEnd();
}

function handlePointerEvent(x, y, isPressed) {
  // ✅ 항상 CDPlayer 쪽으로 먼저 포인터 전달
  if (window.CDPlayer) {
    if (isPressed && window.CDPlayer.handlePointerDown) {
      window.CDPlayer.handlePointerDown(x, y);
    } else if (!isPressed && window.CDPlayer.handlePointerMove) {
      window.CDPlayer.handlePointerMove(x, y);
    }
  }

  if (window.CDPlayer && window.CDPlayer.getAnchor) {
    const anchor = window.CDPlayer.getAnchor();

    if (anchor) {
      // 중앙 버튼 클릭 감지 (무지개 모드 해제)
      if (isPressed) {
        const distFromCenter = dist(x, y, anchor.x, anchor.y);
        const centerRadius = 40;

        if (distFromCenter < centerRadius) {
          console.log("Center button clicked");
          if (isRainbow) {
            // 무지개 모드 해제 및 파티클 클리어
            isRainbow = false;
            rainbowPhase = 0;
            particles = [];

            // 단일 파란 파동 생성
            spawnParticleExplosion(anchor.x, anchor.y, 50, 40);
          }
        }
      }

      // 화면 아무 곳이나 클릭하거나 드래그하면 파동 생성 (부드럽게 이어지는 효과)
      const distFromCenter = dist(x, y, anchor.x, anchor.y);
      const minDist = 150;

      if (distFromCenter > minDist) {
        if (isPressed) {
          // 클릭 위치에 파티클 생성
          spawnParticleExplosion(x, y, isRainbow ? 80 : 50, 50);
          lastMouseX = x;
          lastMouseY = y;
        } else {
          // 드래그 중 - 부드럽게 이어지는 파티클 생성
          const distFromLast = dist(x, y, lastMouseX, lastMouseY);
          if (distFromLast > 15) {
            // 마지막 위치에서 15px 이상 떨어지면 파티클 생성
            spawnParticleExplosion(x, y, isRainbow ? 30 : 20, 30);
            lastMouseX = x;
            lastMouseY = y;
          }
        }
      }
    }
  }
}

function handlePointerEventEnd() {
  // ✅ 드래그 종료를 CDPlayer에 알리기
  if (window.CDPlayer && window.CDPlayer.handlePointerUp) {
    window.CDPlayer.handlePointerUp(mouseX, mouseY);
  }
}
*/
