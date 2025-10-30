// Page 3: Drawing with Electric Effects
// 자유낙서 + CD 플레이어 끌어당기기 → 전기 구슬 낙하 & 튕김

let cnv;
let bgBuffer;
let strokeBuffer; // 스트로크 렌더 캐싱용 버퍼
let angle = 0;

// === Drawing (electric stroke) ===
let isDrawing = false;
let currentStroke = null; // {pts:[{x,y},...], segs:[{a,b,dx,dy,len,nx,ny}], age:0}
let strokes = []; // 완료된 스트로크들
let strokeGlow = 0; // 0~1: 전기효과 강도 (끌어당길 때 펌핑)
let strokeGlowDecay = 0.96; // 프레임당 감쇠

// === Electric Orbs ===
let orbs = []; // {x,y,vx,vy,r,life,glow}
const GRAVITY = 0.28; // 낙하 가속
const ORB_BOUNCE = 0.72; // 반발
const ORB_FRICTION = 0.996; // 공기저항

// === Constellation (별자리 배경) ===
let bgStars = []; // [{x,y,r,baseR,glow,phase,wall}]
let starLines = []; // [{i,j,alpha,t,_alphaNow}]
let isConstellationMode = false; // 별자리 배경 활성화 여부

// === Transition to Constellation ===
let isTransitioningToStars = false; // 전환 애니메이션 진행 여부
let transitionProgress = 0; // 0~1
let transitionMappings = null; // [{from:{x,y,r}, to:{x,y,r}}]

// === Shards (폭발 파편) ===
let shards = []; // [{x,y,vx,vy,life,age,r,alpha}]

// === Center Exclusion (CD 보호막) ===
const CD_EXCLUSION_RADIUS = 50; // 원하는 값으로 조절

function isInExclusion(x, y) {
  const cx = width / 2,
    cy = height / 2;
  const dx = x - cx,
    dy = y - cy;
  return dx * dx + dy * dy <= CD_EXCLUSION_RADIUS * CD_EXCLUSION_RADIUS;
}

// === Brush modes ===
const BRUSH = { GEL: "gel", MARKER: "marker", RIBBON: "ribbon" };
let brushMode = BRUSH.MARKER; // 항상 마커 모드로 설정

// 속도기반 가짜 감압 계산용
let _lastDraw = { x: 0, y: 0, t: 0 };

// === UI Controls ===
let isRotating = false; // 회전 상태 (잡아당길 때만 true)
let rotationSpeed = 0; // 회전 속도 (점진적 감속용)
let isStopping = false; // 정지 중인지 여부
let stopTimer = 0; // 정지 타이머
let isMoving = false; // 움직임 상태 (롱프레스 차단용)

// === 터치 제스처 상태 ===
let lastTapTime = 0;
let longPressTimer = null;
const LONG_PRESS_MS = 600;
const DOUBLE_TAP_MS = 400;

// === 브러시 모드 피드백 ===
let brushFeedback = { show: false, text: "", startTime: 0 };
const FEEDBACK_DURATION = 1500;

// === 사운드 ===
let soundContext;
let soundGain;
let constellationSound; // 별자리 생성 사운드

// === 닉네임 타이틀 ===
let userNickname = ""; // 사용자 닉네임
let customFont; // 폰트
let showNicknameModal = true; // 처음에 모달 표시 여부

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);

  // 사운드 컨텍스트 초기화
  if (
    typeof AudioContext !== "undefined" ||
    typeof webkitAudioContext !== "undefined"
  ) {
    soundContext = new (window.AudioContext || window.webkitAudioContext)();
    soundGain = soundContext.createGain();
    soundGain.gain.value = 0.3; // 볼륨 조절
    soundGain.connect(soundContext.destination);

    // 별자리 사운드 로드
    constellationSound = loadSound("../assets/music/ding.mp3");
  }

  // 성능 최적화: FPS 제한
  frameRate(45);

  // 폰트 로드
  customFont = loadFont("../assets/fonts/cachildren modu.ttf", () => {
    console.log("폰트 로드 완료");
  });

  // main 요소를 찾아서 부모로 설정, 없으면 body에 추가
  const mainElement = document.querySelector("main");
  if (mainElement) {
    cnv.parent(mainElement); // ← 문자열이 아니라 노드 전달
  } else {
    console.warn("main element not found, using body");
    cnv.parent(document.body);
  }

  // 닉네임 입력 모달 표시
  showNicknameInputModal();

  // 배경 버퍼 생성
  bgBuffer = createGraphics(width, height);
  drawBackground(bgBuffer);

  // 스트로크 버퍼 생성 (렌더 캐싱용)
  strokeBuffer = createGraphics(width, height);

  // 내부(p5) 토글 숨기고 CSS 토글만 사용 (페이지 1/2와 동일)
  if (window.CDPlayer && CDPlayer.setOpacityControlEnabled) {
    CDPlayer.setOpacityControlEnabled(false);
  }

  // 포인터 이벤트 설정 (iOS Safari 최적화)
  setupPointerEvents();

  // CSS 토글 DOM과 연동 (페이지 1/2와 동일 패턴)
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
}

