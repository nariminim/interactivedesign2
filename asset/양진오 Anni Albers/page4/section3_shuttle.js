// 정사각형 벽
let FRAME = { cx: 0, cy: 0, size: 0, x: 0, y: 0 };

function chaikinClosed(pts, iters = 1) {
  let out = pts;
  for (let k = 0; k < iters; k++) {
    const next = [];
    const n = out.length;
    for (let i = 0; i < n; i++) {
      const a = out[i],
        b = out[(i + 1) % n];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out = next;
  }
  return out;
}
function bodiesToPoints(bodies, maxStep = 28) {
  const pts = [];
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const p = bodies[i].position,
      q = bodies[(i + 1) % n].position;
    pts.push({ x: p.x, y: p.y });
    const dx = q.x - p.x,
      dy = q.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > maxStep) {
      const steps = Math.ceil(d / maxStep);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        pts.push({ x: p.x + dx * t, y: p.y + dy * t });
      }
    }
  }
  return pts;
}

// 실 렌더러: 흰 코어 + 점선(검정) + 얕은 언더쉐도
function renderRope(sk, smoothPts, coreW = 10) {
  const ctx = sk.drawingContext;
  const m = smoothPts.length;

  const drawPath = () => {
    sk.beginShape();
    sk.curveVertex(smoothPts[m - 1].x, smoothPts[m - 1].y);
    for (let p of smoothPts) sk.curveVertex(p.x, p.y);
    sk.curveVertex(smoothPts[0].x, smoothPts[0].y);
    sk.curveVertex(smoothPts[1].x, smoothPts[1].y);
    sk.endShape(sk.CLOSE);
  };

  // 언더 쉐도(겹침 강조)
  sk.noFill();
  sk.stroke(0, 28);
  sk.strokeWeight(coreW + 2);
  sk.curveTightness(0.4);
  drawPath();

  // 흰 코어
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  sk.stroke(255);
  sk.strokeWeight(coreW);
  drawPath();

  // 검은 선
  ctx.setLineDash([12, 10]);
  sk.stroke(0);
  sk.strokeWeight(Math.max(1.6, coreW * 0.22));
  drawPath();
  ctx.setLineDash([]);
}

