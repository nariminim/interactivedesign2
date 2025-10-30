// === Page 7: Magnetic Balls - 자석 효과가 있는 공들 ===

let cnv;
let balls = []; // 물리 엔진에 추가할 공들
let isDraggingHandle = false;
let isMagnetActive = false; // 자석 활성화 상태
let magnetStrength = 0; // 자석 강도 (0-1)

// CDPlayer 회전
let angle = 0;
let rotationSpeed = 0;

// 포인터 처리
let pointers = new Map();

// 드래그 연속 생성
const DRAG_SPAWN_DIST = 24; // 드래그 간격(픽셀)
const MAX_BALLS = 450; // 성능 보호
const DEFAULT_AIR = 0.001;
const STUCK_AIR = 0.12; // 벽에 붙었을 때 공기저항
let lastSpawn = new Map(); // pointerId -> {x,y}

// ===== Frame-banding params =====
const FRAME_INSET = 40; // 프레임을 화면 가장자리에서 얼마나 안쪽으로 띄울지(px)
const BANDS = 3; // 겹(바깥→안쪽) 개수 (그림처럼 3줄: 파랑/초록/빨강 느낌)
const LANE_GAP = 28; // 줄 간격(px) – 겹 사이 거리
const SPRING_K = 0.001; // 프레임 타깃으로 끌어당기는 스프링 계수
const DAMP = 0.985; // 살짝 감속해서 "착" 붙는 느낌
const REP_RADIUS = 18; // 공끼리 최소 간격
const REP_K = 0.0006; // 공끼리 반발

// Matter.js 관련
let engine;
let world;
let ground;
let leftWall, rightWall, topWall, bottomWall;