function draw() {
  // 배경 그리기
  image(bgBuffer, 0, 0);

  // 닉네임 타이틀 렌더링
  if (userNickname !== "") {
    drawNicknameTitle();
  }

  // ★ 별자리 배경 업데이트/렌더 (전환 중엔 페이드 위주)
  if (isTransitioningToStars) {
    // 전환 중엔 업데이트는 잠시 보류
  } else {
    updateConstellationBackground();
  }
  drawConstellationBackground();

  // 전기 스트로크 업데이트(글로우 감쇠)
  strokeGlow *= strokeGlowDecay;

  // 전환 중이면 구슬 축소/이동 애니메이션, 아니면 일반 물리 업데이트
  if (isTransitioningToStars) {
    transitionProgress = min(1, transitionProgress + 0.02);
    drawOrbToStarTransition();
    if (transitionProgress >= 1) {
      isTransitioningToStars = false;
      isConstellationMode = true;
      orbs = [];
    }
  } else {
    updateOrbs();
  }

  // CD 플레이어 물리 업데이트 (안전한 초기화)
  if (
    !window.cdPlayerInitialized &&
    window.CDPlayer &&
    CDPlayer.initializePhysics
  ) {
    CDPlayer.initializePhysics();
    window.cdPlayerInitialized = true;
  }

  if (window.CDPlayer && CDPlayer.updatePhysics) {
    CDPlayer.updatePhysics();
  }

  // 회전 상태일 때만 회전 + 점진적 감속
  if (isRotating) {
    rotationSpeed = lerp(rotationSpeed, 0.02, 0.1); // 부드럽게 증가
    isStopping = false;
    stopTimer = 0;
  } else if (isStopping) {
    stopTimer++;
    const stopDuration = 90;
    const stopProgress = min(stopTimer / stopDuration, 1);

    rotationSpeed = lerp(rotationSpeed, 0, 0.08);

    if (stopProgress >= 1 && rotationSpeed < 0.001) {
      isStopping = false;
      rotationSpeed = 0;
      stopTimer = 0;
    }
  } else {
    rotationSpeed = lerp(rotationSpeed, 0, 0.05);
  }
  angle += rotationSpeed;

  // 스트로크 그리기 (일반 + 전기 글로우)
  drawElectricStrokes();

  // 전환 중이 아닐 때만 구슬 렌더
  if (!isTransitioningToStars) {
    drawOrbs();
  }

  // 폭발 파편 업데이트 & 그리기
  updateShards();
  drawShards();

  // CD 플레이어 그리기 (안전하게)
  if (window.CDPlayer && CDPlayer.drawDevice) {
    CDPlayer.drawDevice({
      cx: width / 2,
      cy: height / 2,
      // ringSize 생략 - 컴포넌트 기본값 (96) 사용
      angleDeg: angle * 57.3, // 라디안을 도로 변환
      bgBuffer: bgBuffer,
      handleSize: 20,
      onPullEnd: (pull) => {
        // 0~300px 가정
        const power = constrain(map(pull, 10, 300, 0.15, 1.0), 0, 1);
        strokeGlow = max(strokeGlow, 0.4 + 0.6 * power); // 즉시 번쩍
        spawnOrbs(floor((6 + 24 * power) * 0.44), power); // 구슬 여러 개 (약 2/3로 더 감소)

        // 잡아당기면 회전 시작
        isRotating = true;
        rotationSpeed = 0.02 * power; // 강도에 따라 회전 속도 설정
      },
    });
  }
}

function drawBackground(buffer) {
  buffer.background(15, 20, 30);

  // 중앙에서 바깥으로 갈수록 진해지는 방사형 그라디언트
  const cx = buffer.width / 2;
  const cy = buffer.height / 2;
  const maxDist = dist(0, 0, cx, cy); // 대각선 거리로 최대 거리 계산

  // 더 넓은 그라디언트를 위해 픽셀 단위로 그리기보다는 그라디언트 객체 사용
  const ctx = buffer.drawingContext;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist);

  // 중앙: 자연스럽게 밝은 남색
  gradient.addColorStop(0, "rgb(42, 48, 60)");
  // 중간: 자연스러운 그라디언트
  gradient.addColorStop(0.5, "rgb(28, 33, 43)");
  // 바깥: 자연스럽게 진한 남색
  gradient.addColorStop(1, "rgb(18, 22, 28)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, buffer.width, buffer.height);
}

// === Drawing Functions ===
function drawElectricStrokes() {
  // 성능 최적화: 이미 완성된 스트로크는 버퍼에서 렌더
  image(strokeBuffer, 0, 0);

  // 현재 그리고 있는 스트로크만 실시간 렌더
  if (currentStroke && currentStroke.pts.length > 1) {
    push();
    noFill();

    if (brushMode === BRUSH.GEL) {
      stroke(235, 245, 255, 140);
      strokeWeight(3);
    } else if (brushMode === BRUSH.MARKER) {
      stroke(255, 255, 255, 180);
      strokeWeight(2);
    } else if (brushMode === BRUSH.RIBBON) {
      stroke(255, 200);
      strokeWeight(2);
    }

    beginShape();
    for (const p of currentStroke.pts) {
      vertex(p.x, p.y);
    }
    endShape();
    pop();
  }

  // 전기 글로우 (당겼을 때만, 강도가 충분할 때만 ADD 모드)
  if (strokeGlow > 0.2) {
    const g = constrain(strokeGlow, 0, 1);
    push();
    blendMode(ADD);
    stroke(220, 240, 255, 70 * g);
    strokeWeight(4 + 8 * g);

    if (currentStroke && currentStroke.pts.length > 1) {
      beginShape();
      for (const p of currentStroke.pts) {
        vertex(p.x, p.y);
      }
      endShape();
    }
    pop();
  }
}

function drawStrokePolyline(pts) {
  if (!pts || pts.length < 2) return;
  beginShape();
  for (const p of pts) vertex(p.x, p.y);
  endShape();
}

// 모드별 호출을 위한 공통 루틴
function _drawByMode(kind = "line") {
  const drawOne = (pts) => {
    if (!pts || pts.length < 2) return;
    if (kind === "line" || kind === "shadow" || kind === "cutout") {
      beginShape();
      for (const p of pts) vertex(p.x, p.y);
      endShape();
    }
  };
  for (const s of strokes) drawOne(s.pts);
  if (currentStroke) drawOne(currentStroke.pts);
}

