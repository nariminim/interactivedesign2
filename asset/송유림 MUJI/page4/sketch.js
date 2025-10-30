// Page 4: Shower Scene - CDPlayer를 샤워기로 재해석

// ✅ updateGlassOverlay 함수 정의 (빈 함수로 크래시 방지)
function updateGlassOverlay(cx, cy, blurPx = 96) {
  // no-op (필요하면 여기서 CSS 변수 등 업데이트)
}

let angle = 0; // 회전 각도

let raindrops = [];
let rainbowAlpha = 0;
let isRaining = false;
let isRainbow = false; // 증기 효과 flag로 재활용
let pointerX = -9999;
let pointerY = -9999;
let pointers = new Map();
let isDraggingHandle = false;

// 증기 파티클
let steamParticles = [];

// === Bubbles ===
let bubbles = [];
let bubblePops = []; // 팝(터짐) 이펙트
const BUBBLE_CAP = 120;
const POP_CAP = 120;
const BUBBLE_EMIT_DIST = 18; // 드래그 중 연속 생성 간격(px)
const BUBBLE_EMIT_DELAY = 40; // 포인터별 최소 간격(ms)
const BUBBLE_MIN_R = 14;
const BUBBLE_MAX_R = 34;

const GRAVITY = 0.6; // 부드럽게 떨어지는 중력
const DROP_RADIUS = 4;
const DROP_COUNT = 30; // 초기 낙하 개수 감소

// 음악
let rainSound;
let isMusicPlaying = false;

// 효과음
let dingSound; // ding.mp3 효과음
let lastSoundTime = 0;
const SOUND_COOLDOWN = 60; // 효과음 재생 간격 (ms)
let audioContextStarted = false; // 오디오 컨텍스트 시작 여부

let cnv;
let bgBuffer; // 배경 캐시
let dropSprite; // 빗방울 스프라이트
let smokeSprites = []; // 증기 스프라이트 [작, 중, 대]
let dingPlayers = []; // 사운드 풀
let dingIndex = 0;
let adaptiveSpawnSkip = 5; // 적응형 스폰 간격(감소된 밀도)

// 타일 배경 렌더링 설정
const TILE_SIZE = 48;
const TILE_GAP = 6;
const TILE_SPACING = TILE_SIZE + TILE_GAP;
let tileNoiseZ = 0; // 타일 색 변조용 노이즈 시드
let sessionTone = 0; // 새로고침마다 바뀌는 파랑↔초록 톤(0=파랑, 1=초록)

