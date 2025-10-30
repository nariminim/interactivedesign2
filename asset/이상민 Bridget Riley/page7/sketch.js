// ===== Matter.js aliases =====
const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Collision = Matter.Collision;
const Bounds = Matter.Bounds;
const Svg = Matter.Svg;

let engine;
let canvas;
let mouse, mouseConstraint;

let shapes = [];
let walls = [];

const colors = ["#dfb31f", "#4871ba", "#1ba473"];
const overlapColors = ["#dfb31f", "#4871ba", "#1ba473", "#ffffff"];

const SHAPE_COUNT = 14;

const TARGET_W = 165;
const TARGET_H = 420;

const WALL_THICKNESS = 50;

// SVG에서 추출한 로컬 버텍스 (중심 기준)
let baseSVGVerts = [];

// 겹친 쌍마다 고정 색 할당
const overlapColorMap = {};

// 배경 스트립
let backgroundStrips = []; // [{y,h,color}, ...]

// 겹침 마스크용 버퍼 (재사용)
let tmpG;

// 캐시 (프레임마다 갱신)
let worldVertsCache = []; // 각 body의 월드 좌표 verts
let boundsCache = []; // 각 body의 bounds

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);

  // 렌더 해상도 강제 1배로 (성능)
  pixelDensity(1);

  // 페이지 여백 제거
  canvas.position(0, 0);
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.backgroundColor = "#ffffff";
  document.documentElement.style.margin = "0";
  document.documentElement.style.padding = "0";

  // Matter 설정
  engine = Engine.create();
  engine.world.gravity.y = 0;
  engine.positionIterations = 4;
  engine.velocityIterations = 4;

  // concave polygon 지원
  Matter.Common.setDecomp(decomp);

  // SVG path → 로컬 버텍스
  prepareSVGVertices();

  // 마우스 드래그
  mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      angularStiffness: 0.75,
    },
  });

  Matter.Events.on(mouseConstraint, "enddrag", (event) => {
    const body = event.body;
    if (!body) return;
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  });

  // 배경 스트립, 도형, 벽 초기화
  makeBackgroundStrips();
  createSVGShapes();
  createWalls();

  // 마우스 컨트롤 추가
  Composite.add(engine.world, mouseConstraint);

  // 겹침 그리기용 버퍼
  tmpG = createGraphics(windowWidth, windowHeight);
  tmpG.pixelDensity(1);
}

// SVG path verts 준비
function prepareSVGVertices() {
  const svgPathEl = document.getElementById("myShape");

  // fallback: 사각형
  const fallbackRect = [
    { x: -TARGET_W / 2, y: -TARGET_H / 2 },
    { x: TARGET_W / 2, y: -TARGET_H / 2 },
    { x: TARGET_W / 2, y: TARGET_H / 2 },
    { x: -TARGET_W / 2, y: TARGET_H / 2 },
  ];

  if (!svgPathEl) {
    console.warn("SVG path #myShape not found. Using rect.");
    baseSVGVerts = fallbackRect;
    return;
  }

  // 점 샘플링
  const rawVerts = Svg.pathToVertices(svgPathEl, 3);
  if (!rawVerts || rawVerts.length < 3) {
    console.warn("Invalid SVG verts. Using rect.");
    baseSVGVerts = fallbackRect;
    return;
  }

  // 타겟 크기로 정규화 & 가운데 기준
  let verts = normalizeAndScaleVerts(rawVerts, TARGET_W, TARGET_H);

  // 폐곡선 보장
  const first = verts[0];
  const last = verts[verts.length - 1];
  if ((first.x - last.x) ** 2 + (first.y - last.y) ** 2 > 0.0001) {
    verts.push({ x: first.x, y: first.y });
  }

  baseSVGVerts = verts;
}

// 로컬 verts → 타겟 크기 스케일, 중심 (0,0)
function normalizeAndScaleVerts(rawVerts, targetW, targetH) {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (let v of rawVerts) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }

  const originalW = maxX - minX;
  const originalH = maxY - minY;

  const scaleFactor = Math.min(
    targetW / (originalW || 1),
    targetH / (originalH || 1)
  );

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return rawVerts.map((v) => ({
    x: (v.x - centerX) * scaleFactor,
    y: (v.y - centerY) * scaleFactor,
  }));
}

