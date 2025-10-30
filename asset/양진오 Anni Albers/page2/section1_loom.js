/* global App, Matter */

// Section 1 — Loom Grid (visual verticals + physical horizontal bars; ropes fall & weave)

function Section1_LoomGrid() {
  const M = Matter;
  const W = () => App.p.width;
  const H = () => App.p.height;

  // ===== Visual grid (p5 only - vertical posts) =====
  const V_POST_GAP = 140; // 세로 기둥 간격 (시각 전용)
  const V_POST_W = 64; // 세로 기둥 폭
  const COL_ORANGE = [235, 96, 40, 255];
  const COL_IVORY = [248, 234, 214, 255]; // 연한 가로 획 대비용

  // ===== Columns / layout =====
  const NUM_COLS = 3;
  const PAD = 32;
  const INNER_SIDE = 14;
  const WALL_THICK = 16;
  const FLOOR_THICK = 18;

  // ===== Horizontal bars (physics) =====
  const BAR_H = 14; // 가로 바 두께 (physics)
  const BAR_GAP_Y = 92; // 바 사이 간격
  const BAR_INSET = 10; // 통 내부 좌우 여백
  const BAR_ROUND = 6; // 시각용 모서리 반경
  const BAR_FRICTION = 0.95;

  // ===== Rope (beads + constraints) =====
  const SEG_STEP = 10; // drawing sample step (px)
  const BEAD_R = 4.4;
  const MAX_BEADS = 240;
  const LINK_STIFF = 0.92;
  const LINK_DAMP = 0.08;
  const FRICTION = 0.9;
  const DENSITY = 0.0007;
  const RESTITUTION = 0.02;

  // (선택) 드문 peg 연결로 ‘고리’ 느낌 조금 보강
  const USE_SPARSE_PEG = true;
  const PEG_STIFF = 0.36,
    PEG_DAMP = 0.06,
    PEG_SLACK = 7;
  const PEG_SNAP_EVERY = 10,
    PEG_NEAR_DIST = 26;
  const MAX_PEGS_PER_ROPE = 6,
    PEG_ATTACH_PROB = 0.45;
  const CURVATURE_MIN = 0.0025;

  // ===== Colors =====
  const ROPE_COLOR = [8, 10, 14, 255]; // 단색 통일

  // 🔉 섹션 전용 볼륨 스케일(완전 mute 대신 “아주 작게”)
  const VOL = 0.08;
  function quietSound(name, ...args) {
    try {
      if (!App?.sound || typeof App.sound[name] !== "function") return;
      if (name === "tick") {
        if (typeof args[1] === "number") args[1] *= VOL;
        else args[1] = VOL;
      } else if (name === "tension") {
        if (typeof args[1] === "number") args[1] *= VOL;
        else args[1] = VOL;
      } else if (name === "snap") {
        if (args.length === 0) args = [VOL];
        else if (typeof args[0] === "number") args[0] *= VOL;
      }
      App.sound[name](...args);
    } catch (_) {
      /* swallow */
    }
  }

  // ===== State =====
  let columns = []; // {x,y,w,h}
  let walls = []; // static side walls & floors
  let bars = []; // static horizontal bars (Matter bodies)
  let pegPtsPerCol = []; // sparse peg 후보(바 모서리 부근 점들)
  let ropes = []; // {beads, links, pegCons, color, colIdx}
  let drawing = null;

  // ---------------- Layout helpers ----------------
  const whichColumn = (pt) => {
    for (let i = 0; i < columns.length; i++) {
      const c = columns[i];
      if (pt.x >= c.x && pt.x <= c.x + c.w && pt.y >= c.y && pt.y <= c.y + c.h)
        return i;
    }
    return -1;
  };

  function clampToColumn(colIdx, x, y) {
    const c = columns[colIdx];
    const minX = c.x + INNER_SIDE;
    const maxX = c.x + c.w - INNER_SIDE;
    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(c.y + 4, Math.min(y, c.y + c.h - 6)),
    };
  }

  function rebuildColumns() {
    // remove old
    for (const b of walls) M.World.remove(App.world, b);
    for (const b of bars) M.World.remove(App.world, b);
    walls = [];
    bars = [];
    columns = [];
    pegPtsPerCol = [];

    const usableW = W() - PAD * 2;
    const colW = usableW / NUM_COLS;
    const top = PAD;
    const bottom = H() - PAD;

    for (let i = 0; i < NUM_COLS; i++) {
      const x0 = PAD + i * colW;
      const x1 = x0 + colW;
      const cx = (x0 + x1) / 2;

      const rect = { x: x0, y: top, w: colW, h: bottom - top };
      columns.push(rect);

      // side walls & floor (physics)
      const leftWall = M.Bodies.rectangle(
        x0,
        (top + bottom) / 2,
        WALL_THICK,
        bottom - top,
        { isStatic: true, friction: 0.9, render: { visible: false } }
      );
      const rightWall = M.Bodies.rectangle(
        x1,
        (top + bottom) / 2,
        WALL_THICK,
        bottom - top,
        { isStatic: true, friction: 0.9, render: { visible: false } }
      );
      const floor = M.Bodies.rectangle(
        cx,
        bottom,
        colW - WALL_THICK * 1.25,
        FLOOR_THICK,
        {
          isStatic: true,
          friction: 0.98,
          restitution: 0.0,
          render: { visible: false },
        }
      );
      walls.push(leftWall, rightWall, floor);

      // horizontal bars (physics)
      const innerL = x0 + BAR_INSET + INNER_SIDE;
      const innerR = x0 + colW - BAR_INSET - INNER_SIDE;
      const pegPts = [];

      for (let y = top + BAR_GAP_Y; y <= bottom - BAR_GAP_Y; y += BAR_GAP_Y) {
        const bw = innerR - innerL;
        const bdy = M.Bodies.rectangle((innerL + innerR) / 2, y, bw, BAR_H, {
          isStatic: true,
          friction: BAR_FRICTION,
          restitution: 0.0,
          render: { visible: false },
        });
        bars.push(bdy);

        // sparse peg points near bar edges
        if (USE_SPARSE_PEG) {
          const edgeOffset = Math.min(30, bw * 0.18);
          pegPts.push({ x: innerL + edgeOffset, y: y - BAR_H * 0.5 });
          pegPts.push({ x: innerR - edgeOffset, y: y + BAR_H * 0.5 });
        }
      }
      pegPtsPerCol.push(pegPts);
    }

    M.World.add(App.world, walls);
    if (bars.length) M.World.add(App.world, bars);
  }

  // ---------------- Rope build ----------------
  function safeNormalise(v) {
    const len = Math.hypot(v.x, v.y) || 0;
    return len < 1e-6 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
  }

  function nearestPeg(colIdx, pos, maxDist) {
    if (!USE_SPARSE_PEG) return null;
    const arr = pegPtsPerCol[colIdx] || [];
    let best = null,
      bestD2 = (maxDist || 9999) ** 2;
    for (const p of arr) {
      const dx = p.x - pos.x,
        dy = p.y - pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = p;
      }
    }
    return best;
  }

  function bakeRope(colIdx, pts, color) {
    if (!pts || pts.length < 2) return;

    const beads = [];
    const links = [];
    const pegCons = [];

    const addBead = (p) => {
      const b = M.Bodies.circle(p.x, p.y, BEAD_R, {
        friction: FRICTION,
        frictionStatic: 0.95,
        restitution: RESTITUTION,
        density: DENSITY,
        render: { visible: false },
      });
      beads.push(b);
      return b;
    };

    // 첫 점(시작점) 비드 생성 + 시작점 앵커
    let prev = addBead(pts[0]);
    const anchorStart = M.Constraint.create({
      pointA: { x: pts[0].x, y: pts[0].y },
      bodyB: prev,
      length: 0,
      stiffness: 0.8,
      damping: 0.2,
      render: { visible: false },
    });
    M.World.add(App.world, anchorStart);

    let pegCount = 0;

    for (let i = 1; i < pts.length && beads.length < MAX_BEADS; i++) {
      const cur = addBead(pts[i]);

      // 로프 링크
      const link = M.Constraint.create({
        bodyA: prev,
        bodyB: cur,
        stiffness: LINK_STIFF,
        damping: LINK_DAMP,
        length: Math.max(
          1,
          Matter.Vector.magnitude(
            Matter.Vector.sub(cur.position, prev.position)
          ) * 0.98
        ),
        render: { visible: false },
      });
      links.push(link);

      // 드문 peg 연결 (곡률 기반)
      if (
        USE_SPARSE_PEG &&
        pegCount < MAX_PEGS_PER_ROPE &&
        i % PEG_SNAP_EVERY === 0 &&
        Math.random() < PEG_ATTACH_PROB &&
        beads.length >= 3
      ) {
        const pA = beads[beads.length - 3].position;
        const pB = prev.position;
        const pC = cur.position;
        const v1 = safeNormalise(Matter.Vector.sub(pB, pA));
        const v2 = safeNormalise(Matter.Vector.sub(pC, pB));
        const curvature = Math.abs(v1.x * v2.y - v1.y * v2.x);
        if (curvature > CURVATURE_MIN) {
          const peg = nearestPeg(colIdx, cur.position, PEG_NEAR_DIST);
          if (peg) {
            const con = M.Constraint.create({
              pointA: { x: peg.x, y: peg.y },
              bodyB: cur,
              length: PEG_SLACK,
              stiffness: PEG_STIFF,
              damping: PEG_DAMP,
              render: { visible: false },
            });
            pegCons.push(con);
            pegCount++;
          }
        }
      }

      prev = cur;
    }

    // (옵션) 끝점도 고정하고 싶다면 여기서 처리 — 필요시 true로
    const ANCHOR_END = false;
    if (ANCHOR_END && beads.length > 0) {
      const lastBead = beads[beads.length - 1];
      const anchorEnd = M.Constraint.create({
        pointA: { x: lastBead.position.x, y: lastBead.position.y },
        bodyB: lastBead,
        length: 0,
        stiffness: 0.8,
        damping: 0.2,
        render: { visible: false },
      });
      M.World.add(App.world, anchorEnd);
    }

    M.World.add(App.world, beads);
    M.World.add(App.world, links);
    if (pegCons.length) M.World.add(App.world, pegCons);

    ropes.push({ beads, links, pegCons, color, colIdx });
  }

  // ---------------- Drawing ----------------
  function drawVisualVerticals(sk) {
    // 배경
    sk.background(255);

    // 오렌지 세로 기둥 (시각 전용)
    sk.noStroke();
    for (let x = PAD + 56; x < W() - PAD; x += V_POST_GAP) {
      sk.fill(...COL_ORANGE);
      sk.rect(x - V_POST_W * 0.5, PAD + 24, V_POST_W, H() - PAD * 2 - 48, 6);
    }

    // 아이보리 가로 시각 레이어(얇은 그림자 느낌) — 실제 충돌은 아래 drawBars에서
    sk.fill(...COL_IVORY);
    for (let y = PAD + BAR_GAP_Y; y <= H() - PAD - BAR_GAP_Y; y += BAR_GAP_Y) {
      sk.rect(
        PAD + 18,
        y - BAR_H * 0.6,
        W() - (PAD + 18) * 2,
        BAR_H * 0.85,
        BAR_ROUND
      );
    }
  }

  function drawBars(sk) {
    // 실제 physics 바의 가시화(살짝 투명)
    sk.push();
    sk.noStroke();
    sk.fill(250, 242, 230, 220);
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const pos = b.position;
      const w = b.bounds.max.x - b.bounds.min.x;
      const h = b.bounds.max.y - b.bounds.min.y;
      sk.push();
      sk.translate(pos.x, pos.y);
      sk.rotate(b.angle || 0);
      sk.rectMode(sk.CENTER);
      sk.rect(0, 0, w, h, BAR_ROUND);
      sk.pop();
    }
    sk.pop();
  }

  function drawTubesOverlay(sk) {
    // 통 경계 레이어(살짝 어둡게)
    sk.push();
    for (let i = 0; i < columns.length; i++) {
      const c = columns[i];
      const tint = i % 2 === 0 ? [0, 0, 0, 18] : [0, 0, 0, 8];
      sk.noStroke();
      sk.fill(...tint);
      sk.rect(c.x, c.y, c.w, c.h, 8);
    }
    sk.pop();
  }

  function drawRopes(sk) {
    sk.push();
    for (const r of ropes) {
      sk.noFill();
      sk.stroke(...r.color);
      sk.strokeCap(sk.ROUND);
      sk.strokeJoin(sk.ROUND);
      sk.strokeWeight(BEAD_R * 2.0);
      sk.beginShape();
      for (const b of r.beads) sk.curveVertex(b.position.x, b.position.y);
      sk.endShape();

      // 작은 스티치 점
      sk.stroke(0, 0, 0, 70);
      sk.strokeWeight(Math.max(1, BEAD_R * 0.5));
      for (let i = 2; i < r.beads.length; i += 8) {
        const b = r.beads[i];
        sk.point(b.position.x, b.position.y);
      }
    }
    sk.pop();
  }

  function drawPreview(sk) {
    if (!drawing || drawing.pts.length < 2) return;
    sk.push();
    sk.noFill();
    // 미리보기는 같은 색의 옅은 톤
    const r = ROPE_COLOR;
    sk.stroke(r[0], r[1], r[2], 120);
    sk.strokeWeight(BEAD_R * 1.6);
    sk.strokeCap(sk.ROUND);
    sk.beginShape();
    for (const p of drawing.pts) sk.curveVertex(p.x, p.y);
    sk.endShape();
    sk.pop();
  }

  // ---------------- Interface ----------------
  return {
    setup(app) {
      rebuildColumns();
      // 충돌 사운드 리스너는 등록하지 않음(조용하게)
      // 필요하면 quietSound("tick", ...) 형태로 등록 가능
    },

    draw(app, sk) {
      // z-order: visual vertical posts → physical bars → tubes overlay → ropes → live preview
      drawVisualVerticals(sk);
      drawBars(sk);
      drawTubesOverlay(sk);
      drawRopes(sk);
      drawPreview(sk);
    },

    onPointer(app, type, pt) {
      if (type === "down") {
        const col = whichColumn(pt);
        if (col < 0) return;
        const p0 = clampToColumn(col, pt.x, pt.y);
        const color = ROPE_COLOR;
        drawing = { colIdx: col, pts: [p0], lastPt: p0, color };
        quietSound("tension", 122 + col * 6, Math.min(1, pt.pressure || 0.5));
      } else if (type === "move") {
        if (!drawing) return;
        const col = drawing.colIdx;
        const p = clampToColumn(col, pt.x, pt.y);
        const lp = drawing.lastPt;
        const dx = p.x - lp.x,
          dy = p.y - lp.y;
        if (dx * dx + dy * dy >= SEG_STEP * SEG_STEP) {
          drawing.pts.push(p);
          drawing.lastPt = p;
          if (Math.random() < 0.1) quietSound("tension", 110 + col * 5, 0.35);
        }
      } else if (type === "up") {
        if (!drawing) return;
        bakeRope(drawing.colIdx, drawing.pts, drawing.color);
        drawing = null;
        quietSound("snap");
      }
    },

    onLongPress(app, pt) {
      // 안전을 위해 기본값: 아무 것도 안 함 (실수로 삭제 방지)
    },

    onResize(app) {
      // 기존 로프는 그대로 두고, 벽/바만 갱신
      rebuildColumns();
    },

    teardown(app) {
      // 리스너 없음
      for (const r of ropes) {
        for (const b of r.beads) Matter.World.remove(App.world, b);
        for (const c of r.links) Matter.World.remove(App.world, c);
        for (const pc of r.pegCons || []) Matter.World.remove(App.world, pc);
      }
      ropes = [];
      for (const b of bars) Matter.World.remove(App.world, b);
      for (const w of walls) Matter.World.remove(App.world, w);
      bars = [];
      walls = [];
      columns = [];
      pegPtsPerCol = [];
    },
  };
}
