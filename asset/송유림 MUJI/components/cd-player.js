// Complete CD Player component with physics engine
// Includes Matter.js physics, anchor, handle, and visual rendering

window.CDPlayer = (function () {
  let engine, world, anchor, handle, spring, mConstraint;
  let isInitialized = false;
  let _visualR = null; // ringSize와 scale을 반영한 실제 렌더 반지름
  let _cx = null,
    _cy = null; // 도형 중심 좌표
  const LINE_GAP = 50; // 도형 경계에서 줄이 얼마나 내려갈지(px)
  let glassOverlayElement = null; // CSS 글래스모피즘 오버레이 요소

  // CSS CD 판 요소
  let cssDiscElement = null;

  // 투명도 조절 변수 (토글 방식: 0 or 1)
  let opacity = 1.0; // 기본값 1.0 (0 또는 1)
  let isDraggingOpacity = false; // 호환용 (항상 false)
  let opacityStickPosition = 1.0; // 논리 위치(0/1)
  let toggleRenderPos = 1.0; // 렌더링용 보간 위치(0~1)
  let enableOpacityControl = true; // 내부(p5) 토글 표시 여부

  // 스냅백(탄성 복귀) 상태
  let snapBackActive = false;
  let snapStart = { x: 0, y: 0 };
  let snapTarget = { x: 0, y: 0 };
  let snapTimer = 0;
  let snapDuration = 30; // 프레임 기준 (약 0.5초@60fps)

  // CDPlayer 전역에 추가 - 새로고침 시 한 번만 결정되는 통일된 형태
  let globalShapeType = Math.floor(Math.random() * 6) + 1;
  // 1=삼각형, 2=사각형, 3=오각형, 4=육각형, 5=별형, 6=원형
  console.log("[CDPlayer] shape =", globalShapeType);

  // 삼각형, 별만 확대 (원하는 값으로 조절)
  function getShapeScale(t) {
    // 도형들이 삼각형(1.5)과 비슷한 크기로 보이도록 정규화
    const base = {
      1: 1.5, // 삼각형 (기준)
      2: 1.5, // 사각형 - 삼각형과 동일
      3: 1.5, // 오각형 - 삼각형과 동일
      4: 1.5, // 육각형 - 삼각형과 동일
      5: 1.5, // 별 - 삼각형과 동일
      6: 1.5, // 원 - 삼각형과 동일
    };
    return base[t] || 1.5;
  }

  // === 유틸: 규칙다각형 / 별 경로 만들기 ===
  function buildRegularPolygonPath(ctx, sides, radius) {
    const angleStep = (Math.PI * 2) / sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + i * angleStep; // 위쪽부터 시작
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function buildStarPath(ctx, points, innerRadius, outerRadius) {
    const step = Math.PI / points;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const a = -Math.PI / 2 + i * step; // 위쪽부터 시작
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // 원형 경로 생성 함수
  function buildCirclePath(ctx, radius) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.closePath();
  }

  // 도형의 둘레를 따라 점들을 계산하는 함수들
  function getRegularPolygonPoints(sides, radius, startAngle = 0) {
    const points = [];
    const angleStep = (Math.PI * 2) / sides;
    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle: angle,
      });
    }
    return points;
  }

  function getStarPoints(points, innerRadius, outerRadius, startAngle = 0) {
    const starPoints = [];
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = startAngle + i * step;
      starPoints.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        angle: angle,
      });
    }
    return starPoints;
  }

  function getCirclePoints(radius, numPoints = 64, startAngle = 0) {
    const points = [];
    const angleStep = (Math.PI * 2) / numPoints;
    for (let i = 0; i < numPoints; i++) {
      const angle = startAngle + i * angleStep;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle: angle,
      });
    }
    return points;
  }

  // 도형별 줄(핸들) 추가 오프셋: 음수면 위로(짧아짐), 양수면 아래로(길어짐)
  function getShapeLineOffset(shapeType) {
    if (shapeType === 5) return -10;
    return 0;
  }

  // 별만 위쪽(도형 안쪽)으로 5px 더 연장해서 그리기 (시각 보정)
  function getLineVisualStartOffset(shapeType) {
    return shapeType === 5 ? -8 : 0; // 음수면 위로
  }

  // 줄 끝을 핸들 원의 바깥에서 멈추도록 그리기
  function drawTrimmedConnector(
    ax,
    ay,
    hx,
    hy,
    startOffsetY,
    handleVisualRadius,
    endClear = 1.5
  ) {
    const sx = ax;
    const sy = ay + startOffsetY; // 별 전용 시각 오프셋 반영(위로 음수)

    const dx = hx - sx;
    const dy = hy - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    // 핸들 원 바깥에서 끊기 (시각 반지름 + 여유 endClear)
    const ex = hx - ux * (handleVisualRadius + endClear);
    const ey = hy - uy * (handleVisualRadius + endClear);

    line(sx, sy, ex, ey);
  }

  // 도형의 하단 Y 위치를 자동 계산하는 함수
  function getAutoBottomY(shapeType, radius) {
    let points = [];

    switch (shapeType) {
      case 1: // 삼각형
        points = getRegularPolygonPoints(3, radius, -Math.PI / 2);
        break;
      case 2: // 사각형
        points = getRegularPolygonPoints(4, radius, -Math.PI / 2);
        break;
      case 3: // 오각형
        points = getRegularPolygonPoints(5, radius, -Math.PI / 2);
        break;
      case 4: // 육각형
        points = getRegularPolygonPoints(6, radius, -Math.PI / 2);
        break;
      case 5: // 별
        points = getStarPoints(5, radius * 0.65, radius, -Math.PI / 2);
        break;
      case 6: // 원
        points = getCirclePoints(radius, 64, -Math.PI / 2);
        break;
      default:
        points = getCirclePoints(radius, 64, -Math.PI / 2);
        break;
    }

    // y 값 중 최대값 (가장 아래 꼭짓점)
    let maxY = -Infinity;
    for (let v of points) {
      if (v.y > maxY) maxY = v.y;
    }

    return maxY;
  }

  // 각 도형의 가장자리 위치를 계산하는 함수 (손잡이 배치용)
  function getShapeEdgePosition(shapeType, radius) {
    // 모두 도형의 가장 아래쪽 가장자리로 맞춤
    const yOffset = radius + 1; // 가장자리에 딱 붙도록
    switch (shapeType) {
      case 1: // 삼각형 - 아래쪽 중앙
        return {
          x: 0,
          y: radius * 0.866 + yOffset, // 수정된 아래쪽 위치
          angle: Math.PI / 2,
        };
      case 2: // 사각형 - 아래쪽 중앙
        return {
          x: 0,
          y: radius + yOffset,
          angle: Math.PI / 2,
        };
      case 3: // 오각형 - 아래쪽 중앙
        return {
          x: 0,
          y: radius * 0.951 + yOffset,
          angle: Math.PI / 2,
        };
      case 4: // 육각형 - 아래쪽 중앙
        return {
          x: 0,
          y: (radius * Math.sqrt(3)) / 2 + yOffset,
          angle: Math.PI / 2,
        };
      case 5: // 별 - 아래쪽 끝
        return {
          x: 0,
          y: radius + yOffset,
          angle: Math.PI / 2,
        };
      case 6: // 원 - 아래쪽 중앙
        return {
          x: 0,
          y: radius + yOffset,
          angle: Math.PI / 2,
        };
      default:
        return {
          x: 0,
          y: radius + yOffset,
          angle: Math.PI / 2,
        };
    }
  }

  // 도형의 둘레를 따라 아크 위치를 계산하는 함수
  function getShapeArcPosition(shapeType, radius, arcProgress) {
    // arcProgress는 0~1 사이의 값 (0 = 시작점, 1 = 끝점)
    let points = [];

    switch (shapeType) {
      case 1: // 삼각형
        points = getRegularPolygonPoints(3, radius, -Math.PI / 2);
        break;
      case 2: // 사각형
        points = getRegularPolygonPoints(4, radius, -Math.PI / 2);
        break;
      case 3: // 오각형
        points = getRegularPolygonPoints(5, radius, -Math.PI / 2);
        break;
      case 4: // 육각형
        points = getRegularPolygonPoints(6, radius, -Math.PI / 2);
        break;
      case 5: // 별 (짧뚱한 별)
        points = getStarPoints(5, radius * 0.65, radius, -Math.PI / 2);
        break;
      case 6: // 원
        points = getCirclePoints(radius, 64, -Math.PI / 2);
        break;
      default:
        // 기본값으로 원 사용
        points = getCirclePoints(radius, 64, -Math.PI / 2);
        break;
    }

    // 안전성 검사
    if (!points || points.length === 0) {
      console.warn("getShapeArcPosition: points array is empty");
      return { x: 0, y: 0, angle: 0 };
    }

    // arcProgress를 0~1 범위로 클램핑
    arcProgress = Math.max(0, Math.min(1, arcProgress));

    // arcProgress에 따라 점들 사이를 보간
    const totalPoints = points.length;
    const exactIndex = arcProgress * (totalPoints - 1);
    const index1 = Math.floor(exactIndex);
    const index2 = Math.min(index1 + 1, totalPoints - 1);
    const t = exactIndex - index1;

    const p1 = points[index1];
    const p2 = points[index2];

    // 안전성 검사
    if (!p1 || !p2) {
      console.warn(
        "getShapeArcPosition: invalid points at indices",
        index1,
        index2
      );
      return { x: 0, y: 0, angle: 0 };
    }

    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
      angle: p1.angle + (p2.angle - p1.angle) * t,
    };
  }

  // === Arc-length(픽셀 길이) 기반 폴리라인 유틸 ===
  function buildShapePolyline(shapeType, radius) {
    // 닫힌 폴리라인(마지막 점을 첫 점으로 다시 이어줌)
    let pts = [];
    switch (shapeType) {
      case 1:
        pts = getRegularPolygonPoints(3, radius, -Math.PI / 2);
        break;
      case 2:
        pts = getRegularPolygonPoints(4, radius, -Math.PI / 2);
        break;
      case 3:
        pts = getRegularPolygonPoints(5, radius, -Math.PI / 2);
        break;
      case 4:
        pts = getRegularPolygonPoints(6, radius, -Math.PI / 2);
        break;
      case 5:
        pts = getStarPoints(5, radius * 0.65, radius, -Math.PI / 2);
        break;
      case 6:
      default:
        pts = getCirclePoints(radius, 128, -Math.PI / 2);
        break;
    }
    // 닫기
    if (
      pts.length &&
      (pts[0].x !== pts[pts.length - 1].x || pts[0].y !== pts[pts.length - 1].y)
    ) {
      pts = pts.concat([{ x: pts[0].x, y: pts[0].y }]);
    }
    return pts;
  }

  function polylineCumulativeLengths(pts) {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      acc.push(acc[i - 1] + Math.hypot(dx, dy));
    }
    return acc; // acc[acc.length-1] = 총 길이
  }

  function samplePointAtS(pts, cum, s) {
    const L = cum[cum.length - 1];
    // s를 0~L 범위로 감싸기
    s = ((s % L) + L) % L;
    // 이분 탐색 대신 선형으로도 충분(pts ~100~200)
    let i = 1;
    while (i < cum.length && cum[i] < s) i++;
    const i1 = Math.max(1, i);
    const i0 = i1 - 1;
    const segLen = cum[i1] - cum[i0] || 1;
    const t = (s - cum[i0]) / segLen;
    const a = pts[i0],
      b = pts[i1];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  // sStart~sEnd 구간을 직선으로 이어 그리기
  function strokeArcByS(ctx, pts, cum, sStart, sEnd, stepPx, lineWidth, rgba) {
    const L = cum[cum.length - 1];
    const len = (((sEnd - sStart) % L) + L) % L; // 양수 길이
    const steps = Math.max(8, Math.floor(len / Math.max(1, stepPx)));

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = rgba;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const s = sStart + (len * i) / steps;
      const p = samplePointAtS(pts, cum, s);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCenterSymbol(cx, cy, d) {
    const diameter = (d || 53) * 0.8; // 0.8배 축소
    const outerStroke = (13.5 / 53) * diameter;
    const core = (17 / 53) * diameter;
    const mid = (31 / 53) * diameter;
    const dot = (3 / 53) * diameter;

    push();
    translate(cx, cy);

    // 그림자 효과 없음
    const ctx = drawingContext;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 글래스모피즘 효과를 위한 배경 (다각형으로 통일) - 강화된 효과
    noStroke();

    // 외부 링 (더 부드러운 글래스 효과)
    noFill();
    stroke(255, 200 * opacity);
    strokeWeight(max(1, outerStroke * 0.8));
    ellipse(0, 0, diameter - outerStroke);

    // 중간 링 (은은한 하이라이트)
    noFill();
    stroke(255, 180 * opacity);
    strokeWeight(max(1, diameter * 0.015));
    ellipse(0, 0, mid);

    // 중앙 점도 채우지 않고 얇은 링으로
    noFill();
    stroke(255, 220 * opacity);
    strokeWeight(1.2);
    ellipse(0, 0, dot * 2.2);

    pop();
  }

  function drawRing(
    cx,
    cy,
    diameter,
    angleDeg,
    arcStartDeg,
    arcEndDeg,
    bgBlur
  ) {
    push();
    translate(cx, cy);
    const ctx = drawingContext;
    const baseR = diameter / 2;
    const scale = getShapeScale(globalShapeType);
    const r = baseR * scale;

    // 투명도 적용
    ctx.globalAlpha = opacity;

    // === 1) 유리 내부: 도형으로 clip → 블러 배경을 '원본 좌표'에 정렬해 그리기
    ctx.save();
    ctx.beginPath();
    switch (globalShapeType) {
      case 1:
        buildRegularPolygonPath(ctx, 3, r);
        break;
      case 2:
        buildRegularPolygonPath(ctx, 4, r);
        break;
      case 3:
        buildRegularPolygonPath(ctx, 5, r);
        break;
      case 4:
        buildRegularPolygonPath(ctx, 6, r);
        break;
      case 5:
        buildStarPath(ctx, 5, r * 0.65, r);
        break;
      case 6:
        buildCirclePath(ctx, r);
        break;
    }
    ctx.clip();

    // 좌표 보정: 지금 (0,0)이 (cx,cy)이므로, 화면 전체를 그리려면 -cx,-cy로 이동
    if (bgBlur) {
      ctx.save();
      ctx.translate(-cx, -cy); // 월드좌표 정렬
      // p5.Graphics면 .canvas 속성에 실제 <canvas>가 있어요.
      const src = bgBlur.canvas || bgBlur; // HTMLCanvas로 통일
      // ✅ 흐림 효과 추가 (확대된 효과에 blur 적용)
      ctx.filter = "blur(8px)";
      ctx.drawImage(src, 0, 0); // 전체 배경을 그대로 투사
      ctx.filter = "none"; // 필터 리셋
      ctx.restore();
    } else {
      // 블러 버퍼 없을 때의 fallback: 아주 옅은 반투명 채움
      ctx.fillStyle = `rgba(255,255,255,${0.1 * opacity})`;
      ctx.fill();
    }

    // 글래스모피즘: 반투명 배경 레이어 추가 (배경을 더 잘 안 보이게)
    const glassBackground = ctx.createRadialGradient(
      -r * 0.3,
      -r * 0.3,
      0,
      0,
      0,
      r * 1.5
    );
    glassBackground.addColorStop(0, `rgba(255,255,255,${0.25 * opacity})`);
    glassBackground.addColorStop(0.5, `rgba(255,255,255,${0.18 * opacity})`);
    glassBackground.addColorStop(1, `rgba(255,255,255,${0.15 * opacity})`);
    ctx.fillStyle = glassBackground;
    ctx.fill(); // 배경 블러 위에 반투명 레이어 추가

    // 유리 틴트(살짝 뿌옇게) 오버레이
    const glassTint = ctx.createLinearGradient(-r, -r, r, r);
    glassTint.addColorStop(0, `rgba(255,255,255,${0.2 * opacity})`);
    glassTint.addColorStop(0.5, `rgba(255,255,255,${0.08 * opacity})`);
    glassTint.addColorStop(1, `rgba(255,255,255,${0.15 * opacity})`);
    ctx.fillStyle = glassTint;
    ctx.fill(); // clip 유지중이라 도형 안에만 칠해짐

    // 안쪽 반사선(리플렉션) - 도형에 맞게 그리기
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const reflectionGrad = ctx.createLinearGradient(-r * 0.6, -r, r * 0.6, r);
    reflectionGrad.addColorStop(0, `rgba(255,255,255,${0.08 * opacity})`);
    reflectionGrad.addColorStop(0.5, `rgba(255,255,255,${0.32 * opacity})`);
    reflectionGrad.addColorStop(1, `rgba(255,255,255,${0.08 * opacity})`);
    ctx.strokeStyle = reflectionGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // 도형에 맞게 반사선 그리기 (작은 크기로)
    switch (globalShapeType) {
      case 1:
        buildRegularPolygonPath(ctx, 3, r * 0.7);
        break;
      case 2:
        buildRegularPolygonPath(ctx, 4, r * 0.7);
        break;
      case 3:
        buildRegularPolygonPath(ctx, 5, r * 0.7);
        break;
      case 4:
        buildRegularPolygonPath(ctx, 6, r * 0.7);
        break;
      case 5:
        buildStarPath(ctx, 5, r * 0.7 * 0.65, r * 0.7);
        break;
      case 6:
        buildCirclePath(ctx, r * 0.7);
        break;
    }
    ctx.stroke();

    ctx.restore(); // <-- clip 해제

    // === 2) 외곽선 하이라이트 + 글로우 효과 (글래스모피즘)
    // 명시적으로 새로운 경로 시작 (clip 잔여 경로 제거)
    ctx.beginPath();
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const edgeGrad = ctx.createLinearGradient(0, -r, 0, r);
    edgeGrad.addColorStop(0, `rgba(255,255,255,${0.9 * opacity})`);
    edgeGrad.addColorStop(0.5, `rgba(255,255,255,${0.5 * opacity})`);
    edgeGrad.addColorStop(1, `rgba(255,255,255,${0.35 * opacity})`);
    ctx.strokeStyle = edgeGrad;

    // 글로우 효과 없음
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = 3;

    switch (globalShapeType) {
      case 1:
        buildRegularPolygonPath(ctx, 3, r);
        break;
      case 2:
        buildRegularPolygonPath(ctx, 4, r);
        break;
      case 3:
        buildRegularPolygonPath(ctx, 5, r);
        break;
      case 4:
        buildRegularPolygonPath(ctx, 6, r);
        break;
      case 5:
        buildStarPath(ctx, 5, r * 0.65, r);
        break;
      case 6:
        buildCirclePath(ctx, r);
        break;
    }
    ctx.stroke();
    ctx.restore();

    // === 회전하는 "에너지 아크" (호길이 고정 버전) ===
    {
      const ctx2 = drawingContext;
      ctx2.save();
      ctx2.lineCap = "round";
      ctx2.lineJoin = "round";

      // 도형 내부 살짝 안쪽 반경
      const arcRadius = Math.max(1, r - 6);

      // 1) 도형을 폴리라인으로 만들고 누적 길이 테이블 생성
      const polyPts = buildShapePolyline(globalShapeType, arcRadius);
      const cum = polylineCumulativeLengths(polyPts);
      const perimeter = cum[cum.length - 1] || 1;

      // 2) 회전 각도를 픽셀 위치로 변환 (둘레 위에서 이동)
      const rot = ((angleDeg || 0) % 360) / 360; // 0~1
      const sCenter = rot * perimeter;

      // 3) 아크 길이를 "픽셀"로 고정
      const ARC_LEN_PX = Math.max(50, r * 0.35); // 원하는 고정 길이
      const sStart = sCenter - ARC_LEN_PX * 0.5;
      const sEnd = sCenter + ARC_LEN_PX * 0.5;

      // 4) 레이어는 그대로 두되, 각 레이어를 arc-length로 그리기
      const strokeLayers = [
        {
          width: 12,
          alpha: 40,
          color: [255, 255, 255],
          shadow: false,
          shadowColor: "transparent",
          shadowBlur: 0,
        },
        { width: 8, alpha: 150, color: [255, 255, 255], shadow: false },
        { width: 4, alpha: 240, color: [255, 255, 255], shadow: false },
      ];

      for (let layer of strokeLayers) {
        if (layer.shadow) {
          ctx2.shadowColor = layer.shadowColor || "rgba(0,0,0,0.1)";
          ctx2.shadowBlur = layer.shadowBlur || 18;
          ctx2.shadowOffsetX = 0;
          ctx2.shadowOffsetY = 1;
        } else {
          ctx2.shadowColor = "transparent";
          ctx2.shadowBlur = 0;
          ctx2.shadowOffsetX = 0;
          ctx2.shadowOffsetY = 0;
        }

        // 투명도 적용: layer.alpha에 opacity를 곱하기
        const rgba = `rgba(${layer.color[0]}, ${layer.color[1]}, ${
          layer.color[2]
        }, ${(layer.alpha / 255) * opacity})`;
        // segment 샘플 간격(px). 값이 작을수록 더 촘촘 (부하↑)
        const STEP_PX = 4;
        strokeArcByS(
          ctx2,
          polyPts,
          cum,
          sStart,
          sEnd,
          STEP_PX,
          layer.width,
          rgba
        );
      }

      ctx2.restore();
    }

    // 투명도 원복
    ctx.globalAlpha = 1.0;
    pop();
  }

  // 투명도 토글 컨트롤 (글래스모피즘 유지, ON/OFF)
  function drawOpacityControl() {
    const barWidth = 56;
    const barHeight = 22;
    const margin = 16; // 네비게이션 바와 동일 여백
    const barX = margin + barWidth / 2; // 왼쪽 아래 배치
    const barY = height - margin - barHeight / 2;

    // 논리 위치 동기화 (0 또는 1)
    opacityStickPosition = opacity > 0.5 ? 1.0 : 0.0;
    // 시각 위치를 부드럽게 보간
    toggleRenderPos = lerp(toggleRenderPos, opacityStickPosition, 0.2);

    push();
    translate(barX, barY);
    const ctx = drawingContext;

    // 토글 배경 (글래스모피즘)
    ctx.save();
    roundedRect(
      ctx,
      -barWidth / 2,
      -barHeight / 2,
      barWidth,
      barHeight,
      barHeight / 2
    );
    ctx.clip();

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fill();

    const grad = ctx.createLinearGradient(0, 0, 0, barHeight);
    grad.addColorStop(0, "rgba(255,255,255,0.25)");
    grad.addColorStop(1, "rgba(255,255,255,0.05)");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();

    // 테두리
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    roundedRect(
      ctx,
      -barWidth / 2,
      -barHeight / 2,
      barWidth,
      barHeight,
      barHeight / 2
    );
    ctx.stroke();

    // 스틱 (원형)
    const stickSize = 18;
    const stickX = map(
      toggleRenderPos,
      0,
      1,
      -barWidth / 2 + stickSize / 2,
      barWidth / 2 - stickSize / 2
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(stickX, 0, stickSize / 2, 0, Math.PI * 2);
    ctx.clip();

    const stickGrad = ctx.createRadialGradient(
      stickX - stickSize / 4,
      -stickSize / 4,
      0,
      stickX,
      0,
      stickSize / 2
    );
    stickGrad.addColorStop(0, "rgba(255,255,255,0.8)");
    stickGrad.addColorStop(0.5, "rgba(255,255,255,0.4)");
    stickGrad.addColorStop(1, "rgba(255,255,255,0.2)");
    ctx.fillStyle = stickGrad;
    ctx.fill();

    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(stickX, 0, stickSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    pop();
  }

  // 투명도 토글 상호작용: 바 영역을 탭/클릭하면 0↔1 전환
  function handleOpacityInteraction(x, y, isPressed) {
    const barWidth = 56;
    const barHeight = 22;
    const margin = 16;
    const barX = margin + barWidth / 2;
    const barY = height - margin - barHeight / 2;

    const barLeft = barX - barWidth / 2;
    const barRight = barX + barWidth / 2;
    const barTop = barY - barHeight / 2;
    const barBottom = barY + barHeight / 2;

    if (isPressed) {
      if (x >= barLeft && x <= barRight && y >= barTop && y <= barBottom) {
        // 토글
        opacity = opacity > 0.5 ? 0.0 : 1.0;
        opacityStickPosition = opacity;
        isDraggingOpacity = false;
      }
    }
  }

  function stopOpacityDrag() {
    isDraggingOpacity = false;
  }

  // 투명도 드래그 상태 getter
  function isOpacityDragging() {
    return false; // 토글은 드래그가 아님
  }

  function initializePhysics() {
    if (isInitialized) return;
    if (typeof Matter === "undefined") {
      console.warn("Matter.js not loaded yet");
      return;
    }

    const { Engine, World, Bodies, Constraint, Mouse, MouseConstraint } =
      Matter;

    engine = Engine.create();
    world = engine.world;

    // ① 도형 하단 y (로컬좌표) → 월드좌표
    const shapeRadius =
      _visualR != null ? _visualR : (96 / 2) * getShapeScale(globalShapeType);
    const bottomYLocal = getAutoBottomY(globalShapeType, shapeRadius);
    const anchorX = _cx != null ? _cx : width / 2; // 도형 중심의 x
    const anchorY = (_cy != null ? _cy : height / 2) + bottomYLocal; // 도형 하단 경계(y)
    anchor = { x: anchorX, y: anchorY }; // ✅ 앵커를 경계로!

    // ② 손잡이는 경계에서 LINE_GAP만큼 아래 + 도형별 미세 오프셋
    const handleX = anchorX;
    const handleY = anchorY + LINE_GAP + getShapeLineOffset(globalShapeType);

    handle = Bodies.circle(handleX, handleY, 26, {
      restitution: 0.5,
      friction: 0.1,
      density: 0.001,
      collisionFilter: { category: 0x0002, mask: 0xffff }, // 손잡이 카테고리 설정
    });

    // ③ 스프링 길이는 앵커~손잡이 실제 거리(= 거의 LINE_GAP)
    const distance = Math.hypot(anchor.x - handleX, anchor.y - handleY);
    spring = Constraint.create({
      pointA: { x: anchor.x, y: anchor.y },
      bodyB: handle,
      length: distance,
      stiffness: 0.01,
      damping: 0.1,
    });

    World.add(world, [handle, spring]);

    // Add pointer event support (unified mouse/touch) - iOS Safari 최적화
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      console.warn("Canvas not found for CDPlayer physics");
      return;
    }

    // Mouse constraint for both desktop and mobile - bind to canvas, not body
    const mouse = Mouse.create(canvas);
    if (typeof window.pixelDensity === "function") {
      // align with p5 pixel ratio
      mouse.pixelRatio = pixelDensity();
    }

    // iOS Safari에서 더 안정적인 설정
    mConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.15, // 약간 더 부드럽게
        damping: 0.1, // 감쇠 추가
        render: { visible: false },
      },
    });

    // 손잡이만 픽킹하도록 충돌 필터 설정
    mConstraint.constraint.collisionFilter = { mask: 0x0002 }; // 손잡이 카테고리만 픽킹

    World.add(world, mConstraint);

    // iOS Safari에서 터치 액션 비활성화
    canvas.style.touchAction = "none";

    // 포인터 이벤트는 외부 sketch에서 관리 (좌표 변환 후 포인터 포워딩)

    isInitialized = true;
  }

  function updatePhysics() {
    if (!isInitialized) return;
    if (typeof Matter === "undefined") {
      console.warn("Matter.js not loaded yet");
      return;
    }
    const { Engine } = Matter;
    Engine.update(engine);

    // 핸들 탄성 복귀 처리 (외부에서 트리거)
    if (snapBackActive && handle && anchor) {
      snapTimer++;
      const t = Math.min(1, snapTimer / snapDuration);
      // 약한 탄성 보간 (오버슈트)
      const ease = (p) => {
        // easeOutBack (overshoot ~1.70158)
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
      };
      const tt = ease(t);
      const nx = snapStart.x + (snapTarget.x - snapStart.x) * tt;
      const ny = snapStart.y + (snapTarget.y - snapStart.y) * tt;
      Matter.Body.setPosition(handle, { x: nx, y: ny });
      // 점점 감쇠되도록 속도 제거
      Matter.Body.setVelocity(handle, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(handle, 0);
      if (t >= 1) {
        snapBackActive = false;
      }
    }
  }

  function handleInteraction(x, y, isPressed) {
    if (!isInitialized || !handle || !anchor || !mConstraint) return 0;

    const handlePos = handle.position;
    const distance = Math.sqrt(
      Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2)
    );

    // === ✅ 손잡이 근처에서만 반응 (iOS Safari에서 더 관대한 범위) ===
    const handleRadius = 80; // 반응 범위를 더 넓게 (px)
    if (distance <= handleRadius) {
      if (isPressed) {
        console.log("🎯 Handle drag started at:", x, y);
        // iOS Safari에서 더 안정적인 마우스 위치 설정
        mConstraint.mouse.position.x = handlePos.x;
        mConstraint.mouse.position.y = handlePos.y;
        mConstraint.mouse.button = 0; // 안전
        mConstraint.mouse.pressed = true;

        // iOS Safari에서 추가 안정성을 위한 지연
        setTimeout(() => {
          if (mConstraint && mConstraint.mouse) {
            mConstraint.mouse.position.x = handlePos.x;
            mConstraint.mouse.position.y = handlePos.y;
          }
        }, 10);
      } else {
        console.log("🎯 Handle drag ended - 강제 해제");
        // 강제로 드래그 상태 해제
        mConstraint.mouse.pressed = false;
        mConstraint.mouse.button = -1; // 버튼 상태도 초기화

        // 풀 거리 계산 (스프링 자연 길이 100px 빼기)
        const totalDistance = Math.sqrt(
          Math.pow(anchor.x - handlePos.x, 2) +
            Math.pow(anchor.y - handlePos.y, 2)
        );
        const pull = Math.max(0, totalDistance - 100); // 스프링 자연 길이 빼기
        console.log("Total distance:", totalDistance, "Pull distance:", pull);

        // 콜백 호출 (풀 거리가 충분할 때만)
        if (pull > 5 && typeof window.currentOnPullEnd === "function") {
          window.currentOnPullEnd(pull);
        }

        return pull; // 풀 거리 반환
      }
    } else {
      // 🔒 손잡이 영역 밖에서는 무시하고 강제 해제
      if (mConstraint.mouse.pressed) {
        console.log("🧊 강제 드래그 해제 - 영역 밖");
        mConstraint.mouse.pressed = false;
        mConstraint.mouse.button = -1;
      }
      console.log("🧊 Ignored interaction outside handle:", distance);
    }

    return 0;
  }

  function drawDevice(opts) {
    const o = opts || {};
    // currentOptions = o; // 현재 옵션 저장 - 미사용

    const cx = o.cx != null ? o.cx : width / 2;
    const cy = o.cy != null ? o.cy : height / 2;
    const ringSize = o.ringSize != null ? o.ringSize : 96; // 기본값을 page 1과 동일하게 96으로 통일
    const angleDeg = o.angleDeg || 0;

    // NEW: 배경 버퍼(선명/블러) 받기
    const bg = o.bg; // p5.Graphics 또는 HTMLCanvas (선택)
    const bgBlur = o.bgBlur; // p5.Graphics 또는 HTMLCanvas (선택: 있으면 글래스 진짜 적용)
    const bgBuffer = o.bgBuffer || bg; // 하위 호환성
    const onPullEnd = o.onPullEnd; // 콜백 함수 저장

    // 공유값 갱신
    _cx = cx;
    _cy = cy;
    const scale = getShapeScale(globalShapeType);
    _visualR = (ringSize / 2) * scale;

    // 콜백을 전역 변수로 설정 (handleInteraction에서 사용)
    window.currentOnPullEnd = onPullEnd;

    // Initialize physics if not done
    initializePhysics();

    // 배경 패널 제거 - CD 판 자체에 글래스모피즘 적용

    // Draw shape guide for handle connection (matches current shape type)
    if (anchor && handle) {
      const ctx = drawingContext;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(255,255,255,${0.4 * opacity})`;
      ctx.lineWidth = 2;

      const guideR = ((ringSize * 0.8) / 2) * getShapeScale(globalShapeType);

      switch (globalShapeType) {
        case 1:
          buildRegularPolygonPath(ctx, 3, guideR);
          break;
        case 2:
          buildRegularPolygonPath(ctx, 4, guideR);
          break;
        case 3:
          buildRegularPolygonPath(ctx, 5, guideR);
          break;
        case 4:
          buildRegularPolygonPath(ctx, 6, guideR);
          break;
        case 5:
          buildStarPath(ctx, 5, guideR * 0.65, guideR);
          break;
        case 6:
          buildCirclePath(ctx, guideR);
          break;
      }
      ctx.stroke();
      ctx.restore();
    }

    drawRing(cx, cy, ringSize, angleDeg, o.arcStartDeg, o.arcEndDeg, bgBlur);
    drawCenterSymbol(cx, cy, (o.symbolSize || 53) * 0.8); // 0.8배 축소

    // 투명도 조절 UI 그리기
    if (enableOpacityControl) {
      drawOpacityControl();
    }

    // Draw anchor and handle
    if (anchor && handle) {
      const ctx = drawingContext;

      // === 연결선 그림자 없음 ===
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 연결선 (별만 시작점을 5px 위로 올려서 시각적으로 짧아 보이지 않게)
      const startOffsetY = getLineVisualStartOffset(globalShapeType);
      const handleVisualDiameter = o.handleSize || 20; // 화면에 그리는 핸들의 지름
      const handleVisualRadius = handleVisualDiameter / 2;

      stroke(255, 180 * opacity);
      strokeWeight(3);
      drawTrimmedConnector(
        anchor.x,
        anchor.y,
        handle.position.x,
        handle.position.y,
        startOffsetY,
        handleVisualRadius,
        1.5 // 줄 끝 여유(px), 필요하면 0~3 사이로 조절
      );

      // === 손잡이 그림자 없음 ===
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 손잡이: 테두리만
      noFill();
      stroke(255, 200 * opacity);
      strokeWeight(3);
      ellipse(handle.position.x, handle.position.y, o.handleSize || 20);

      stroke(255, 255 * opacity);
      strokeWeight(1);
      ellipse(handle.position.x, handle.position.y, (o.handleSize || 20) * 0.7);
    }
  }

  // 외부 포인터 포워딩 API (sketch에서 직접 호출용)
  function handlePointerDown(x, y) {
    if (!isInitialized || !mConstraint) return;
    // 손잡이 근처 체크는 handleInteraction에서 함
    handleInteraction(x, y, true);
  }

  function handlePointerMove(x, y) {
    if (!isInitialized || !mConstraint) return;
    mConstraint.mouse.position.x = x;
    mConstraint.mouse.position.y = y;
  }

  function handlePointerUp(x, y) {
    if (!isInitialized || !mConstraint) return;
    // pressed 해제 및 pull 계산은 handleInteraction에서 처리
    handleInteraction(x, y, false);
  }

  // 핸들 위치 리셋 함수
  function resetHandle(canvasWidth, canvasHeight) {
    if (!isInitialized || !handle) return;
    const cw = canvasWidth || width;
    const ch = canvasHeight || height;

    const shapeRadius =
      _visualR != null ? _visualR : (96 / 2) * getShapeScale(globalShapeType);
    const bottomYLocal = getAutoBottomY(globalShapeType, shapeRadius);

    anchor.x = cw / 2;
    anchor.y = ch / 2 + bottomYLocal;

    const handleX = cw / 2;
    const handleY = anchor.y + LINE_GAP + getShapeLineOffset(globalShapeType);

    Matter.Body.setPosition(handle, { x: handleX, y: handleY });
    Matter.Body.setVelocity(handle, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(handle, 0);
    if (spring)
      spring.length = Math.hypot(anchor.x - handleX, anchor.y - handleY);
    if (mConstraint) mConstraint.length = 0;
  }

  // 스냅백(탄성 복귀) 시작: 현재 위치 → 기본 위치로 부드럽게 이동
  function startSnapBack() {
    if (!isInitialized || !handle) return;
    // 기본 목표 위치 계산 (resetHandle과 동일 로직, 적용은 하지 않음)
    const cw = width;
    const ch = height;
    const shapeRadius =
      _visualR != null ? _visualR : (96 / 2) * getShapeScale(globalShapeType);
    const bottomYLocal = getAutoBottomY(globalShapeType, shapeRadius);
    const targetAnchorX = cw / 2;
    const targetAnchorY = ch / 2 + bottomYLocal;
    const targetHandleX = cw / 2;
    const targetHandleY =
      targetAnchorY + LINE_GAP + getShapeLineOffset(globalShapeType);

    snapStart = { x: handle.position.x, y: handle.position.y };
    snapTarget = { x: targetHandleX, y: targetHandleY };
    snapTimer = 0;
    snapDuration = 36; // 조금 더 자연스럽게
    snapBackActive = true;
  }

  return {
    // drawGlassPanel, // 미사용 함수 주석처리
    drawCenterSymbol,
    drawRing,
    drawDevice,
    drawOpacityControl,
    handleOpacityInteraction,
    stopOpacityDrag,
    isOpacityDragging,
    updatePhysics,
    initializePhysics,
    getAnchor: () => anchor,
    getHandle: () => handle,
    getEngine: () => engine,
    getWorld: () => world,
    getMouseConstraint: () => mConstraint,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetHandle,
    startSnapBack,
    // 외부 제어용 API
    setOpacity: (v) => {
      opacity = v > 0.5 ? 1.0 : 0.0;
      opacityStickPosition = opacity;
    },
    getOpacity: () => opacity,
    setOpacityControlEnabled: (flag) => {
      enableOpacityControl = !!flag;
    },
  };
})();