function renderTileBackground(buffer) {
  if (!buffer) return;

  // 더 진한 회색 그라우트(줄눈)
  buffer.background(200, 200, 200);
  const ctx = buffer.drawingContext;

  const nx = 0.008;
  const ny = 0.008;

  for (let y = 0; y < buffer.height + TILE_SPACING; y += TILE_SPACING) {
    for (let x = 0; x < buffer.width + TILE_SPACING; x += TILE_SPACING) {
      // 타일별 블루↔그린 톤 변조 (세션마다 변화)
      const n = noise(x * nx, y * ny, tileNoiseZ);

      // 색상 범위를 더 넓게 (파랑~초록 다양하게)
      const tileTone = map(n, 0, 1, 0, 1); // 각 타일마다 다른 톤 (0=파랑, 1=초록)
      const delta = map(n, 0, 1, -50, 50);

      // 각 타일의 base 색상을 더 다양하게 (파랑~청록~초록 스펙트럼)
      const gBase = lerp(120, 220, tileTone);
      const bBase = lerp(260, 160, tileTone);
      const rVariation = lerp(0, 15, tileTone); // 초록 쪽으로 갈수록 약간의 빨강 추가
      const baseR = constrain(rVariation + delta * 0.2, 0, 40);
      const baseG = constrain(gBase + delta, 90, 240);
      const baseB = constrain(bBase + delta * 1.6, 150, 275);

      // 좌상단→우하단 그라디언트로 볼륨감
      const gx0 = x;
      const gy0 = y;
      const gx1 = x + TILE_SIZE;
      const gy1 = y + TILE_SIZE;
      const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);

      const light = [
        constrain(baseR + 22, 0, 255),
        constrain(baseG + 22, 0, 255),
        constrain(baseB + 22, 0, 255),
      ];
      const dark = [
        constrain(baseR - 28, 0, 255),
        constrain(baseG - 28, 0, 255),
        constrain(baseB - 28, 0, 255),
      ];

      grad.addColorStop(0, `rgba(${light[0]},${light[1]},${light[2]},1)`);
      grad.addColorStop(1, `rgba(${dark[0]},${dark[1]},${dark[2]},1)`);

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      // 엣지 하이라이트/섀도우로 타일이 솟아 보이게
      ctx.save();
      ctx.lineWidth = 1;
      // 상/좌 하이라이트
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(x + 0.5, y + 0.5);
      ctx.lineTo(x + TILE_SIZE - 0.5, y + 0.5);
      ctx.moveTo(x + 0.5, y + 0.5);
      ctx.lineTo(x + 0.5, y + TILE_SIZE - 0.5);
      ctx.stroke();
      // 우/하 섀도우
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.moveTo(x + TILE_SIZE - 0.5, y + 1);
      ctx.lineTo(x + TILE_SIZE - 0.5, y + TILE_SIZE - 0.5);
      ctx.moveTo(x + 1, y + TILE_SIZE - 0.5);
      ctx.lineTo(x + TILE_SIZE - 0.5, y + TILE_SIZE - 0.5);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// 포인터 정리 유틸
function clearAllPointers() {
  pointers.clear();
  pointerX = -9999;
  pointerY = -9999;
}

// ✅ [추가] 다양한 포맷 허용 + 사운드 풀 로더
function loadSoundPool(path, count, onDone) {
  let loaded = 0;
  const pool = [];
  for (let i = 0; i < count; i++) {
    loadSound(
      path,
      (sf) => {
        sf.playMode("sustain"); // 겹쳐 재생 가능
        pool.push(sf);
        loaded++;
        if (loaded === count && onDone) onDone(pool);
      },
      (err) => console.error("loadSoundPool error:", err)
    );
  }
}

// 물방울 생성 함수 (안전 체크 추가)
function createRaindrop(x, y) {
  if (!CDPlayer || !CDPlayer.getWorld()) return null;

  const { Bodies, World } = Matter;
  const drop = Bodies.circle(x, y, DROP_RADIUS, {
    friction: 0.001,
    restitution: 0.6,
    density: 0.001,
    render: { visible: false },
  });

  const world = CDPlayer.getWorld();
  if (world) {
    World.add(world, drop);
  }
  return drop;
}

// 비 생성 (적응형 스폰)
function spawnRain() {
  if (!isRaining) return;
  // 스폰 빈도와 전체 개수 낮춤
  if (frameCount % adaptiveSpawnSkip === 0 && raindrops.length < 90) {
    const x = random(width * 0.1, width * 0.9);
    const y = random(-80, 0);
    const drop = createRaindrop(x, y);
    if (drop) raindrops.push(drop);
  }
}

// 성능에 따라 적응형 조정
function adjustPerformance() {
  const fps = frameRate();
  // 전반적으로 더 성글게
  if (fps < 48) adaptiveSpawnSkip = 8;
  else if (fps < 55) adaptiveSpawnSkip = 6;
  else adaptiveSpawnSkip = 5;
}

// 오디오 컨텍스트 시작 함수 (브라우저 오디오 정책 준수)
function ensureAudioContext() {
  try {
    // p5 전용 유틸: iOS에서 확실히 시작
    if (typeof userStartAudio === "function") userStartAudio();

    const ctx = getAudioContext && getAudioContext();
    if (ctx && ctx.state !== "running") {
      ctx.resume();
    }
    audioContextStarted = true;
    // 마스터 볼륨 기본값(혹시 0이면)
    if (typeof masterVolume === "function") masterVolume(1.0);
  } catch (e) {
    console.error("Audio context start error:", e);
  }
}

// ding 효과음 재생 (라운드로빈 풀)
function playDingSound() {
  const now = millis();
  if (now - lastSoundTime < SOUND_COOLDOWN) return;
  lastSoundTime = now;

  if (!dingPlayers.length) return;

  const p = dingPlayers[dingIndex];
  dingIndex = (dingIndex + 1) % dingPlayers.length;

  try {
    ensureAudioContext();
    p.setVolume(random(0.45, 0.8));
    p.rate(random(0.92, 1.08));
    p.play(); // sustain 모드라 겹쳐 재생 OK
  } catch (e) {
    console.error("Ding play error:", e);
  }
}

// 비 업데이트 (경량화된 물리)
const HAND_R2 = 150 * 150; // 손 반응 반경 제곱
function updateRain() {
  const { Body } = Matter;
  const px = pointerX;
  const py = pointerY;
  // 포인터가 유효한 범위에 있고, 실제로 손이 닿아있는지 확인
  const isPointerOnScreen = px >= 0 && px < width && py >= 0 && py < height;
  // 다운 중(active=true) 포인터가 하나라도 있어야 반응
  const anyActive = Array.from(pointers.values()).some(
    (p) => p && p.active === true
  );
  const usePointer = isPointerOnScreen && anyActive;

  for (let i = raindrops.length - 1; i >= 0; i--) {
    const d = raindrops[i];
    const prevVy = d.velocity.y;

    // 중력: 속도 직접 증가 (force 대신)
    Body.setVelocity(d, {
      x: d.velocity.x,
      y: d.velocity.y + GRAVITY * 0.04,
    });

    // 손 반응 (손이 화면에 닿아있을 때만)
    if (usePointer) {
      const dx = px - d.position.x;
      const dy = py - d.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < HAND_R2) {
        const dist = Math.sqrt(distSq) || 1;
        const ux = dx / dist;
        const uy = dy / dist;
        const kick = map(dist, 0, 150, -3.0, -0.4, true);
        Body.setVelocity(d, {
          x: d.velocity.x + ux * kick,
          y: d.velocity.y + uy * kick * 0.6,
        });

        // 손에 닿았을 때 ding.mp3 재생
        if (distSq < 30000 && random() < 0.6 && millis() - lastSoundTime > 30) {
          playDingSound();
        }
      }
    }

    // 화면 밖이면 제거
    if (d.position.y > height + 100) {
      const world = CDPlayer ? CDPlayer.getWorld() : null;
      if (world) {
        Matter.World.remove(world, d);
      }
      raindrops.splice(i, 1);
    }
  }
}

// 빗방울 스프라이트 생성
function buildDropSprite() {
  const W = 5; // 더 굵게
  const H = 120; // 더 길게
  dropSprite = createGraphics(W, H);
  const ctx = dropSprite.drawingContext;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  // 더 진하고 푸른 톤
  grad.addColorStop(0, "rgba(226, 245, 255, 0.98)");
  grad.addColorStop(1, "rgba(24, 93, 255, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, W / 2);
  ctx.fill();
}

// 물방울 렌더링 (스프라이트 버전 - 성능 최적화)
function drawRain() {
  if (!dropSprite) return;

  for (let d of raindrops) {
    const vx = d.velocity.x;
    const vy = d.velocity.y;
    const speed = Math.hypot(vx, vy);

    // 더 길고 굵게
    const dropLength = constrain(map(speed, 0, 30, 30, 90), 20, 120);
    const dropWidth = map(speed, 0, 30, 2.4, 5.0);
    const angle = Math.atan2(vy, vx) + Math.PI / 2;
    const windOffset = Math.sin(frameCount * 0.05 + d.position.x * 0.02) * 3;

    push();
    translate(d.position.x + windOffset, d.position.y);
    rotate(angle);
    scale(dropWidth / 4, dropLength / 60);
    imageMode(CENTER);
    // 더 진하게 보이도록 투명도 상향
    tint(255, map(speed, 0, 25, 180, 255));
    image(dropSprite, 0, 0);
    pop();
  }
  noTint();
}

// 증기 파티클 클래스
class SteamParticle {
  constructor(x, y) {
    this.x = x + random(-40, 40);
    this.y = y + random(-10, 10);
    this.vx = random(-0.4, 0.4); // 좌우 퍼짐 증가
    this.vy = random(-2.5, -1.5); // 위로 더 빠르게 상승
    this.r = random(20, 80);
    this.alpha = 0;
    this.maxAlpha = random(140, 200);
    this.life = random(250, 400); // 수명 증가
    this.age = 0;
  }

  // 💨 손 근처에서 퍼지는 반응
  reactToPointer(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    const distSq = dx * dx + dy * dy;
    const radius = 150; // 손 반응 반경

    if (distSq < radius * radius) {
      const dist = sqrt(distSq);
      const strength = map(dist, 0, radius, 0.9, 0.05); // 가까울수록 강하게
      const angle = atan2(dy, dx);

      // 손에서 멀어지는 방향으로 힘 적용
      this.vx += cos(angle) * strength * 0.5;
      this.vy += sin(angle) * strength * 0.5;
    }
  }

  update() {
    // 기존 이동
    this.x += this.vx;
    this.y += this.vy;

    // 감속 효과 줄임 (더 오래 상승)
    this.vx *= 0.96;
    this.vy *= 0.97;

    this.age++;

    // 등장 빨리 → 오래 유지 → 천천히 페이드아웃
    if (this.age < this.life * 0.15)
      this.alpha = map(this.age, 0, this.life * 0.15, 0, this.maxAlpha);
    else if (this.age < this.life * 0.6) this.alpha = this.maxAlpha; // 유지
    else
      this.alpha = map(this.age, this.life * 0.6, this.life, this.maxAlpha, 0);

    // 더 빠르게 퍼지는 효과
    this.r += 0.18;

    // 자연스러운 공기 흐름 (미세 흔들림)
    this.x += sin(frameCount * 0.015 + this.y * 0.04) * 0.3;

    // 지속적인 상승력
    this.vy -= 0.15;
  }

  display() {
    if (smokeSprites.length === 0) return;

    push();
    translate(this.x, this.y);

    // 크기에 따라 다른 스프라이트 사용
    const sprite =
      this.r < 48
        ? smokeSprites[0]
        : this.r < 96
        ? smokeSprites[1]
        : smokeSprites[2];

    tint(255, this.alpha);
    imageMode(CENTER);
    const s = this.r * 2;
    image(sprite, 0, 0, s, s);
    noTint();

    pop();
  }

  isDead() {
    return this.age > this.life;
  }
}

// === 버블 클래스 ===
class Bubble {
  constructor(x, y) {
    this.x = x + random(-4, 4);
    this.y = y + random(-4, 4);
    this.r = random(BUBBLE_MIN_R, BUBBLE_MAX_R);
    this.vx = random(-0.35, 0.35);
    this.vy = random(-1.4, -0.8); // 위로 부드럽게
    this.wobbleT = random(TAU);
    this.alpha = 220; // 반투명 흰색
    this.life = random(180, 320); // 프레임 수명
    this.age = 0;
  }
  update() {
    // 미세한 흔들림 + 부력/저항
    this.wobbleT += 0.06;
    this.x += this.vx + sin(this.wobbleT) * 0.2;
    this.vy *= 0.985; // 공기 저항
    this.y += this.vy - 0.08; // 꾸준히 위로 부력

    this.age++;
    // 천천히 투명해짐
    if (this.age > this.life * 0.6) {
      this.alpha = map(this.age, this.life * 0.6, this.life, 220, 0, true);
    }
    // 화면 위에서 터짐
    if (this.y < -this.r - 10) this.alpha = 0;
  }
  shouldPop() {
    return this.alpha <= 0 || this.age >= this.life || random() < 0.003;
  }
  draw(g = null) {
    // 유리같은 하이라이트 표현
    push();
    translate(this.x, this.y);
    noStroke();

    // 외곽 글로우
    fill(255, 255, 255, this.alpha * 0.2);
    ellipse(0, 0, this.r * 2.25, this.r * 2.25);

    // 본체
    fill(255, 255, 255, this.alpha * 0.65);
    ellipse(0, 0, this.r * 2, this.r * 2);

    // 하이라이트(좌상단)
    const hlr = this.r * 0.55;
    fill(255, 255, 255, this.alpha * 0.75);
    ellipse(-this.r * 0.35, -this.r * 0.35, hlr, hlr * 0.8);

    // 반대측 약한 반사
    fill(255, 255, 255, this.alpha * 0.25);
    ellipse(this.r * 0.25, this.r * 0.25, this.r * 0.35, this.r * 0.28);
    pop();
  }
}

class BubblePop {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r * 0.9;
    this.ring = r * 0.9;
    this.alpha = 220;
    this.particles = [];
    const n = 6; // 작은 물방울 파편
    for (let i = 0; i < n; i++) {
      const ang = random(TAU);
      const spd = random(0.8, 1.6);
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: cos(ang) * spd,
        vy: sin(ang) * spd - 0.2,
        r: random(2, 4),
        a: 200,
      });
    }

    // 버블 터지는 효과음 (p5.sound 자체 생성)
    try {
      const osc = new p5.Oscillator("sine");
      osc.freq(random(200, 400));
      osc.amp(0.05);
      osc.start();
      osc.stop(0.08);

      // 피치 슬라이드 효과
      const env = new p5.Envelope();
      env.setADSR(0.001, 0.05, 0, 0.05);
      env.setRange(0.5, 0);
      env.play(osc);
    } catch (e) {
      // 사운드 생성 실패 시 무시
    }
  }
  update() {
    this.ring += 1.6;
    this.alpha *= 0.92;
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02; // 살짝 더 위로
      p.a *= 0.93;
    }
  }
  dead() {
    return this.alpha < 4;
  }
  draw() {
    push();
    noFill();
    stroke(255, 255, 255, this.alpha);
    strokeWeight(2);
    ellipse(this.x, this.y, this.ring * 2, this.ring * 2);
    pop();

    noStroke();
    for (let p of this.particles) {
      fill(255, 255, 255, p.a);
      ellipse(p.x, p.y, p.r * 2, p.r * 2);
    }
  }
}