function Section3_ShuttleChannels() {
  const { World, Bodies, Body, Composite, Constraint, Vector } = Matter;

  let ropes = [];
  let walls = [];
  let shuttle = null;
  //고리 설정
  const P = {
    segCount: 96,
    segRadius: 5,
    stiffness: 0.68,
    damping: 0.28,
    air: 0.02,
    restitution: 0.0,
    attractR: 80,
    attractForce: 0.0001,

    // 고밀도 격자 (겹침↑)
    ringGrid: { cols: 6, rows: 7 },
  };

  function computeFrame(sk, margin = 40) {
    const s = Math.min(sk.width, sk.height) - margin * 2;
    const cx = sk.width / 2,
      cy = sk.height / 2;
    FRAME = { cx, cy, size: s, x: cx - s / 2, y: cy - s / 2 };
  }

  function createRopeAt(cx, cy, rx, ry = rx, rot = 0) {
    const group = Matter.Body.nextGroup(true);
    const comp = Composite.create({ label: "rope" });
    const nodes = [];

    for (let i = 0; i < P.segCount; i++) {
      const a = (i / P.segCount) * Math.PI * 2 + rot;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      const b = Bodies.circle(x, y, P.segRadius, {
        density: 0.0005,
        friction: 0.05,
        frictionAir: P.air,
        restitution: P.restitution,
        collisionFilter: { group },
        render: { visible: false },
      });
      nodes.push(b);
      Composite.add(comp, b);
      if (i > 0) {
        Composite.add(
          comp,
          Constraint.create({
            bodyA: nodes[i - 1],
            bodyB: b,
            length: Vector.magnitude(
              Vector.sub(nodes[i - 1].position, b.position)
            ),
            stiffness: P.stiffness,
            damping: P.damping,
          })
        );
      }
    }
    Composite.add(
      comp,
      Constraint.create({
        bodyA: nodes[0],
        bodyB: nodes[nodes.length - 1],
        length: Vector.magnitude(
          Vector.sub(nodes[0].position, nodes[nodes.length - 1].position)
        ),
        stiffness: P.stiffness,
        damping: P.damping,
      })
    );
    comp.bodies = nodes;
    return comp;
  }

  function createWalls(app) {
    const { x, y, size } = FRAME;
    const thick = 80;
    const w = [
      Bodies.rectangle(x - thick / 2, y + size / 2, thick, size, {
        isStatic: true,
        render: { visible: false },
      }),
      Bodies.rectangle(x + size + thick / 2, y + size / 2, thick, size, {
        isStatic: true,
        render: { visible: false },
      }),
      Bodies.rectangle(x + size / 2, y - thick / 2, size, thick, {
        isStatic: true,
        render: { visible: false },
      }),
      Bodies.rectangle(x + size / 2, y + size + thick / 2, size, thick, {
        isStatic: true,
        render: { visible: false },
      }),
    ];
    World.add(app.world, w);
    return w;
  }

  function setup(app) {
    app.engine.world.gravity.y = 0;
    const sk = app.p;
    computeFrame(sk, 40);

    const { cols, rows } = P.ringGrid;
    const cellW = FRAME.size / cols;
    const cellH = FRAME.size / rows;

    // 겹침 강화: 셀 대비 큰 반지름
    const baseR = Math.min(cellW, cellH) * 0.66;

    ropes = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = FRAME.x + (c + 0.5) * cellW;
        const cy = FRAME.y + (r + 0.5) * cellH;

        const rot = (r % 2 === 0 ? 0 : Math.PI / 6) + (c % 3) * 0.08;
        const scale = 1 + ((r + c) % 2 ? 0.1 : -0.06);
        const rx = baseR * scale;
        const ry = baseR * (1 - ((r + c) % 3) * 0.05);

        const rope = createRopeAt(cx, cy, rx, ry, rot);
        rope.__layer = (r + c) % 2; // 오버/언더용 레이어
        ropes.push(rope);
        World.add(app.world, rope);

        // 약한 접선 임펄스(정체 방지)
        for (const seg of rope.bodies) {
          const p = seg.position;
          const tang = { x: -(p.y - cy), y: p.x - cx };
          const dir = Vector.normalise(tang);
          Body.applyForce(seg, p, Vector.mult(dir, 0.00022));
        }
      }
    }
    walls = createWalls(app);
  }

  function teardown(app) {
    for (const rope of ropes) World.remove(app.world, rope);
    for (const w of walls) World.remove(app.world, w);
    if (shuttle) {
      World.remove(app.world, shuttle);
      shuttle = null;
    }
    ropes = [];
    walls = [];
  }

  function onResize(app) {
    teardown(app);
    setup(app);
  }

  function draw(app, sk) {
    // 바탕: 흰 캔버스 + 프레임 안만 오렌지
    sk.background(255);
    sk.noStroke();
    sk.fill(255 * 0.97, 90, 31); // 오렌지
    sk.rect(FRAME.x, FRAME.y, FRAME.size, FRAME.size);

    //외곽
    sk.noFill();
    sk.stroke(255);
    sk.strokeWeight(2);
    sk.rect(FRAME.x, FRAME.y, FRAME.size, FRAME.size);

    // 레이어 정렬
    const ordered = [...ropes].sort((a, b) => a.__layer - b.__layer);

    // 각 로프 렌더
    for (const rope of ordered) {
      const raw = bodiesToPoints(rope.bodies);
      const smooth = chaikinClosed(raw, 1);
      renderRope(sk, smooth, 10);
    }

    // 셔틀 표시
    if (shuttle) {
      sk.noFill();
      sk.stroke(255, 220);
      sk.circle(shuttle.position.x, shuttle.position.y, 22);
    }
  }

  function onPointer(app, type, pt) {
    const { World, Bodies, Body, Vector } = Matter;
    if (type === "down") {
      shuttle = Bodies.circle(pt.x, pt.y, 20, {
        isStatic: true,
        collisionFilter: { group: -1 },
        render: { visible: false },
      });
      World.add(app.world, shuttle);
      app.sound.tension(120, pt.pressure || 0.5);
    } else if (type === "move" && shuttle) {
      Body.setPosition(shuttle, { x: pt.x, y: pt.y });
      for (const rope of ropes) {
        for (const seg of rope.bodies) {
          const d = Vector.magnitude(
            Vector.sub(seg.position, shuttle.position)
          );
          if (d < P.attractR) {
            const dir = Vector.normalise(
              Vector.sub(shuttle.position, seg.position)
            );
            Body.applyForce(
              seg,
              seg.position,
              Vector.mult(dir, P.attractForce * (P.attractR - d))
            );
          }
        }
      }
    } else if (type === "up" && shuttle) {
      World.remove(app.world, shuttle);
      shuttle = null;
    }
  }

  function onLongPress(app) {
    const c = { x: FRAME.cx, y: FRAME.cy };
    for (const rope of ropes) {
      for (const seg of rope.bodies) {
        const p = seg.position;
        const tang = { x: -(p.y - c.y), y: p.x - c.x };
        const dir = Vector.normalise(tang);
        Body.applyForce(seg, p, Vector.mult(dir, Math.random() * 0.002));
      }
    }
    app.sound.snap();
  }

  return { setup, draw, onPointer, onLongPress, onResize, teardown };
}
