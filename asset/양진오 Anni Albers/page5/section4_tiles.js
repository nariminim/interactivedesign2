function Section4_PatternTiles() {
  // ===== 상태 =====
  let cells = [];
  const minEdge = 14;
  const margin = 20;
  const ORANGE = "#ff6b4a";
  const BLUE = "#4fb7ff";

  let depth = 0; // 현재 분할 단계
  const maxDepth = 15; // 최대 단계
  let dir = +1; // +1 올라가고, 끝에 닿으면 -1로 반전
  let seed = Math.floor(Math.random() * 1e6); // 패턴 시드(세션 동안 고정)

  // ===== 라이프사이클 =====
  function setup(app) {
    rebuildPattern(app);
  }
  function teardown(app) {}
  function onResize(app) {
    rebuildPattern(app);
  }
  function onLongPress(app) {
    depth = 0;
    dir = +1;
    rebuildPattern(app);
    // snap 사운드는 Input에서 이미 재생
  }

  // ===== 랜덤 시드 고정 =====
  function reseed(sk) {
    sk.randomSeed(seed);
  }

  // ===== 패턴 빌드 =====
  function rebuildPattern(app) {
    const sk = app.p;
    cells = [];
    reseed(sk);

    // 중앙 80% 정사각형 1개 (tone=파랑 시작)
    const size = Math.min(sk.width, sk.height) * 0.8;
    const x = (sk.width - size) / 2;
    const y = (sk.height - size) / 2;
    cells.push({ type: "square", x, y, size, level: 0, tone: 1 });

    // 깊이만큼 반복 분할 — 이전 "비균질(70%)" 로직 유지
    for (let d = 0; d < depth; d++) {
      if (cells.length > 4000) break;
      const next = [];
      for (const g of cells) {
        if (g.type === "square") {
          // 정사각형: 대각 방향 랜덤 (NW-SE vs NE-SW)
          const useNWtoSE = sk.random() < 0.5;
          const created = splitSquare(g, useNWtoSE);
          next.push(...created);
        } else {
          // 직각이등변: 70% 확률로만 분할(비균질감)
          if (sk.random() < 0.7) {
            const created = splitTri(g);
            next.push(...created);
          } else {
            next.push(g);
          }
        }
        if (next.length > 4000) break;
      }
      cells = next;
    }

    // 변경 1회당 사운드 1번
    // depth 기록할 때
    if (window.App) window.App.currentDepth = depth;
    app.sound.tension({ depth });
  }

  // ===== 렌더 =====
  function draw(app, sk) {
    sk.background(10, 12, 16);
    sk.noStroke();
    for (const g of cells) {
      sk.fill(g.tone ? BLUE : ORANGE);
      if (g.type === "square") {
        sk.rect(g.x, g.y, g.size, g.size, 3);
      } else {
        sk.triangle(g.a.x, g.a.y, g.b.x, g.b.y, g.c.x, g.c.y);
      }
    }
  }

  // ===== 분할 로직 =====
  function splitSquare(sq, useNWtoSE) {
    if (sq.size < minEdge * 2) return [sq];

    const pTL = { x: sq.x, y: sq.y };
    const pTR = { x: sq.x + sq.size, y: sq.y };
    const pBL = { x: sq.x, y: sq.y + sq.size };
    const pBR = { x: sq.x + sq.size, y: sq.y + sq.size };
    const lv = sq.level + 1;

    if (useNWtoSE) {
      // TL—BR: 직각은 TR / BL
      const t1 = {
        type: "tri",
        a: pTL,
        b: pTR,
        c: pBR,
        level: lv,
        right: pTR,
        tone: sq.tone,
      };
      const t2 = {
        type: "tri",
        a: pTL,
        b: pBR,
        c: pBL,
        level: lv,
        right: pBL,
        tone: 1 - sq.tone,
      };
      return [t1, t2];
    } else {
      // TR—BL: 직각은 BR / TL
      const t1 = {
        type: "tri",
        a: pTR,
        b: pBR,
        c: pBL,
        level: lv,
        right: pBR,
        tone: sq.tone,
      };
      const t2 = {
        type: "tri",
        a: pTR,
        b: pBL,
        c: pTL,
        level: lv,
        right: pTL,
        tone: 1 - sq.tone,
      };
      return [t1, t2];
    }
  }

  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

  function rightIsoLegs(tr) {
    const r = tr.right;
    const others = [];
    for (const p of [tr.a, tr.b, tr.c]) if (p !== r) others.push(p);
    return { u: others[0], v: others[1] };
  }

  function splitTri(tr) {
    const legs = rightIsoLegs(tr);
    if (!legs) return [tr];
    // 너무 작아졌으면 더 분할 안 함
    const lenU = Math.hypot(legs.u.x - tr.right.x, legs.u.y - tr.right.y);
    const lenV = Math.hypot(legs.v.x - tr.right.x, legs.v.y - tr.right.y);
    if (Math.min(lenU, lenV) < minEdge) return [tr];

    const hypMid = mid(legs.u, legs.v);
    const lv = tr.level + 1;
    const tA = {
      type: "tri",
      a: tr.right,
      b: legs.u,
      c: hypMid,
      level: lv,
      right: hypMid,
      tone: tr.tone,
    };
    const tB = {
      type: "tri",
      a: tr.right,
      b: hypMid,
      c: legs.v,
      level: lv,
      right: hypMid,
      tone: 1 - tr.tone,
    };
    return [tA, tB];
  }

  // ===== 입력: 터치/클릭으로 depth 핑퐁 =====
  function onPointer(app, type, pt) {
    if (type !== "down") return;

    // 경계에서 방향 반전
    if (depth >= maxDepth) dir = -1;
    if (depth <= 0) dir = +1;

    depth += dir;
    depth = Math.max(0, Math.min(maxDepth, depth));
    rebuildPattern(app);
  }

  return { setup, draw, teardown, onPointer, onLongPress, onResize };
}