// === 버블 생성/업데이트 함수 ===
function spawnBubbles(x, y, count = 2) {
  for (let i = 0; i < count; i++) {
    if (bubbles.length >= BUBBLE_CAP) break;
    bubbles.push(new Bubble(x, y));
  }
}

function updateBubbles() {
  // 업데이트 & 팝 처리
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];

    // 비가 내릴 때: 물방울에 맞으면 터짐
    if (isRaining && raindrops.length > 0) {
      let shouldPop = false;
      for (let drop of raindrops) {
        const dx = drop.position.x - b.x;
        const dy = drop.position.y - b.y;
        const distSq = dx * dx + dy * dy;
        const threshold = (b.r + DROP_RADIUS) * (b.r + DROP_RADIUS);

        if (distSq < threshold) {
          shouldPop = true;
          break;
        }
      }

      if (shouldPop) {
        if (bubblePops.length < POP_CAP) {
          bubblePops.push(new BubblePop(b.x, b.y, b.r));
        }
        bubbles.splice(i, 1);
        continue;
      }
    }

    b.update();
    b.draw();
    if (b.shouldPop()) {
      if (bubblePops.length < POP_CAP) {
        bubblePops.push(new BubblePop(b.x, b.y, b.r));
      }
      bubbles.splice(i, 1);
    }
  }

  // 팝 이펙트
  for (let i = bubblePops.length - 1; i >= 0; i--) {
    const p = bubblePops[i];
    p.update();
    p.draw();
    if (p.dead()) bubblePops.splice(i, 1);
  }
}