// 배경 스트립 생성
function makeBackgroundStrips() {
  backgroundStrips = [];

  const count = 5;
  const coverageRatio = 0.6;
  const totalH = height * coverageRatio;
  const stripH = totalH / count;
  const startY = (height - totalH) / 2;

  for (let i = 0; i < count; i++) {
    const y = startY + i * stripH;
    const colorPick = random(colors);
    backgroundStrips.push({
      y: y,
      h: stripH,
      color: colorPick,
    });
  }
}

// 배경 스트립 렌더
function drawBackgroundStrips() {
  noStroke();
  rectMode(CORNER);

  const marginX = width * 0.1;
  const rectW = width - marginX * 2;

  for (const s of backgroundStrips) {
    fill(s.color);
    rect(marginX, s.y, rectW, s.h);
  }
}

// 월드 경계 벽
function createWalls() {
  for (let wall of walls) Composite.remove(engine.world, wall);
  walls = [];

  walls = [
    Bodies.rectangle(width / 2, -WALL_THICKNESS / 2, width, WALL_THICKNESS, {
      isStatic: true,
    }),
    Bodies.rectangle(
      width / 2,
      height + WALL_THICKNESS / 2,
      width,
      WALL_THICKNESS,
      { isStatic: true }
    ),
    Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height, {
      isStatic: true,
    }),
    Bodies.rectangle(
      width + WALL_THICKNESS / 2,
      height / 2,
      WALL_THICKNESS,
      height,
      { isStatic: true }
    ),
  ];

  Composite.add(engine.world, walls);
}

// SVG 도형 여러 개 생성
function createSVGShapes() {
  const COLS = 7;
  const ROWS = 2;

  const spacingX = TARGET_W * 0.5;
  const spacingY = TARGET_H * 0.3;

  const totalW = (COLS - 1) * spacingX;
  const totalH = (ROWS - 1) * spacingY;

  const startX = width / 2 - totalW / 2;
  const startY = height / 2 - totalH / 2;

  let created = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (created >= SHAPE_COUNT) break;

      const x = startX + col * spacingX + random(-12, 12);
      const y = startY + row * spacingY + random(-10, 10);
      const angle = random(-0.22, 0.22);
      const colorIndex = created % colors.length;

      const vertsCopy = baseSVGVerts.map((pt) => ({ x: pt.x, y: pt.y }));

      let body;
      try {
        body = Bodies.fromVertices(
          x,
          y,
          vertsCopy,
          {
            isSensor: true, // 충돌만 감지(물리 반응 없음)
            friction: 0.3,
            frictionAir: 0.15,
            restitution: 0.1,
            density: 0.08,
            angle: angle,
            render: {
              fillStyle: colors[colorIndex],
              strokeStyle: "transparent",
              lineWidth: 0,
            },
          },
          true
        );
      } catch (err) {
        console.warn("Bodies.fromVertices failed, fallback to rect:", err);
      }

      if (!body) {
        body = Bodies.rectangle(x, y, TARGET_W, TARGET_H, {
          isSensor: true,
          friction: 0.3,
          frictionAir: 0.15,
          restitution: 0.1,
          angle: angle,
          render: {
            fillStyle: colors[colorIndex],
            strokeStyle: "transparent",
            lineWidth: 0,
          },
        });
      }

      // 충돌/렌더 최적화용 캐시
      body._collisionParts =
        body.parts && body.parts.length > 1 ? body.parts.slice(1) : [body];
      body._localVerts = vertsCopy;
      body.customColor = colors[colorIndex];

      shapes.push(body);
      Composite.add(engine.world, body);

      created++;
    }
  }
}

// body의 로컬 verts를 현재 위치/각도로 변환
function computeWorldVertsForBody(body) {
  const pos = body.position;
  const ang = body.angle;
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);

  const src = body._localVerts;
  if (!src || src.length < 2) return null;

  const out = new Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const vx = src[i].x;
    const vy = src[i].y;
    const wx = vx * cosA - vy * sinA + pos.x;
    const wy = vx * sinA + vy * cosA + pos.y;
    out[i] = { x: wx, y: wy };
  }
  return out;
}

// 프레임별 월드 verts / bounds 캐시 업데이트
function updateCaches() {
  worldVertsCache.length = shapes.length;
  boundsCache.length = shapes.length;

  for (let i = 0; i < shapes.length; i++) {
    const body = shapes[i];
    worldVertsCache[i] = computeWorldVertsForBody(body);
    boundsCache[i] = body.bounds;
  }
}