// Marker: 성능 최적화된 마커 브러시 (방향 기반 두께만 유지)
function _drawMarker() {
  const drawOne = (s) => {
    const pts = s.pts;
    if (!pts || pts.length < 2) return;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = sqrt(dx * dx + dy * dy);
      if (len < 0.1) continue;

      const angle = atan2(dy, dx);
      const dir = abs(sin(angle)); // 0=가로, 1=세로
      const directionFactor = lerp(0.4, 1.4, dir); // 가로일수록 얇게, 세로일수록 두껍게

      const avgPressure = (p1.p + p2.p) / 2;
      const w = _p2w(avgPressure) * directionFactor;

      // 단순화: 한 번의 stroke 호출만
      stroke(255, 255, 255, 180);
      strokeWeight(w);
      line(p1.x, p1.y, p2.x, p2.y);
    }
  };

  for (const s of strokes) drawOne(s);
  if (currentStroke) drawOne(currentStroke);
}

// Ribbon: 두께가 있는 띠(감압 반영)
function _drawRibbon() {
  const drawOne = (s) => {
    const pts = s.pts;
    if (!pts || pts.length < 2) return;

    // 외곽선만 그리기 (채우기 없음)
    noFill();
    stroke(255, 200);
    strokeWeight(2);

    // 각 세그먼트를 개별적으로 그리기
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = max(1, sqrt(dx * dx + dy * dy));
      const nx = -dy / len;
      const ny = dx / len;
      const hw = (b.w || 4) * 0.5;

      // 세그먼트의 양쪽 가장자리 그리기
      line(a.x + nx * hw, a.y + ny * hw, b.x + nx * hw, b.y + ny * hw);
      line(a.x - nx * hw, a.y - ny * hw, b.x - nx * hw, b.y - ny * hw);
    }
  };

  for (const s of strokes) drawOne(s);
  if (currentStroke) drawOne(currentStroke);
}

// === 보조 함수들 ===
function _normPressureFromEvent(ev, fallback = 0.5) {
  // 포인터 압력(0~1). 미지원이면 fallback
  if (ev && typeof ev.pressure === "number" && ev.pressure > 0)
    return constrain(ev.pressure, 0, 1);
  return fallback;
}

function _speedPressure(x, y) {
  const now = millis();
  const dt = max(1, now - _lastDraw.t);
  const dx = x - _lastDraw.x;
  const dy = y - _lastDraw.y;
  const v = sqrt(dx * dx + dy * dy) / dt;
  const target = constrain(map(v, 0.0, 1.5, 1.0, 0.1), 0.1, 1.0);

  // 이전 압력과 보간 → 부드럽게 변화
  const smoothed = lerp(_lastDraw.p || target, target, 0.3);
  _lastDraw = { x, y, t: now, p: smoothed };
  return smoothed;
}

function _p2w(p) {
  // pressure→width (마커 느낌으로 더 넓은 범위)
  return lerp(1.0, 15.0, p); // 최소1 ~ 최대15px
}

function _addStrokePoint(st, x, y, pr) {
  const pts = st.pts;
  const last = pts[pts.length - 1];
  const dx = x - last.x;
  const dy = y - last.y;
  const d2 = dx * dx + dy * dy;

  // 성능 최적화: 간격 완화 (1.5px → 2.5px)
  if (d2 < 2.5) return; // 너무 가까우면 skip

  const len = sqrt(d2);
  const w = _p2w(pr);
  const nx = -dy / len;
  const ny = dx / len;

  const pt = { x, y, p: pr, w };
  pts.push(pt);
  st.segs.push({ a: last, b: pt, dx: dx / len, dy: dy / len, len, nx, ny });
}

// === Electric Orbs Functions ===
const MAX_ORBS = 60; // 최대 구슬 수
function spawnOrbs(n, power = 1) {
  const addCount = min(n, MAX_ORBS - orbs.length);
  for (let i = 0; i < addCount; i++) {
    const x = random(width * 0.15, width * 0.85); // 중앙부에 더 많이
    const y = -20 - random(120); // 화면 위에서 등장
    const r = random(6, 12);
    const vx = random(-0.6, 0.6);
    const vy = random(0, 1);
    orbs.push({ x, y, vx, vy, r, life: 600, glow: 0.6 + 0.8 * power });
  }
}

function updateOrbs() {
  if (!orbs.length) return;
  const next = [];
  for (const o of orbs) {
    o.vy += GRAVITY; // 중력
    o.vx *= ORB_FRICTION;
    o.vy *= ORB_FRICTION;

    // 선분 충돌
    collideOrbWithStrokes(o);

    // 위치 갱신
    o.x += o.vx;
    o.y += o.vy;
    o.life--;
    o.glow *= 0.995; // 서서히 흐려짐

    // 바닥/벽 처리
    // 바닥: 폭발 후 소멸
    if (o.y > height - o.r) {
      // 바닥에 닿은 순간의 속도로 에너지 산정
      const speed = sqrt(o.vx * o.vx + o.vy * o.vy);
      const energy = constrain(map(speed, 0, 12, 0.2, 1.0), 0.2, 1.0);
      spawnExplosion(o.x, height - 2, energy);
      continue; // 다음 orb
    }
    // 좌우 벽은 기존처럼 반사
    if (o.x < o.r) {
      o.x = o.r;
      o.vx *= -ORB_BOUNCE;
    }
    if (o.x > width - o.r) {
      o.x = width - o.r;
      o.vx *= -ORB_BOUNCE;
    }

    if (o.life > 0 && o.y <= height + 200) {
      next.push(o);
    }
  }
  orbs = next;
}