// 증기 생성 (개수 제한: 30개만)
function spawnSteam() {
  if (!isRainbow) return; // 증기 효과 flag
  if (frameCount % 3 === 0 && steamParticles.length < 30) {
    const baseY = height - 50;
    const baseX = width / 2 + random(-120, 120);
    steamParticles.push(new SteamParticle(baseX, baseY));
  }
}

// 증기 업데이트 (손 반응 추가)
function updateSteam() {
  for (let i = steamParticles.length - 1; i >= 0; i--) {
    const s = steamParticles[i];

    // 손이 움직이면 증기 반응
    if (
      pointerX >= 0 &&
      pointerX < width &&
      pointerY >= 0 &&
      pointerY < height
    ) {
      s.reactToPointer(pointerX, pointerY);
    }

    s.update();
    s.display();

    if (s.isDead()) steamParticles.splice(i, 1);
  }
}

// 증기 스프라이트 생성
function buildSmokeSprites() {
  const sizes = [64, 128, 256];
  smokeSprites = sizes.map((S) => {
    const g = createGraphics(S, S);
    const ctx = g.drawingContext;
    const grad = ctx.createRadialGradient(
      S / 2,
      S / 2,
      S * 0.05,
      S / 2,
      S / 2,
      S / 2
    );
    grad.addColorStop(0, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(200,220,255,0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    ctx.fill();
    return g;
  });
}

// 무지개 렌더링 (증기 효과로 대체됨)
function drawRainbow(cx, cy, r) {
  push();
  noFill();
  strokeWeight(8);
  for (let i = 0; i < 6; i++) {
    const colors = [
      [255, 0, 0],
      [255, 165, 0],
      [255, 255, 0],
      [0, 128, 0],
      [0, 0, 255],
      [75, 0, 130],
    ];
    const c = colors[i];
    stroke(c[0], c[1], c[2], rainbowAlpha);
    arc(cx, cy, r + i * 10, r + i * 10, PI, TWO_PI);
  }
  pop();
}

function setup() {
  const ratio = window.devicePixelRatio || 1;
  pixelDensity(constrain(ratio * 0.6, 1, 2));

  cnv = createCanvas(windowWidth, windowHeight);
  cnv.style("width", "100vw");
  cnv.style("height", "100vh");

  // 포인터 이벤트
  cnv.elt.addEventListener("pointerdown", onPointerDown);
  cnv.elt.addEventListener("pointermove", onPointerMove);
  cnv.elt.addEventListener("pointerup", onPointerUp);
  cnv.elt.addEventListener("pointercancel", onPointerUp);

  // 배경 캐시 생성 및 타일 배경 렌더링
  bgBuffer = createGraphics(width, height);
  tileNoiseZ = random(10000); // 세션마다 완전히 다른 배치
  sessionTone = random(); // 0(파랑)↔1(초록) 사이에서 세션별 임의 값
  renderTileBackground(bgBuffer);

  // 스프라이트 사전 생성
  buildDropSprite();
  buildSmokeSprites();

  // CDPlayer 물리 초기화
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
    const knobTravel = 56 - 22;
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

  // 음악 및 효과음 로드
  rainSound = loadSound(
    "../assets/music/rain.mp3",
    () => {
      console.log("✅ 비 소리 로드 완료");
      // 로드 완료 후 루프 설정
      if (rainSound) {
        rainSound.setLoop(true);
        rainSound.setVolume(0.6); // 볼륨 조정
        console.log("✅ 비 소리 루프 설정 완료");
      }
    },
    (error) => {
      console.error("❌ 비 소리 로드 실패:", error);
    }
  );

  dingSound = loadSound(
    "../assets/music/ding.mp3",
    () => {
      console.log("✅ ding 소리 로드 완료");
      // 사운드 풀 초기화 (6개)
      for (let i = 0; i < 6; i++) {
        try {
          dingPlayers.push(dingSound.clone());
        } catch (e) {
          console.warn("Sound clone failed:", e);
        }
      }
      console.log(
        `✅ Ding sound pool initialized with ${dingPlayers.length} players`
      );
    },
    (error) => {
      console.error("❌ ding 소리 로드 실패:", error);
    }
  );

  // 첫 클릭 시 오디오 컨텍스트 시작 (브라우저 오디오 정책 준수)
  window.addEventListener(
    "pointerdown",
    () => {
      ensureAudioContext();
    },
    { once: true }
  );

  // 캔버스 바깥에서 떼는 경우 대비: 전역에서 업/캔슬을 잡아 강제 정리
  window.addEventListener(
    "pointerup",
    (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        pointerX = -9999;
        pointerY = -9999;
      }
    },
    true
  );

  window.addEventListener(
    "pointercancel",
    (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        pointerX = -9999;
        pointerY = -9999;
      }
    },
    true
  );

  // 브라우저 포커스가 사라질 때도 정리
  window.addEventListener("blur", clearAllPointers, true);

  // 커서가 캔버스 밖으로 나갔을 때도 정리
  cnv.elt.addEventListener("pointerleave", () => {
    clearAllPointers();
  });
}