// 자석 영역 설정
let magnetZones = [];

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);

  // HSB 색상 모드
  colorMode(HSB, 360, 100, 100, 100);

  // Matter.js 초기화
  const { Engine, World, Bodies, Body, Constraint } = Matter;
  engine = Engine.create();
  world = engine.world;

  // 바닥 (보이지 않게)
  ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
    isStatic: true,
    render: { visible: false },
  });

  // 충돌 이벤트 리스너 - 유리구슬 떨어지는 소리
  let audioContextStarted = false;

  Matter.Events.on(engine, "collisionStart", (event) => {
    for (let pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      // 바닥과 충돌했을 때
      if (
        (bodyA === ground && balls.some((b) => b.body === bodyB)) ||
        (bodyB === ground && balls.some((b) => b.body === bodyA))
      ) {
        // 빠른 속도로 떨어질 때만 소리 재생
        const ball = balls.find((b) => b.body === bodyA || b.body === bodyB);
        if (ball) {
          const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.y);
          if (speed > 3) {
            // p5.sound가 로드되었는지 확인
            if (typeof p5.Oscillator !== "undefined") {
              try {
                // 오디오 컨텍스트 시작 (사용자 제스처 이후)
                if (
                  !audioContextStarted &&
                  typeof userStartAudio === "function"
                ) {
                  userStartAudio();
                  audioContextStarted = true;
                }

                // 유리구슬 소리 (짧은 딩 소리)
                const osc = new p5.Oscillator("sine");
                const freq = random(600, 800); // 높은 톤
                osc.freq(freq);
                osc.amp(0.08); // 작은 볼륨
                osc.start();
                osc.stop(0.05); // 짧게
              } catch (e) {
                // 오실레이터 생성 실패 시 무시
                console.warn("Sound error:", e);
              }
            }
          }
        }
      }
    }
  });

  // 벽들 (보이지 않게)
  leftWall = Bodies.rectangle(10, height / 2, 20, height, {
    isStatic: true,
    render: { visible: false },
  });
  rightWall = Bodies.rectangle(width - 10, height / 2, 20, height, {
    isStatic: true,
    render: { visible: false },
  });
  topWall = Bodies.rectangle(width / 2, 10, width, 20, {
    isStatic: true,
    render: { visible: false },
  });
  bottomWall = Bodies.rectangle(width / 2, height - 10, width, 20, {
    isStatic: true,
    render: { visible: false },
  });

  World.add(world, [ground, leftWall, rightWall, topWall, bottomWall]);

  // CDPlayer 초기화
  if (window.CDPlayer && window.CDPlayer.initializePhysics) {
    window.CDPlayer.initializePhysics();
    if (window.CDPlayer.setOpacityControlEnabled) {
      window.CDPlayer.setOpacityControlEnabled(false);
    }
    if (window.CDPlayer.setOpacity) {
      window.CDPlayer.setOpacity(1.0);
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

  // 핸들 당기면 자석 모드 토글
  window.currentOnPullEnd = (pullDistance) => {
    handlePullEnd(pullDistance);
  };

  // pointer 이벤트 리스너 추가
  cnv.elt.addEventListener("pointerdown", onPointerDown);
  cnv.elt.addEventListener("pointermove", onPointerMove);
  cnv.elt.addEventListener("pointerup", onPointerUp);
  cnv.elt.addEventListener("pointercancel", onPointerUp);

  // 드래그 안정화 이벤트 리스너
  window.addEventListener("blur", releaseHandle);
  cnv.elt.addEventListener("mouseleave", releaseHandle);

  // 🔧 setup 마지막에 붙이기
  Matter.Events.on(engine, "beforeUpdate", () => {
    updateMagnetStrength();
  });
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

// 재생/자석 모두 "즉시 정지"
function stopPlayback({ clearBalls = false } = {}) {
  isMagnetActive = false;
  magnetStrength = 0;
  rotationSpeed = 0;
  isDraggingHandle = false;

  unstickAll(); // 🔔 모두 떼기

  if (clearBalls) {
    // 모든 공 제거
    for (let ball of balls) {
      if (ball.body) {
        Matter.World.remove(world, ball.body);
      }
    }
    balls = [];
  } else {
    const { Body } = Matter;
    for (let ball of balls) {
      if (!ball.body) continue;
      // 아래로 '툭' 치는 힘만 살짝
      Body.applyForce(ball.body, ball.body.position, {
        x: 0,
        y: ball.mass * 0.03,
      });
    }
  }

  // Matter가 뭔가 잡고 있으면 해제
  if (window.CDPlayer && window.CDPlayer.getMouseConstraint) {
    const mc = window.CDPlayer.getMouseConstraint();
    if (mc && mc.mouse) {
      mc.mouse.pressed = false;
      mc.mouse.button = -1;
    }
  }
}

function releaseHandle() {
  isDraggingHandle = false;
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
    stopPlayback({ clearBalls: false });
    return;
  }

  // 2) CD 핸들/디바이스 상호작용
  if (window.CDPlayer && window.CDPlayer.handlePointerDown) {
    window.CDPlayer.handlePointerDown(x, y);
  }

  // 3) 공 생성
  createBall(x, y);
  lastSpawn.set(e.pointerId, { x, y }); // 시작점 기록
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

  // 🟢 드래그로 연속 생성
  if (lastSpawn.has(e.pointerId)) {
    const prev = lastSpawn.get(e.pointerId);
    const dx = x - prev.x;
    const dy = y - prev.y;
    const d = Math.hypot(dx, dy);
    if (d >= DRAG_SPAWN_DIST) {
      const steps = Math.floor(d / DRAG_SPAWN_DIST);
      for (let i = 1; i <= steps; i++) {
        const sx = prev.x + (dx * i) / steps;
        const sy = prev.y + (dy * i) / steps;
        createBall(sx, sy);
      }
      lastSpawn.set(e.pointerId, { x, y });
    }
  }
}

function onPointerUp(e) {
  e.preventDefault();
  e.stopPropagation();

  if (window.CDPlayer && window.CDPlayer.handlePointerUp) {
    window.CDPlayer.handlePointerUp(e.offsetX, e.offsetY);
  }

  isDraggingHandle = false;
  pointers.delete(e.pointerId);
  lastSpawn.delete(e.pointerId);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // ✅ 캔버스 크기 바뀌면 CDPlayer의 앵커/핸들도 새 좌표로 리셋
  if (window.CDPlayer && window.CDPlayer.resetHandle) {
    window.CDPlayer.resetHandle(width, height);
  }

  // 바닥과 벽 위치 재조정
  const { Bodies, Body } = Matter;
  if (ground) {
    Body.setPosition(ground, { x: width / 2, y: height - 10 });
  }
  if (leftWall) {
    Body.setPosition(leftWall, { x: 10, y: height / 2 });
  }
  if (rightWall) {
    Body.setPosition(rightWall, { x: width - 10, y: height / 2 });
  }
  if (topWall) {
    Body.setPosition(topWall, { x: width / 2, y: 10 });
  }
  if (bottomWall) {
    Body.setPosition(bottomWall, { x: width / 2, y: height - 10 });
  }
}

function createBall(x, y) {
  if (balls.length >= MAX_BALLS) return; // 과도 생성 방지

  const { Bodies } = Matter;

  // 다양한 크기의 공 생성 (6-26px)
  const size = random(6, 26);
  const mass = size / 5;

  // 색상 그라데이션 생성 (왼쪽에서 오른쪽으로)
  const hue = map(x, 0, width, 0, 360);
  const body = Bodies.circle(x, y, size, {
    restitution: 0.4,
    friction: 0.3,
    frictionAir: DEFAULT_AIR, // 기본 공기 저항
    density: 0.0005,
  });

  Matter.World.add(world, body);

  balls.push({
    body,
    size,
    mass,
    hue,
    stuck: false, // 벽에 붙었는지
    stickSide: null, // 'top' | 'bottom' | 'left' | 'right'
  });
}

// u∈[0,1) 를 프레임(사각 테두리) 둘레의 한 점으로 매핑 + 안쪽 노멀 반환
function framePathPoint(u, inset = FRAME_INSET) {
  const x0 = inset,
    y0 = inset;
  const x1 = width - inset,
    y1 = height - inset;
  const w = x1 - x0,
    h = y1 - y0;

  const per = 2 * (w + h);
  let s = (u % 1) * per;

  // 위변(좌→우)
  if (s <= w) return { px: x0 + s, py: y0, nx: 0, ny: +1 };
  s -= w;
  // 오른변(상→하)
  if (s <= h) return { px: x1, py: y0 + s, nx: -1, ny: 0 };
  s -= h;
  // 아래변(우→좌)
  if (s <= w) return { px: x1 - s, py: y1, nx: 0, ny: -1 };
  s -= w;
  // 왼변(하→상)
  return { px: x0, py: y1 - s, nx: +1, ny: 0 };
}

// 색상 → 프레임의 목표 좌표(겹 포함)
function targetOnFrameByHue(hue) {
  const u = (((hue % 360) + 360) % 360) / 360; // 0~1
  const band = Math.floor(u * BANDS); // 0..BANDS-1
  const depth = (band + 0.5) * LANE_GAP; // 겹 깊이

  const { px, py, nx, ny } = framePathPoint(u, FRAME_INSET);
  return { tx: px + nx * depth, ty: py + ny * depth };
}

// 유틸: 벽 가장자리까지 스냅
function snapToZoneEdge(zone, pos, r) {
  // zone은 {x,y,width,height} / CENTER 기준
  const halfW = zone.width / 2;
  const halfH = zone.height / 2;
  const left = zone.x - halfW;
  const right = zone.x + halfW;
  const top = zone.y - halfH;
  const bottom = zone.y + halfH;

  // 어느 면이 가까운지 판정
  const distTop = Math.abs(pos.y - top);
  const distBottom = Math.abs(pos.y - bottom);
  const distLeft = Math.abs(pos.x - left);
  const distRight = Math.abs(pos.x - right);

  const minD = Math.min(distTop, distBottom, distLeft, distRight);

  if (minD === distTop) {
    return {
      x: constrain(pos.x, left + r, right - r),
      y: top + r,
      side: "top",
    };
  } else if (minD === distBottom) {
    return {
      x: constrain(pos.x, left + r, right - r),
      y: bottom - r,
      side: "bottom",
    };
  } else if (minD === distLeft) {
    return {
      x: left + r,
      y: constrain(pos.y, top + r, bottom - r),
      side: "left",
    };
  } else {
    return {
      x: right - r,
      y: constrain(pos.y, top + r, bottom - r),
      side: "right",
    };
  }
}

function unstickAll() {
  const { Body } = Matter;
  for (const b of balls) {
    if (!b.body) continue;
    if (b.stuck) {
      b.stuck = false;
      b.stickSide = null;
      Body.setStatic(b.body, false);
      b.body.frictionAir = DEFAULT_AIR;
    }
  }
}

function updateMagnetEffect() {
  const { Body } = Matter;

  if (!isMagnetActive) {
    // 자석 OFF: 색상별 약한 중력으로 자연 낙하
    for (let b of balls) {
      if (!b.body) continue;
      const g = map(b.hue, 0, 360, 0.3, 0.7) * 0.0008;
      if (b.body.position.y < height - 50)
        Body.applyForce(b.body, b.body.position, { x: 0, y: g });
    }
    return;
  }

  // 자석 ON: 프레임 밴딩 정렬
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    if (!b.body) continue;

    // 1) 색상으로 프레임 타깃 산출
    const { tx, ty } = targetOnFrameByHue(b.hue);
    const px = b.body.position.x,
      py = b.body.position.y;
    const dx = tx - px,
      dy = ty - py;
    const dist = Math.hypot(dx, dy) || 1;

    // 2) 스프링(거리 비례) + 자석 강도 가중
    const hueBoost = map(b.hue, 0, 360, 0.9, 1.2);
    const k = SPRING_K * magnetStrength * hueBoost;
    Body.applyForce(b.body, b.body.position, {
      x: (dx / dist) * k * dist,
      y: (dy / dist) * k * dist,
    });

    // 3) 공끼리 가벼운 반발(겹침 방지)
    for (let j = i + 1; j < balls.length; j++) {
      const o = balls[j];
      if (!o.body) continue;
      const ddx = px - o.body.position.x,
        ddy = py - o.body.position.y;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 > 1 && d2 < REP_RADIUS * REP_RADIUS) {
        const d = Math.sqrt(d2),
          rx = ddx / d,
          ry = ddy / d;
        const f = (REP_RADIUS - d) * REP_K;
        Body.applyForce(b.body, b.body.position, { x: rx * f, y: ry * f });
        Body.applyForce(o.body, o.body.position, { x: -rx * f, y: -ry * f });
      }
    }

    // 4) 살짝 감쇠 → 프레임에 "착" 붙게
    b.body.velocity.x *= DAMP;
    b.body.velocity.y *= DAMP;
    b.body.angularVelocity *= 0.98;
  }
}