function collideOrbWithStrokes(o) {
  const testStroke = (s) => {
    for (const seg of s.segs) {
      // 원-선분 최소거리 충돌 테스트
      const hitN = circleSegmentHitNormal(o.x, o.y, o.r, seg.a, seg.b);
      if (hitN) {
        // 반사: v' = v - 2*(v·n)*n
        const dot = o.vx * hitN.x + o.vy * hitN.y;
        o.vx = (o.vx - 2 * dot * hitN.x) * ORB_BOUNCE;
        o.vy = (o.vy - 2 * dot * hitN.y) * ORB_BOUNCE;

        // 관통 보정(법선 방향으로 밀어내기)
        o.x += hitN.x * (o.r * 1.2);
        o.y += hitN.y * (o.r * 1.2);

        // 충돌 스파크 효과: 스트로크 글로우 순간 증폭
        strokeGlow = min(1.0, strokeGlow + 0.12);

        // 구슬 밝기 증가
        o.glow = min(2.0, o.glow + 0.3);

        // 사운드 재생 (겹쳐서 재생 가능)
        playCollisionSound();
      }
    }
  };
  for (const s of strokes) testStroke(s);
  if (currentStroke) testStroke(currentStroke);
}

// 충돌 사운드 재생 함수
function playCollisionSound() {
  if (!soundContext) return;

  // 사인파 오실레이터 생성
  const oscillator = soundContext.createOscillator();
  const gainNode = soundContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(soundGain);

  // 주파수 설정 (뿅 하는 소리 - 랜덤하게 다양하게)
  const baseFreq = 600 + random(400); // 600-1000Hz
  oscillator.frequency.setValueAtTime(baseFreq, soundContext.currentTime);

  // 볼륨 엔벨로프 (강도도 랜덤)
  const volume = 0.2 + random(0.2); // 0.2-0.4
  gainNode.gain.setValueAtTime(volume, soundContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    soundContext.currentTime + 0.08
  );

  // 재생
  oscillator.start(soundContext.currentTime);
  oscillator.stop(soundContext.currentTime + 0.08);
}

// 원-선분 충돌: 충돌 시 법선 벡터 반환, 아니면 null
function circleSegmentHitNormal(cx, cy, r, A, B) {
  const ABx = B.x - A.x,
    ABy = B.y - A.y;
  const APx = cx - A.x,
    APy = cy - A.y;
  const ab2 = ABx * ABx + ABy * ABy;
  if (ab2 === 0) return null;

  // 선분에서의 최근접점 t
  let t = (APx * ABx + APy * ABy) / ab2;
  t = max(0, min(1, t));
  const Qx = A.x + ABx * t,
    Qy = A.y + ABy * t;

  const dx = cx - Qx,
    dy = cy - Qy;
  const d2 = dx * dx + dy * dy;
  if (d2 <= r * r) {
    const d = sqrt(d2) || 1e-6;
    // 법선(원 중심에서 최근접점 방향)
    return { x: dx / d, y: dy / d };
  }
  return null;
}

function drawOrbs() {
  push();
  noStroke();
  for (const o of orbs) {
    // 외곽 글로우 (충돌 시 더 밝게)
    drawingContext.beginPath();
    const glowMult = constrain(o.glow, 0.6, 2.0); // 최소 밝기 보장, 최대 제한
    const g = drawingContext.createRadialGradient(
      o.x,
      o.y,
      o.r * 0.2,
      o.x,
      o.y,
      o.r * (3.2 * glowMult)
    );
    g.addColorStop(0, `rgba(200,240,255,${0.8 * glowMult})`);
    g.addColorStop(0.5, `rgba(150,220,255,${0.6 * glowMult})`);
    g.addColorStop(1, `rgba(200,240,255,0)`);
    drawingContext.fillStyle = g;
    drawingContext.arc(o.x, o.y, o.r * 3.2 * glowMult, 0, Math.PI * 2);
    drawingContext.fill();

    // 코어 (충돌 시 더 밝고 화려하게)
    const coreBrightness = min(255, 230 + (o.glow - 0.6) * 100);
    fill(coreBrightness, 250, 255, min(255, 150 + (o.glow - 0.6) * 150));
    ellipse(o.x, o.y, o.r * 1.6);
  }
  pop();
}

// === Shards Functions ===
// 폭발 파편 생성
function spawnExplosion(x, y, energy = 1) {
  const n = floor(8 + 16 * energy); // 파편 수
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI);
    const sp = (1.5 + random(2.5)) * (0.6 + energy * 0.8);
    shards.push({
      x,
      y,
      vx: cos(a) * sp,
      vy: -abs(sin(a) * sp) - random(0.5, 1.5), // 위쪽으로 살짝
      life: 40 + floor(random(20)),
      age: 0,
      r: random(1.0, 2.4),
      alpha: 220,
    });
  }
  // 소리
  playCollisionSound();
}

// 폭발 파편 업데이트
function updateShards() {
  if (!shards.length) return;
  const next = [];
  for (const s of shards) {
    s.vy += 0.12; // 약한 중력
    s.x += s.vx;
    s.y += s.vy;
    s.age++;
    s.alpha *= 0.96;
    s.r *= 0.985;
    if (s.age < s.life && s.alpha >= 6 && s.y <= height + 80) {
      next.push(s);
    }
  }
  shards = next;
}

// 폭발 파편 그리기
function drawShards() {
  if (shards.length === 0) return;
  push();
  noStroke();
  for (const s of shards) {
    fill(230, 245, 255, s.alpha);
    ellipse(s.x, s.y, s.r * 2, s.r * 2);
  }
  pop();
}

// === Transition Renderer ===
function drawOrbToStarTransition() {
  if (!transitionMappings || transitionMappings.length === 0) return;
  const t = transitionProgress;

  push();
  noStroke();
  for (const m of transitionMappings) {
    const x = lerp(m.from.x, m.to.x, t);
    const y = lerp(m.from.y, m.to.y, t);
    const r = lerp(m.from.r, m.to.r * 0.6, t);
    const alpha = lerp(255, 0, t);

    drawingContext.beginPath();
    const g = drawingContext.createRadialGradient(x, y, r * 0.2, x, y, r * 2.6);
    g.addColorStop(0, `rgba(200,240,255,${0.8 * (1 - t)})`);
    g.addColorStop(0.5, `rgba(150,220,255,${0.6 * (1 - t)})`);
    g.addColorStop(1, `rgba(200,240,255,0)`);
    drawingContext.fillStyle = g;
    drawingContext.arc(x, y, r * 2.6, 0, Math.PI * 2);
    drawingContext.fill();

    fill(235, 250, 255, alpha);
    ellipse(x, y, r * 1.4);
  }
  pop();
}