function draw() {
  // 성능 적응형 조정
  adjustPerformance();

  // 회전 각도 업데이트 (비가 내릴 때만 회전, 증기가 나오면 멈춤)
  if (isRaining && !isRainbow) {
    angle += 0.02;
  }

  // 캐시된 배경 사용 (한 번만 렌더링)
  if (bgBuffer && bgBuffer.width > 0) {
    image(bgBuffer, 0, 0, width, height);
  }

  // 물리 업데이트
  if (window.CDPlayer && CDPlayer.updatePhysics) {
    CDPlayer.updatePhysics();
  }

  // 비 업데이트 및 렌더링
  spawnRain();
  updateRain();
  drawRain();

  // CDPlayer: 기본값으로 호출 (원래 위치/크기 복원)
  if (window.CDPlayer && CDPlayer.updatePhysics && CDPlayer.drawDevice) {
    CDPlayer.drawDevice({
      cx: width / 2,
      cy: height / 2,
      angleDeg: angle * 57.3, // 라디안을 도로 변환
      handleSize: 20,
      bg: bgBuffer, // 배경 버퍼
      bgBlur: bgBuffer, // 블러 버퍼
      onPullEnd: (pull) => {
        if (pull > 10) {
          ensureAudioContext(); // 오디오 컨텍스트 시작 확인

          isRaining = true;
          isRainbow = false;
          rainbowAlpha = 0;
          // 증기 초기화 (다시 잡아당길 수 있도록)
          steamParticles = [];
          // 비가 시작되면 기존 버블은 물방울에 맞으면 자연스럽게 터지도록 함
          // (즉시 제거하지 않고 충돌 감지로 처리)

          // 음악 재생
          console.log("🎵 onPullEnd 호출됨, pull:", pull);
          console.log("🎵 rainSound 상태:", rainSound ? "존재" : "없음");
          console.log("🎵 isMusicPlaying:", isMusicPlaying);

          if (rainSound) {
            try {
              console.log("🎵 음악 재생 시도...");
              ensureAudioContext(); // 재생 직전에 다시 확인

              // 재생 중이 아니면 새로 재생
              if (!isMusicPlaying) {
                console.log("🎵 볼륨 설정:", rainSound.getVolume());
                console.log("🎵 루프 설정:", rainSound.isLooping());
                ensureAudioContext(); // 재생 직전에도 확인
                rainSound.play(); // play() 사용 (루프는 setup에서 이미 설정됨)
                rainSound.setVolume(0.6); // 볼륨 다시 설정
                isMusicPlaying = true;
                console.log("✅ 비 소리 재생 시작 성공");
              } else {
                console.log("🎵 이미 재생 중 - 패스");
              }
            } catch (e) {
              console.error("❌ Rain sound play error:", e);
            }
          } else {
            console.error("❌ rainSound가 로드되지 않음");
          }
          for (let i = 0; i < DROP_COUNT; i++) {
            const drop = createRaindrop(random(width), random(-200, 0));
            if (drop) raindrops.push(drop);
          }
        }
      },
    });

    // CSS 글래스모피즘 오버레이 업데이트
    updateGlassOverlay(width / 2, height / 2, 96);
  }

  // 증기 효과
  spawnSteam();
  updateSteam();

  // 버블 업데이트/렌더
  updateBubbles();

  // 증기가 다 사라지면 초기화
  if (isRainbow && steamParticles.length === 0) {
    isRainbow = false;
  }

  // 음악 페이드아웃 처리
  if (!isRaining && isMusicPlaying && rainSound) {
    const currentVolume = rainSound.getVolume();
    if (currentVolume > 0) {
      rainSound.setVolume(max(0, currentVolume - 0.02));
    } else {
      rainSound.stop();
      isMusicPlaying = false;
      console.log("🔇 비 소리 정지");
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cnv.style("width", "100vw");
  cnv.style("height", "100vh");

  // 배경 캐시 재생성 및 타일 배경 재렌더링 (리사이즈 시도 랜덤 시드 갱신)
  bgBuffer = createGraphics(windowWidth, windowHeight);
  tileNoiseZ = random(10000);
  renderTileBackground(bgBuffer);

  // 핸들 위치 리셋
  if (window.CDPlayer && CDPlayer.resetHandle) {
    CDPlayer.resetHandle(width, height);
  }
}

/* ----------------- Pointer events ----------------- */

function onPointerDown(e) {
  // 좌표 변환: CSS 픽셀 → p5 내부 픽셀
  const rect = cnv.elt.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * width;
  const y = ((e.clientY - rect.top) / rect.height) * height;

  pointers.set(e.pointerId, { x, y, isDraggingHandle: false, active: true });

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

  // 중앙 버튼 클릭 체크 (비 멈추고 증기 시작) - 판정 반경 확대
  const d = dist(x, y, width / 2, height / 2);
  if (d < 100) {
    isRaining = false;
    isRainbow = true; // 증기 효과 flag로 사용
    // 음악 페이드아웃 시작
    console.log("🌧️ 비 멈춤 - 음악 페이드아웃 시작");
    return;
  }

  // CDPlayer 손잡이 드래그 체크
  const h = CDPlayer ? CDPlayer.getHandle() : null;
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
      return; // 손잡이를 잡으면 버블 생성 안 함
    }
  }

  // 손잡이가 아니면 항상 버블 생성 (비 오는 중에도 생성)
  {
    spawnBubbles(x, y, Math.floor(random(2, 4)));

    // 포인터별 최근 생성 상태 저장
    const info = pointers.get(e.pointerId);
    if (info) {
      info.lastEmitX = x;
      info.lastEmitY = y;
      info.lastEmitTime = millis();
      pointers.set(e.pointerId, info);
    }
  }
}