// 스무스하게 도형 채우기
function drawSmoothShapeFromWorldVerts(worldVerts, fillCol, g = null) {
  if (!worldVerts || worldVerts.length < 3) return;

  const target = g || this;

  if (g) {
    g.noStroke();
    g.fill(fillCol);
    g.beginShape();
    g.curveVertex(worldVerts[0].x, worldVerts[0].y);
    g.curveVertex(worldVerts[0].x, worldVerts[0].y);

    for (let i = 1; i < worldVerts.length; i++) {
      g.curveVertex(worldVerts[i].x, worldVerts[i].y);
    }

    const last = worldVerts[worldVerts.length - 1];
    g.curveVertex(last.x, last.y);
    g.curveVertex(last.x, last.y);
    g.endShape(CLOSE);
  } else {
    noStroke();
    fill(fillCol);
    beginShape();
    curveVertex(worldVerts[0].x, worldVerts[0].y);
    curveVertex(worldVerts[0].x, worldVerts[0].y);

    for (let i = 1; i < worldVerts.length; i++) {
      curveVertex(worldVerts[i].x, worldVerts[i].y);
    }

    const last = worldVerts[worldVerts.length - 1];
    curveVertex(last.x, last.y);
    curveVertex(last.x, last.y);
    endShape(CLOSE);
  }
}

// 충돌 여부 (SAT)
function bodiesAreColliding(bodyA, bodyB) {
  const partsA = bodyA._collisionParts;
  const partsB = bodyB._collisionParts;

  for (let partA of partsA) {
    for (let partB of partsB) {
      const c = Collision.collides(partA, partB);
      if (c && c.collided) return true;
    }
  }
  return false;
}

// 겹치는 영역 채우기 (고정된 쌍별 색 유지)
function drawOverlapsColoredPersistent() {
  const n = shapes.length;

  for (let i = 0; i < n; i++) {
    const bodyA = shapes[i];
    const vertsA = worldVertsCache[i];
    const boundsA = boundsCache[i];
    if (!vertsA) continue;

    for (let j = i + 1; j < n; j++) {
      const bodyB = shapes[j];
      const vertsB = worldVertsCache[j];
      const boundsB = boundsCache[j];
      if (!vertsB) continue;

      // 바운딩 박스 우선 체크 (빠른 탈락)
      if (!Bounds.overlaps(boundsA, boundsB)) continue;

      // 실제 충돌 체크
      if (!bodiesAreColliding(bodyA, bodyB)) continue;

      // 쌍별 색 결정
      const idA = bodyA.id;
      const idB = bodyB.id;
      const key = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;

      if (!overlapColorMap[key]) {
        overlapColorMap[key] = random(overlapColors);
      }
      const chosenColor = overlapColorMap[key];

      // tmpG 재사용
      tmpG.clear();

      // A 채우기 (흰색)
      drawSmoothShapeFromWorldVerts(vertsA, "#ffffff", tmpG);

      // B로 교집합 마스킹
      tmpG.drawingContext.globalCompositeOperation = "source-in";
      drawSmoothShapeFromWorldVerts(vertsB, chosenColor, tmpG);

      // 합성 모드 복구
      tmpG.drawingContext.globalCompositeOperation = "source-over";

      // 메인 캔버스에 찍기
      image(tmpG, 0, 0);
    }
  }
}

function draw() {
  // 물리
  Engine.update(engine, 1000 / 60);

  // 캐시 갱신
  updateCaches();

  // 배경
  background(255);

  // 스트립
  drawBackgroundStrips();

  // 기본 도형
  for (let i = 0; i < shapes.length; i++) {
    const verts = worldVertsCache[i];
    if (!verts) continue;
    const col = shapes[i].customColor || "#888";
    drawSmoothShapeFromWorldVerts(verts, col, null);
  }

  // 겹치는 부분
  drawOverlapsColoredPersistent();
}

// 스페이스바로 재배치
function keyPressed() {
  if (key === " ") {
    resetShapes();
  }
}

// 모든 도형 리셋
function resetShapes() {
  for (let s of shapes) {
    Composite.remove(engine.world, s);
  }
  shapes = [];

  for (let k in overlapColorMap) {
    delete overlapColorMap[k];
  }

  createSVGShapes();
}

// 리사이즈 대응
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  canvas.position(0, 0);
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.backgroundColor = "#ffffff";
  document.documentElement.style.margin = "0";
  document.documentElement.style.padding = "0";

  // tmpG 리빌드
  if (tmpG && tmpG.remove) {
    tmpG.remove();
  }
  tmpG = createGraphics(windowWidth, windowHeight);
  tmpG.pixelDensity(1);

  createWalls();
  makeBackgroundStrips();
  resetShapes();
}