// === Constellation Functions ===
// 유틸: 8섹터 계산
function _get8Sectors() {
  // 4x2 그리드 (왼→오 4칸, 위→아래 2칸) = 8조각
  const cols = 4,
    rows = 2;
  const w = width / cols,
    h = height / rows;
  const sectors = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      sectors.push({ x: c * w, y: r * h, w, h, count: 0 });
    }
  }
  return sectors;
}

// ★ 한 번의 커밋용: 한 섹터 선택해서 그 섹터 내부에만 배치
function _placeStarsIntoOneSector(stars) {
  const sectors = _get8Sectors();
  const sec = sectors[floor(random(sectors.length))];
  const margin = 16;

  const cx = width / 2,
    cy = height / 2;
  const R = CD_EXCLUSION_RADIUS;

  for (const s of stars) {
    let tries = 0,
      ok = false,
      px,
      py;
    while (tries++ < 20) {
      px = sec.x + margin + random(sec.w - margin * 2);
      py = sec.y + margin + random(sec.h - margin * 2);
      if (!isInExclusion(px, py)) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      // 보호막 경계 밖으로 투영
      const ang = atan2(py - cy, px - cx);
      px = cx + cos(ang) * (R + 2); // 경계 조금 바깥
      py = cy + sin(ang) * (R + 2);
    }
    s.x = px;
    s.y = py;
  }
  return stars;
}

// 유틸: starLines 중복 방지용 키
function _edgeKey(i, j) {
  return i < j ? `${i}-${j}` : `${j}-${i}`;
}

// "별자리로 보내기(지우기)" 함수 (누적/랜덤/화면내 필터 반영)
function commitConstellationFromOrbs() {
  // (3) 화면 안에 남은 구슬만 채택 + 보호막 안 구슬 제외
  const visible = orbs.filter(
    (o) =>
      o.life > 0 &&
      o.x >= 0 &&
      o.x <= width &&
      o.y >= 0 &&
      o.y <= height &&
      !isInExclusion(o.x, o.y)
  );

  if (visible.length === 0) {
    // 추가할 게 없어도 모드는 유지 (기존 별자리 보존)
    strokes = [];
    currentStroke = null;
    strokeBuffer.clear();
    orbs = [];
    strokeGlow = 0;
    isConstellationMode = true;
    return;
  }

  // 구슬 → 별(아주 작게 축소), 벽 박힘 플래그 보존
  let newStars = visible.map((o) => {
    const wall =
      o.x <= o.r + 2 || o.x >= width - o.r - 2 || o.y >= height - o.r - 2;
    const baseR = max(1.2, o.r * 0.25);
    return {
      x: o.x,
      y: o.y,
      r: baseR,
      baseR,
      glow: min(2.0, o.glow || 1.0),
      phase: random(TWO_PI),
      wall,
    };
  });

  // (2) 8섹터 중 하나를 뽑아 그 안에만 배치
  newStars = _placeStarsIntoOneSector(newStars);

  // (1) 누적: 기존 bgStars 뒤에 추가
  const baseIndex = bgStars.length;
  bgStars = bgStars.concat(newStars);

  // 연결선도 누적 방식으로 "새 별"과 "주변"을 연결
  // - 각 새 별마다 전체 별 중 가까운 이웃 2~3개 연결
  // - 중복 라인 방지
  const existingN = bgStars.length;
  const lineSet = new Set(starLines.map((L) => _edgeKey(L.i, L.j)));

  for (let ni = 0; ni < newStars.length; ni++) {
    const globalI = baseIndex + ni;
    const si = bgStars[globalI];

    // 최근접 후보 계산
    const neighbors = [];
    for (let j = 0; j < existingN; j++) {
      if (j === globalI) continue;
      const sj = bgStars[j];
      const dx = sj.x - si.x,
        dy = sj.y - si.y;
      neighbors.push({ j, d2: dx * dx + dy * dy });
    }
    neighbors.sort((a, b) => a.d2 - b.d2);

    const deg = floor(random(2, 4)); // 2~3개 연결
    for (let k = 0; k < deg && k < neighbors.length; k++) {
      const j = neighbors[k].j;
      const key = _edgeKey(globalI, j);
      if (lineSet.has(key)) continue;
      lineSet.add(key);
      starLines.push({
        i: globalI,
        j,
        alpha: random(80, 160),
        t: random(1000),
      });
    }
  }

  // 라인 수 과도 방지 캡
  const MAX_LINES = 1200;
  if (starLines.length > MAX_LINES) {
    starLines.splice(0, starLines.length - MAX_LINES);
  }

  // 전환용 매핑 생성: 현재 화면의 visible 구슬 → 방금 추가한 newStars
  transitionMappings = [];
  for (let i = 0; i < newStars.length; i++) {
    const src = visible[i % visible.length];
    const dst = newStars[i];
    transitionMappings.push({
      from: { x: src.x, y: src.y, r: src.r || 8 },
      to: { x: dst.x, y: dst.y, r: dst.baseR },
    });
  }

  // 드로잉 리셋 (선만 지우고, 전환 동안 구슬은 유지)
  strokes = [];
  currentStroke = null;
  strokeBuffer.clear();
  strokeGlow = 0;

  // 전환 시작
  isTransitioningToStars = true;
  transitionProgress = 0;

  // 별자리 생성 사운드 재생
  playConstellationSound();
}