function onPointerMove(e) {
  // 좌표 변환: CSS 픽셀 → p5 내부 픽셀
  const rect = cnv.elt.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * width;
  const y = ((e.clientY - rect.top) / rect.height) * height;

  // 1) 슬라이더 드래그 중인지 먼저 체크 (가장 우선순위)
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
    // 슬라이더 드래그 중이면 다른 인터랙션 완전 차단
    return;
  }

  pointerX = x;
  pointerY = y;

  if (pointers.has(e.pointerId)) {
    const p = pointers.get(e.pointerId);
    p.x = x;
    p.y = y;

    // 손잡이 드래그 중이 아니면 항상 버블 생성 (비 오는 중에도 생성)
    if (!p.isDraggingHandle) {
      // 경로 따라 일정 간격으로 버블 생성
      const now = millis();
      if (p.lastEmitX == null) {
        p.lastEmitX = x;
        p.lastEmitY = y;
        p.lastEmitTime = now;
      } else {
        const dx = x - p.lastEmitX;
        const dy = y - p.lastEmitY;
        const distMoved = Math.hypot(dx, dy);
        if (
          distMoved >= BUBBLE_EMIT_DIST &&
          now - (p.lastEmitTime || 0) >= BUBBLE_EMIT_DELAY
        ) {
          spawnBubbles(x, y, 1 + (random() < 0.5 ? 1 : 0)); // 1~2개
          p.lastEmitX = x;
          p.lastEmitY = y;
          p.lastEmitTime = now;
        }
      }
    }

    pointers.set(e.pointerId, p);
  }

  // 슬라이더가 아니면 핸들 드래그
  if (CDPlayer && CDPlayer.handlePointerMove) {
    CDPlayer.handlePointerMove(x, y);
  }
}