function draw() {
  // 안전 초기화 - 잔상 방지
  blendMode(BLEND);
  drawingContext.globalAlpha = 1;

  // CDPlayer 물리 업데이트
  if (window.CDPlayer && window.CDPlayer.updatePhysics) {
    window.CDPlayer.updatePhysics();
  }

  // Matter.js 엔진 업데이트
  const { Engine } = Matter;
  Engine.update(engine);

  // 배경 완전히 덮기 - 잔상 효과를 위한 반투명 배경
  background(0, 0, 0, 2);

  // 자석 효과 업데이트
  updateMagnetEffect();

  // 공 그리기 - 유리구슬 효과
  for (let ball of balls) {
    if (!ball.body) continue;

    push();
    translate(ball.body.position.x, ball.body.position.y);
    rotate(ball.body.angle);

    const hue = ball.hue;
    const saturation = 70;
    const brightness = isMagnetActive || ball.stuck ? 85 : 60;
    const r = ball.size;

    const ctx = drawingContext;
    ctx.save();

    // === 유리구슬 효과 ===

    // 1) 외곽 그림자 (부드러운 확장)
    const shadowGrad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.5);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.15)");
    shadowGrad.addColorStop(0.6, "rgba(0,0,0,0.08)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // 2) 메인 색상 (반투명 유리 느낌)
    const colorGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    colorGrad.addColorStop(
      0,
      `hsla(${hue}, ${saturation}%, ${brightness + 20}%, 0.85)`
    );
    colorGrad.addColorStop(
      0.4,
      `hsla(${hue}, ${saturation}%, ${brightness + 10}%, 0.7)`
    );
    colorGrad.addColorStop(
      0.8,
      `hsla(${hue}, ${saturation}%, ${brightness}%, 0.6)`
    );
    colorGrad.addColorStop(
      1,
      `hsla(${hue}, ${saturation - 10}%, ${brightness - 5}%, 0.5)`
    );
    ctx.fillStyle = colorGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // 3) 윗부분 반사 하이라이트 (유리구슬 느낌)
    const highlightGrad = ctx.createRadialGradient(
      -r * 0.25,
      -r * 0.3,
      0,
      -r * 0.25,
      -r * 0.3,
      r * 0.6
    );
    highlightGrad.addColorStop(0, "rgba(255,255,255,0.9)");
    highlightGrad.addColorStop(0.3, "rgba(255,255,255,0.6)");
    highlightGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.3, r * 0.6, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // 4) 작은 반사 하이라이트 (실제 유리구슬처럼)
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.45, r * 0.15, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // 5) 외곽 테두리 (유리 가장자리)
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${brightness + 15}%, 0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();

    // 6) 자석 모드일 때 추가 글로우 효과
    if (isMagnetActive || ball.stuck) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${brightness}%, 0.5)`;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    ctx.restore();
    pop();
  }

  // CD Player 그리기
  // 블렌드 모드는 이미 draw() 시작 시 BLEND로 설정됨
  drawingContext.globalAlpha = 1;
  if (window.CDPlayer && window.CDPlayer.drawDevice) {
    window.CDPlayer.drawDevice({
      cx: width / 2,
      cy: height / 2,
      handleSize: 26,
      angleDeg: angle,
      onPullEnd: window.currentOnPullEnd,
    });
  }

  // 자석 모드일 때 빛나는 효과
  if (isMagnetActive) {
    drawMagnetEffect();
  }

  // CD Player 회전 업데이트
  if (isMagnetActive) {
    rotationSpeed = lerp(rotationSpeed, 1.5, 0.05);
  } else {
    rotationSpeed = lerp(rotationSpeed, 0, 0.08);
  }
  angle += rotationSpeed;
  if (angle >= 360) angle -= 360;
}

function drawMagnetEffect() {
  push();
  blendMode(ADD);

  // 알파 누수 방지를 위한 초기화
  drawingContext.globalAlpha = 1;

  // 자석 영역 시각화 (위, 아래, 왼쪽, 오른쪽) - 그라데이션 효과
  const zones = [
    { x: width / 2, y: 30, width: width, height: 80 },
    { x: width / 2, y: height - 30, width: width, height: 80 },
    { x: 30, y: height / 2, width: 80, height: height },
    { x: width - 30, y: height / 2, width: 80, height: height },
  ];

  for (let zone of zones) {
    const alpha = map(magnetStrength, 0, 1, 0, 40, true);

    // 그라데이션 효과 추가
    const ctx = drawingContext;
    let gradient;

    if (zone.width > zone.height) {
      // 가로 방향 그라데이션 (위/아래)
      gradient = ctx.createLinearGradient(
        0,
        zone.y - zone.height / 2,
        0,
        zone.y + zone.height / 2
      );
    } else {
      // 세로 방향 그라데이션 (왼쪽/오른쪽)
      gradient = ctx.createLinearGradient(
        zone.x - zone.width / 2,
        0,
        zone.x + zone.width / 2,
        0
      );
    }

    gradient.addColorStop(0, `hsla(210, 70%, 100%, ${alpha * 0.01})`);
    gradient.addColorStop(0.5, `hsla(210, 70%, 100%, ${alpha * 0.015})`);
    gradient.addColorStop(1, `hsla(210, 70%, 100%, ${alpha * 0.01})`);

    ctx.fillStyle = gradient;
    noStroke();
    rectMode(CENTER);
    rect(zone.x, zone.y, zone.width, zone.height);
  }

  pop();

  // 블렌드 모드 복구 - 잔상 방지
  blendMode(BLEND);
  drawingContext.globalAlpha = 1;
}

function handlePullEnd(pullDistance) {
  console.log("Pull distance:", pullDistance);

  // 핸들을 충분히 당긴 경우 자석 모드 토글
  if (pullDistance > 10) {
    isMagnetActive = !isMagnetActive;

    if (isMagnetActive) {
      // 자석 모드 활성화 - 부드럽게 강도 증가
      magnetStrength = 0;
      // 스냅백 시작
      if (window.CDPlayer && window.CDPlayer.startSnapBack) {
        window.CDPlayer.startSnapBack();
      }
    } else {
      // 일반 모드로 복귀
      magnetStrength = 0;
    }
  }
}

// 자석 강도를 부드럽게 증가/감소
function updateMagnetStrength() {
  if (isMagnetActive) {
    magnetStrength = lerp(magnetStrength, 1, 0.05);
  } else {
    magnetStrength = lerp(magnetStrength, 0, 0.1);
  }
}