// 별자리 생성 사운드 재생 함수
function playConstellationSound() {
  if (constellationSound && constellationSound.isLoaded()) {
    constellationSound.play();
  } else if (soundContext) {
    // 오실레이터로 대체 사운드 생성 (고음 종소리)
    const oscillator = soundContext.createOscillator();
    const gainNode = soundContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(soundGain);

    // 고음 종소리 (띵~) - 높은 주파수 사용
    const freq1 = 800; // 첫 번째 주파수
    const freq2 = 1200; // 두 번째 주파수 (더 높게)

    oscillator.frequency.setValueAtTime(freq1, soundContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(
      freq2,
      soundContext.currentTime + 0.1
    );

    // 볼륨 엔벨로프 (부드럽게 감소)
    gainNode.gain.setValueAtTime(0.3, soundContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      soundContext.currentTime + 0.5
    );

    oscillator.start(soundContext.currentTime);
    oscillator.stop(soundContext.currentTime + 0.5);
  }
}

// 별자리 배경 업데이트
function updateConstellationBackground() {
  if (!isConstellationMode || bgStars.length === 0) return;
  const t = millis() * 0.002;

  for (const s of bgStars) {
    if (s.wall) {
      // 벽 박힌 별은 밝았다 어두워졌다(깜빡임)
      const blink = 0.75 + 0.25 * sin(t + s.phase);
      s.r = s.baseR * (0.9 + 0.3 * blink);
      s.glow = 0.6 + 0.8 * blink;
    } else {
      s.r = s.baseR;
      s.glow = max(0.5, (s.glow || 1.0) * 0.999); // 서서히 잔광 감소
    }
  }

  for (const L of starLines) {
    L.t += 1.2;
    const w = 0.5 + 0.5 * sin(L.t * 0.02);
    L._alphaNow = L.alpha * (0.7 + 0.3 * w);
  }
}

// 별자리 배경 그리기
function drawConstellationBackground() {
  if ((!isConstellationMode && !isTransitioningToStars) || bgStars.length === 0)
    return;
  const fade = isTransitioningToStars ? transitionProgress : 1;

  // 연결선
  push();
  strokeWeight(1);
  for (const L of starLines) {
    const a = bgStars[L.i],
      b = bgStars[L.j];
    if (!a || !b) continue;
    // 보호막 안이면 스킵
    if (isInExclusion(a.x, a.y) || isInExclusion(b.x, b.y)) continue;
    stroke(200, 230, 255, (L._alphaNow ?? L.alpha) * fade);
    line(a.x, a.y, b.x, b.y);
  }
  pop();

  // 별(작게 축소된 구슬)
  push();
  noStroke();
  for (const s of bgStars) {
    // 보호막 안이면 스킵
    if (isInExclusion(s.x, s.y)) continue;
    // 외곽 글로우
    drawingContext.beginPath();
    const gm = s.glow || 1.0;
    const g = drawingContext.createRadialGradient(
      s.x,
      s.y,
      s.r * 0.1,
      s.x,
      s.y,
      s.r * (3.0 * gm)
    );
    g.addColorStop(0, `rgba(220,245,255,${0.75 * gm * fade})`);
    g.addColorStop(0.6, `rgba(160,220,255,${0.5 * gm * fade})`);
    g.addColorStop(1, `rgba(200,240,255,0)`);
    drawingContext.fillStyle = g;
    drawingContext.arc(s.x, s.y, s.r * 3.0 * gm, 0, Math.PI * 2);
    drawingContext.fill();

    // 코어
    fill(245, 255, 255, 220 * fade);
    ellipse(s.x, s.y, s.r * 1.6);
  }
  pop();
}

function drawBrushFeedback() {
  if (!brushFeedback.show) return;

  const elapsed = millis() - brushFeedback.startTime;
  if (elapsed > FEEDBACK_DURATION) {
    brushFeedback.show = false;
    return;
  }

  // 페이드 아웃 효과
  const alpha = map(elapsed, 0, FEEDBACK_DURATION, 255, 0);
  const scaleFactor = map(elapsed, 0, FEEDBACK_DURATION, 1.2, 0.8);

  push();
  translate(width / 2, height / 2);
  scale(scaleFactor); // p5.js의 scale() 함수 사용

  // 배경 원
  fill(0, 0, 0, alpha * 0.7);
  noStroke();
  ellipse(0, 0, 200, 60);

  // 텍스트
  fill(255, alpha);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(brushFeedback.text, 0, 0);

  pop();
}

// === Pointer Events ===
function pointerDown(x, y) {
  // 좌표 변환 유지 (네가 쓰던 버전 그대로)
  if (typeof x === "object" && x.clientX !== undefined) {
    const event = x;
    const rect = cnv.elt.getBoundingClientRect();
    x = ((event.clientX - rect.left) / rect.width) * width;
    y = ((event.clientY - rect.top) / rect.height) * height;

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

    // === CD 플레이어 중앙 버튼 클릭 체크 ===
    const centerX = width / 2;
    const centerY = height / 2;
    const centerRadius = 30; // 중앙 버튼 반경

    if (dist(x, y, centerX, centerY) < centerRadius) {
      // 정지 버튼: 회전 정지 시작
      isRotating = false;
      isStopping = true;
      stopTimer = 0;
      rotationSpeed = 0;
      if (window.CDPlayer && CDPlayer.startSnapBack) {
        CDPlayer.startSnapBack();
      }
      // 별자리 전환(구슬 → 별자리)
      commitConstellationFromOrbs();
      event.preventDefault();
      return;
    }

    // 핸들 근처면 CDPlayer에게 위임(네 코드 그대로)
    const handle = CDPlayer.getHandle();
    if (handle && dist(x, y, handle.position.x, handle.position.y) < 60) {
      CDPlayer.handlePointerDown(x, y);
      return;
    }

    // === 드로잉 시작 ===
    isDrawing = true;
    const pr = _normPressureFromEvent(event, 0.6); // 압력 감지 항상 활성화
    _lastDraw = { x, y, t: millis() };

    currentStroke = { pts: [{ x, y, p: pr, w: _p2w(pr) }], segs: [], age: 0 };
    return;
  }

  // (마우스/터치 좌표가 직접 들어온 경우) — 드로잉 로직
  // === CD 플레이어 중앙 버튼 클릭 체크 ===
  const centerX = width / 2;
  const centerY = height / 2;
  const centerRadius = 30; // 중앙 버튼 반경

  if (dist(x, y, centerX, centerY) < centerRadius) {
    // 정지 버튼: 회전 정지 시작
    isRotating = false;
    isStopping = true;
    stopTimer = 0;
    rotationSpeed = 0;
    if (window.CDPlayer && CDPlayer.startSnapBack) {
      CDPlayer.startSnapBack();
    }
    // 별자리 전환(구슬 → 별자리)
    commitConstellationFromOrbs();
    return;
  }

  const handle = CDPlayer.getHandle();
  if (handle && dist(x, y, handle.position.x, handle.position.y) < 60) {
    CDPlayer.handlePointerDown(x, y);
    return;
  }
  isDrawing = true;
  const pr = 0.6; // 압력 감지 항상 활성화
  _lastDraw = { x, y, t: millis() };
  currentStroke = { pts: [{ x, y, p: pr, w: _p2w(pr) }], segs: [], age: 0 };
}

function pointerMove(x, y) {
  if (typeof x === "object" && x.clientX !== undefined) {
    const event = x;
    const rect = cnv.elt.getBoundingClientRect();
    x = ((event.clientX - rect.left) / rect.width) * width;
    y = ((event.clientY - rect.top) / rect.height) * height;

    // 슬라이더 드래그 중인지 먼저 체크
    if (
      CDPlayer &&
      CDPlayer.isOpacityDragging &&
      CDPlayer.isOpacityDragging()
    ) {
      if (CDPlayer.handleOpacityInteraction) {
        CDPlayer.handleOpacityInteraction(x, y, true);
      }

      const mc = CDPlayer.getMouseConstraint();
      if (mc && mc.mouse) {
        mc.mouse.pressed = false;
        mc.mouse.button = -1;
        mc.mouse.position.x = x;
        mc.mouse.position.y = y;
      }
      return;
    }

    if (isDrawing && currentStroke) {
      const pr = event.pressure > 0 ? event.pressure : _speedPressure(x, y);
      _addStrokePoint(currentStroke, x, y, pr);
    }
    CDPlayer.handlePointerMove(x, y);
    return;
  }

  // (단순 좌표)
  // 슬라이더 드래그 중인지 먼저 체크
  if (CDPlayer && CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
    if (CDPlayer.handleOpacityInteraction) {
      CDPlayer.handleOpacityInteraction(x, y, true);
    }

    const mc = CDPlayer.getMouseConstraint();
    if (mc && mc.mouse) {
      mc.mouse.pressed = false;
      mc.mouse.button = -1;
      mc.mouse.position.x = x;
      mc.mouse.position.y = y;
    }
    return;
  }

  if (isDrawing && currentStroke) {
    const pr = _speedPressure(x, y);
    _addStrokePoint(currentStroke, x, y, pr);
  }
  CDPlayer.handlePointerMove(x, y);
}

function pointerUp(x, y) {
  if (typeof x === "object" && x.clientX !== undefined) {
    const event = x;
    const rect = cnv.elt.getBoundingClientRect();
    x = ((event.clientX - rect.left) / rect.width) * width;
    y = ((event.clientY - rect.top) / rect.height) * height;
  }

  // 슬라이더 드래그 중지 먼저 체크
  if (CDPlayer && CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
    if (CDPlayer.stopOpacityDrag) {
      CDPlayer.stopOpacityDrag();
    }
    return;
  }

  if (isDrawing) {
    isDrawing = false;
    if (currentStroke && currentStroke.segs.length > 0) {
      strokes.push(currentStroke);

      // 스트로크를 버퍼에 저장 (성능 최적화)
      strokeBuffer.push();
      strokeBuffer.noFill();

      if (brushMode === BRUSH.GEL) {
        strokeBuffer.stroke(235, 245, 255, 140);
        strokeBuffer.strokeWeight(3);
      } else if (brushMode === BRUSH.MARKER) {
        strokeBuffer.stroke(255, 255, 255, 180);
        strokeBuffer.strokeWeight(2);
      } else if (brushMode === BRUSH.RIBBON) {
        strokeBuffer.stroke(255, 200);
        strokeBuffer.strokeWeight(2);
      }

      strokeBuffer.beginShape();
      for (const p of currentStroke.pts) {
        strokeBuffer.vertex(p.x, p.y);
      }
      strokeBuffer.endShape();
      strokeBuffer.pop();
    }
    currentStroke = null;
  }

  CDPlayer.handlePointerUp(x, y);
}

// === Control Functions ===
function resetCanvas() {
  // 모든 그리기 초기화
  strokes = [];
  currentStroke = null;
  strokeGlow = 0;
  orbs = [];
  isDrawing = false;

  // 배경 다시 그리기
  drawBackground(bgBuffer);

  // 스트로크 버퍼 초기화
  strokeBuffer.clear();
}

function resetToInitialState() {
  // 모든 그리기 초기화
  strokes = [];
  currentStroke = null;
  strokeGlow = 0;
  orbs = []; // 구슬 제거
  shards = []; // 폭발 파편도 제거
  isDrawing = false;

  // 별자리 배경 초기화
  bgStars = [];
  starLines = [];
  isConstellationMode = false;

  // 회전 점진적 멈춤
  isRotating = false; // 회전 상태를 false로 설정 (점진적 감속은 angle 업데이트에서 처리됨)
  rotationSpeed = 0; // 즉시 0으로 초기화

  // CD 플레이어 초기화 (핸들 위치 리셋 및 완전 정지)
  CDPlayer.resetHandle(width, height);

  // Matter.js 핸들 완전 정지 (추가 안전 장치)
  if (window.CDPlayer && CDPlayer.getHandle) {
    const handle = CDPlayer.getHandle();
    if (handle && typeof Matter !== "undefined") {
      Matter.Body.setVelocity(handle, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(handle, 0);
      Matter.Body.setStatic(handle, false); // 동적이지만 정지 상태
    }
  }

  // 배경 다시 그리기
  drawBackground(bgBuffer);

  // 스트로크 버퍼 초기화
  strokeBuffer.clear();
}

// === Pointer Events Only ===

function setupPointerEvents() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  canvas.addEventListener("pointerdown", handlePointerDownEvent, {
    passive: false,
  });
  canvas.addEventListener("pointermove", handlePointerMoveEvent, {
    passive: false,
  });
  canvas.addEventListener("pointerup", handlePointerUpEvent, {
    passive: false,
  });
  canvas.addEventListener("pointercancel", handlePointerUpEvent, {
    passive: false,
  });

  canvas.style.touchAction = "none"; // iOS 스크롤 방지
  console.log("✅ 포인터 이벤트만 사용 중");
}

function handlePointerDownEvent(event) {
  event.preventDefault();
  const now = millis();

  // === 더블탭 감지 ===
  if (now - lastTapTime < DOUBLE_TAP_MS) {
    if (strokes.length > 0) {
      strokes.pop(); // 마지막 선 삭제
      console.log("🌀 마지막 스트로크 삭제됨");
    }
    lastTapTime = 0; // 초기화
    return;
  }
  lastTapTime = now;

  // === 브러시 변경 기능 제거됨 ===
  // clearTimeout(longPressTimer);
  // longPressTimer = setTimeout(() => {
  //   if (!isMoving && !isDrawing) {
  //     cycleBrushMode(); // 브러시 모드 순환
  //     console.log(`🎨 브러시 모드 변경됨 → ${brushMode}`);
  //   }
  // }, LONG_PRESS_MS);

  pointerDown(event);
}

function handlePointerMoveEvent(event) {
  event.preventDefault();
  isMoving = true; // 움직이는 동안 long press 막음
  pointerMove(event);
}

function handlePointerUpEvent(event) {
  event.preventDefault();
  clearTimeout(longPressTimer);
  isMoving = false;
  pointerUp(event);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bgBuffer = createGraphics(width, height);
  drawBackground(bgBuffer);

  // 스트로크 버퍼도 재생성
  strokeBuffer = createGraphics(width, height);

  // 리사이즈 시 별자리를 8섹터에 재배치 (원하면 주석 해제)
  // if (bgStars.length > 0) {
  //   bgStars = _placeStarsIntoSectors(bgStars);
  // }
}

// === Key Shortcuts ===
function keyPressed() {
  if (key === "r" || key === "R") resetCanvas();
  else if (key === "1") brushMode = BRUSH.GEL;
  else if (key === "2") brushMode = BRUSH.MARKER;
  else if (key === "3") brushMode = BRUSH.RIBBON;
}

// === 닉네임 입력 모달 ===
function showNicknameInputModal() {
  if (!showNicknameModal) return;

  const modalHTML = `
    <div id="nicknameModal" class="nickname-modal" style="display: flex;">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <h2>야광스티커의 방</h2>
        <p>닉네임을 입력해주세요</p>
        <input type="text" id="nicknameInput" placeholder="닉네임 입력" maxlength="10" />
        <button onclick="submitNickname()">시작하기</button>
      </div>
    </div>
    <style>
      .nickname-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nickname-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }
      .nickname-modal .modal-content {
        position: relative;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 40px;
        text-align: center;
        max-width: 320px;
        width: 70%;
      }
      .nickname-modal h2 {
        color: white;
        margin: 0 0 10px 0;
        font-size: 24px;
      }
      .nickname-modal p {
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 24px 0;
        font-size: 16px;
      }
      .nickname-modal input {
        width: 100%;
        padding: 12px 16px;
        font-size: 16px;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        color: white;
        margin-bottom: 20px;
        text-align: center;
        box-sizing: border-box;
      }
      .nickname-modal input::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }
      .nickname-modal input:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.5);
      }
      .nickname-modal button {
        padding: 12px 32px;
        font-size: 16px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
        display: block;
        margin: 0 auto;
      }
      .nickname-modal button:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
    </style>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Enter 키로 제출
  const input = document.getElementById("nicknameInput");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        submitNickname();
      }
    });
    input.focus();
  }
}

// 닉네임 제출
function submitNickname() {
  const input = document.getElementById("nicknameInput");
  if (input) {
    const nickname = input.value.trim();
    if (nickname !== "") {
      userNickname = nickname;
      showNicknameModal = false;

      // 모달 제거
      const modal = document.getElementById("nicknameModal");
      if (modal) {
        modal.style.display = "none";
        setTimeout(() => modal.remove(), 300);
      }
    }
  }
}

// 닉네임 타이틀 렌더링
function drawNicknameTitle() {
  const title = `${userNickname}의방`;

  push();

  // 폰트 설정
  if (customFont) {
    textFont(customFont);
  }

  textSize(32);
  textAlign(CENTER);
  textStyle(BOLD);

  // 더 귀여운 반짝거리는 효과 (더 빠르고 더 큰 변화)
  const sparkle1 = sin(frameCount * 0.4) * 0.4 + 0.6;
  const sparkle2 = sin(frameCount * 0.3 + PI) * 0.3 + 0.7;
  const alpha = map(sparkle1 * sparkle2, 0, 1, 160, 255);

  fill(255, alpha);

  // 그리기 (화면 상단 중앙)
  text(title, width / 2, 60);

  pop();
}

// 전역 함수로 등록
window.submitNickname = submitNickname;