function onPointerUp(e) {
  // 좌표 변환: CSS 픽셀 → p5 내부 픽셀
  const rect = cnv.elt.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * width;
  const y = ((e.clientY - rect.top) / rect.height) * height;

  // 슬라이더 드래그 중지 먼저 체크
  if (CDPlayer && CDPlayer.isOpacityDragging && CDPlayer.isOpacityDragging()) {
    if (CDPlayer.stopOpacityDrag) {
      CDPlayer.stopOpacityDrag();
    }
    const p = pointers.get(e.pointerId);
    if (p) p.active = false;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      pointerX = -9999;
      pointerY = -9999;
    }
    return;
  }

  if (!isDraggingHandle) {
    const p = pointers.get(e.pointerId);
    if (p) p.active = false;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      pointerX = -9999;
      pointerY = -9999;
    }
    return;
  }

  if (CDPlayer && CDPlayer.handlePointerUp) {
    CDPlayer.handlePointerUp(x, y);
  }

  // 재생 중이 아니라면 핸들을 탄성 있게 원위치로 복귀
  if (!isPlaying && window.CDPlayer && CDPlayer.startSnapBack) {
    CDPlayer.startSnapBack();
  }

  isDraggingHandle = false;
  const p = pointers.get(e.pointerId);
  if (p) p.active = false;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    pointerX = -9999;
    pointerY = -9999;
  }
}
