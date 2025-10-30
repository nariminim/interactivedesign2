function Section2_WeftRipple() {
  const N = 16;
  const ORANGE = "#d9653a";
  const BLACK = "#000000";

  let box = null; // {x,y,s}
  let gridX = [],
    gridY = []; // 정수 스냅된 셀 경계 (길이 N+1)
  const angles = new Float32Array(N * N);
  const targets = new Float32Array(N * N);
  let dragVisited = new Set();

  function setup(app) {
    computeBox(app);
    angles.fill(0);
    targets.fill(0);
  }
  function onResize(app) {
    computeBox(app);
  }

  function draw(app, sk) {
    if (!box) computeBox(app);

    sk.push();
    sk.translate(box.x, box.y);

    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const i = gy * N + gx;
        angles[i] += (targets[i] - angles[i]) * 0.18;

        //  색상 규칙
        // 16×16 그리드 중 8×8 단위로 대각 반전
        let arrowColor, boxColor;
        if ((gx < 8 && gy < 8) || (gx >= 8 && gy >= 8)) {
          // 왼쪽 위 + 오른쪽 아래
          arrowColor = ORANGE;
          boxColor = BLACK;
        } else {
          // 오른쪽 위 + 왼쪽 아래
          arrowColor = BLACK;
          boxColor = ORANGE;
        }

        const x0 = gridX[gx],
          x1 = gridX[gx + 1];
        const y0 = gridY[gy],
          y1 = gridY[gy + 1];
        const w = x1 - x0,
          h = y1 - y0;

        sk.push();
        sk.translate(x0 + w * 0.5, y0 + h * 0.5);
        sk.rotate(angles[i]);
        drawChevronTile(sk, -w / 2, -h / 2, w, h, arrowColor, boxColor);
        sk.pop();
      }
    }

    sk.pop();
  }

  function onPointer(app, type, pt) {
    if (!box) return;
    if (type === "down") {
      dragVisited.clear();
      rotateAt(pt.x, pt.y);
      app.sound.tension(140, 0.6);
    } else if (type === "move") {
      rotateAt(pt.x, pt.y);
    } else if (type === "up") {
      dragVisited.clear();
    }
  }

  function onLongPress(app) {
    for (let i = 0; i < targets.length; i++) targets[i] = 0;
    app.sound.snap();
  }

  function computeBox(app) {
    const sk = app.p;

    // 정사각형 + 정수 스냅
    const s = Math.floor(Math.min(sk.width, sk.height));
    const x = Math.floor((sk.width - s) / 2);
    const y = Math.floor((sk.height - s) / 2);
    box = { x, y, s };

    // 정수 경계 배열(합계가 정확히 s가 되도록)
    gridX = new Array(N + 1);
    gridY = new Array(N + 1);
    for (let i = 0; i <= N; i++) {
      gridX[i] = Math.floor((s * i) / N);
      gridY[i] = Math.floor((s * i) / N);
    }
  }

  function rotateAt(px, py) {
    const idx = hitIndex(px, py);
    if (idx < 0 || dragVisited.has(idx)) return;
    dragVisited.add(idx);
    targets[idx] += Math.PI / 2;
  }

  function hitIndex(px, py) {
    const { x, y, s } = box;
    if (px < x || px >= x + s || py < y || py >= y + s) return -1;
    // 정수 스냅된 경계에서 이진탐색 대신 선형 계산
    const gx = Math.min(N - 1, Math.floor(((px - x) / s) * N));
    const gy = Math.min(N - 1, Math.floor(((py - y) / s) * N));
    return gy * N + gx;
  }

  // 셀을 꽉 채우는 화살표
  // 셀(정사각형) 안을 '꽉' 채우는 도형을 1회의 폴리곤으로 그리기
  // x,y: 셀 좌상단, w,h: 셀 크기, arrowColor: 화살표색, boxColor: 바탕색
  function drawChevronTile(sk, x, y, w, h, arrowColor, boxColor) {
    sk.push();
    sk.translate(x, y);
    sk.noStroke();

    // 바탕(박스). 셀 경계 헤어라인 방지를 위해 1px 블리드.
    sk.fill(boxColor);
    sk.rect(-1, -1, w + 2, h + 2);

    // 도는 본체. (화샇표)
    sk.fill(arrowColor);
    const tipX = w; // 너비
    const midY = h * 0.5; // 높이
    const cinch = 1.0; // 내부 겹침(안티앨리어싱 가로선 제거용). [⁴]
    sk.beginShape();
    sk.vertex(0, midY - cinch); // 왼쪽 중심 근처(살짝 위)
    sk.vertex(tipX / 2, 0); // 우상단 모서리
    sk.vertex(tipX, 0);
    sk.vertex(tipX / 2, h / 2);
    sk.vertex(tipX, h);
    sk.vertex(tipX / 2, h); // 우하단 모서리
    sk.vertex(0, midY + cinch); // 왼쪽 중심 근처(살짝 아래)
    sk.endShape(sk.CLOSE);

    // 파내기
    sk.fill(boxColor);
    const cx = w - w * 0.18; // 다이아 중심을 오른쪽으로 오프셋
    const d = Math.min(w, h) * 0.34; //본체 크기
    sk.beginShape();
    sk.vertex(cx - d * 0.7, midY);
    sk.vertex(cx, midY - d * 0.7);
    sk.vertex(cx + d * 0.7, midY);
    sk.vertex(cx, midY + d * 0.7);
    sk.endShape(sk.CLOSE);

    sk.pop();
  }

  return { setup, draw, onPointer, onLongPress, onResize };
}
