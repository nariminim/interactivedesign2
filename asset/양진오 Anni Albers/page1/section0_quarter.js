// Section0_QuarterWeave — “Recursive 4-split cells + 4-direction quarter-circles”
// 인스턴스 모드 안전화: 모든 p5 전역 API는 sk.*로 접근, 헬퍼에도 sk 전달.

function Section0_QuarterWeave() {
  // ===== 상수/상태 =====
  const GRID0 = 4;
  const TILE0 = 180;
  const GAP = 0;
  const MARGIN = 28;

  const PALETTE = [
    "#111111",
    "#d83a2e",
    "#79c7ff",
    "#f0b2c8",
    "#f2de6a",
    "#c7c7c7",
    "#8f98a1",
    "#f5f5f5",
  ];
  const TYPES = ["checker", "stripeH", "stripeV", "blank"];
  // --- press state for short/long press disambiguation ---
  const LONG_MS = 450; // 롱프레스 최대값
  let pressCell = -1; // down 시 히트한 셀 인덱스
  let pressTimer = null; // 롱프레스 타이머
  let longFired = false; // 롱프레스 발생 여부

  let cells = [];
  let layerBase, layerBack, layerFront;
  let currentCorner = "BR"; // TL→TR→BR→BL

  // ===== 유틸 =====
  const nextCorner = (c) => {
    const order = ["TL", "TR", "BR", "BL"];
    return order[(order.indexOf(c) + 1) % order.length];
  };
  const inside = (cell, x, y) => {
    return (
      x >= cell.x && y >= cell.y && x < cell.x + cell.w && y < cell.y + cell.h
    );
  };

  // ===== 초기화/렌더 =====
  function resetCells() {
    cells.length = 0;
    for (let r = 0; r < GRID0; r++) {
      for (let c = 0; c < GRID0; c++) {
        const x = MARGIN + c * (TILE0 + GAP);
        const y = MARGIN + r * (TILE0 + GAP);

        const TYPES_POOL = [
          "checker",
          "stripeH",
          "stripeH",
          "stripeV",
          "blank",
          "blank",
        ];
        const type = TYPES_POOL[Math.floor(Math.random() * TYPES_POOL.length)];

        cells.push({ x, y, w: TILE0, h: TILE0, type, quarter: null });
      }
    }
  }

  // 셀 4분할 함수 (true=성공, false=더이상 분할 불가)
  function splitCell(index) {
    const c = cells[index];
    const hw = c.w / 2,
      hh = c.h / 2;
    if (hw < 36 || hh < 36) return false; // 너무 작으면 중단

    // 기존 셀 제거 후 4개로 쪼갬
    cells.splice(index, 1);
    cells.push({ x: c.x, y: c.y, w: hw, h: hh, type: c.type, quarter: null });
    cells.push({
      x: c.x + hw,
      y: c.y,
      w: hw,
      h: hh,
      type: c.type,
      quarter: null,
    });
    cells.push({
      x: c.x,
      y: c.y + hh,
      w: hw,
      h: hh,
      type: c.type,
      quarter: null,
    });
    cells.push({
      x: c.x + hw,
      y: c.y + hh,
      w: hw,
      h: hh,
      type: c.type,
      quarter: null,
    });

    return true;
  }
  function renderAll(app, sk) {
    layerBase.clear();
    layerBack.clear();
    layerFront.clear();

    for (const cell of cells) drawCellBackground(layerBase, cell, sk);
    for (const cell of cells) {
      if (cell.quarter) drawQuarterInCell(cell, sk);
    }
    // 레이어는 draw()에서 화면 중앙 배치로 그린다
  }

  function drawCellBackground(g, cell, sk) {
    const pg = sk.createGraphics(cell.w, cell.h);

    if (cell.type === "checker") drawChecker(pg, sk);
    if (cell.type === "stripeH") drawStripes(pg, true, sk);
    if (cell.type === "stripeV") drawStripes(pg, false, sk);
    // if (cell.type === "marble") drawMarble(pg, sk);
    if (cell.type === "blank") drawBlank(pg);

    pg.noFill();
    pg.stroke(0, 40);
    pg.strokeWeight(2);
    pg.rect(1, 1, pg.width - 2, pg.height - 2);
    g.image(pg, cell.x, cell.y);
  }

  function drawChecker(pg, sk) {
    const n = Math.max(8, Math.floor(pg.width / 14));
    const s = pg.width / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const t = (i + j) & 1 ? 7 : 0;
        pg.noStroke();
        pg.fill(PALETTE[t]);
        pg.rect(j * s, i * s, s + 0.5, s + 0.5);
      }
    }
  }

  function drawStripes(pg, horizontal, sk) {
    pg.noStroke();
    const bands = parseInt(sk.map(pg.width, 60, 180, 5, 10));
    let acc = 0;
    for (let i = 0; i < bands; i++) {
      const w = pg.width / bands;
      pg.fill(PALETTE[[1, 2, 3, 4, 7, 6, 0][i % 7]]);
      if (horizontal) pg.rect(0, acc, pg.width, w);
      else pg.rect(acc, 0, w, pg.height);
      acc += w * 0.95;
      if (acc > (horizontal ? pg.height : pg.width)) break;
    }
  }

  function drawBlank(pg) {
    pg.background("#eeeef0");
  }

  function drawQuarterInCell(cell, sk) {
    const pgBack = sk.createGraphics(cell.w, cell.h);
    const pgFront = sk.createGraphics(cell.w, cell.h);
    [pgBack, pgFront].forEach((pg) => {
      pg.noStroke();
      pg.background(0, 0);
    });

    let cx, cy, a1, a2;
    if (cell.quarter.corner === "TL") {
      cx = 0;
      cy = 0;
      a1 = 0;
      a2 = sk.HALF_PI;
    }
    if (cell.quarter.corner === "TR") {
      cx = cell.w;
      cy = 0;
      a1 = sk.HALF_PI;
      a2 = sk.PI;
    }
    if (cell.quarter.corner === "BR") {
      cx = cell.w;
      cy = cell.h;
      a1 = sk.PI;
      a2 = sk.PI + sk.HALF_PI;
    }
    if (cell.quarter.corner === "BL") {
      cx = 0;
      cy = cell.h;
      a1 = sk.PI + sk.HALF_PI;
      a2 = sk.TWO_PI;
    }

    const outerR = cell.w;
    const thickness = Math.max(10, cell.w * 0.14);
    const gap = Math.max(6, cell.w * 0.07);
    const innerLimit = thickness / 2;
    const rings = Math.max(
      3,
      Math.floor((outerR - innerLimit) / (thickness + gap))
    );

    for (let i = 0; i < rings; i++) {
      const rOut = outerR - i * (thickness + gap);
      const rIn = rOut - thickness;
      if (rIn < innerLimit) break;

      const col = sk.color(PALETTE[[2, 3, 4, 7, 1, 7, 0][i % 7]]);
      const isFront = i % 2 === 0;

      if (isFront) {
        // 얇은 그림자(뒤 레이어)
        drawFilledQuarter(
          pgBack,
          cx,
          cy,
          rOut + 1.2,
          rIn + 1.2,
          a1,
          a2,
          sk.color(0, 40),
          sk
        );
      }
      drawFilledQuarter(
        isFront ? pgFront : pgBack,
        cx,
        cy,
        rOut,
        rIn,
        a1,
        a2,
        col,
        sk
      );
    }

    layerBack.image(pgBack, cell.x, cell.y);

    layerFront.image(pgFront, cell.x, cell.y);
  }

  function drawFilledQuarter(pg, cx, cy, rOut, rIn, a1, a2, col, sk) {
    pg.push();
    pg.fill(col);
    pg.beginShape();
    const steps = 64;
    for (let s = 0; s <= steps; s++) {
      const t = sk.lerp(a1, a2, s / steps);
      pg.vertex(cx + rOut * sk.cos(t), cy + rOut * sk.sin(t));
    }
    for (let s = steps; s >= 0; s--) {
      const t = sk.lerp(a1, a2, s / steps);
      pg.vertex(cx + rIn * sk.cos(t), cy + rIn * sk.sin(t));
    }
    pg.endShape(sk.CLOSE);
    pg.pop();
  }

  // ===== 섹션 인터페이스 =====
  return {
    setup(app) {
      const sk = app.p;
      const W = MARGIN * 2 + GRID0 * TILE0 + (GRID0 - 1) * GAP;

      layerBase = sk.createGraphics(W, W);
      layerBack = sk.createGraphics(W, W);
      layerFront = sk.createGraphics(W, W);
      [layerBase, layerBack, layerFront].forEach((g) => {
        g.noStroke();
        g.rectMode(sk.CORNER);
      });

      resetCells();
      renderAll(app, sk);
    },

    draw(app, sk) {
      // 화면 중앙 배치
      const dx = (sk.width - layerBase.width) * 0.5;
      const dy = (sk.height - layerBase.height) * 0.5;

      sk.push();
      sk.translate(dx, dy);
      sk.image(layerBase, 0, 0);
      sk.image(layerBack, 0, 0);
      sk.image(layerFront, 0, 0);
      sk.image(layerBase, 0, 0);
      sk.image(layerBack, 0, 0);
      sk.image(layerFront, 0, 0);
      // HUD
      sk.textFont("monospace");
      sk.textSize(14);
      sk.noStroke();
      sk.fill(0, 140);
      sk.rect(layerBase.width - 250, 12, 230, 36, 6);
      sk.fill(255);
      sk.textAlign(sk.LEFT, sk.CENTER);
      sk.text(
        `Corner: ${currentCorner} (hold=cycle) | Cells: ${cells.length}`,
        layerBase.width - 240,
        30
      );
      sk.pop();
    },

    onPointer(app, type, pt) {
      const sk = app.p;
      const dx = (sk.width - layerBase.width) * 0.5;
      const dy = (sk.height - layerBase.height) * 0.5;
      const lx = pt.x - dx,
        ly = pt.y - dy;

      // 유틸: 현재 좌표에서 히트한 셀 찾기
      const findHit = () => {
        for (let i = cells.length - 1; i >= 0; i--) {
          if (inside(cells[i], lx, ly)) return i;
        }
        return -1;
      };

      if (type === "down") {
        // --- 데스크톱 보조키 빠른 경로
        // ALT: 배경 타입 순환 (즉시)
        if (sk.keyIsDown && sk.keyIsDown(sk.ALT)) {
          const hit = findHit();
          if (hit >= 0) {
            const cell = cells[hit];
            const idx = TYPES.indexOf(cell.type);
            cell.type = TYPES[(idx + 1) % TYPES.length];
            renderAll(app, sk);
            app.sound?.tick?.(240, 0.05, 0.25);
          }
          return;
        }

        // --- 기본 경로: short vs long
        pressCell = findHit();
        longFired = false;

        if (pressCell < 0) return;

        // 롱프레스 타이머 시작: LONG_MS 경과 시 사분원 생성/회전
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
          if (pressCell < 0) return;
          longFired = true;
          const cell = cells[pressCell];

          if (cell.quarter) {
            cell.quarter.corner = nextCorner(cell.quarter.corner);
          } else {
            cell.quarter = { corner: currentCorner };
          }
          renderAll(app, sk);
          app.sound?.tension?.(170, 0.45);
        }, LONG_MS);

        return;
      }

      if (type === "up" || type === "cancel") {
        // 타이머 정리
        clearTimeout(pressTimer);

        // 롱프레스가 이미 실행됐으면(=사분원 처리 끝), up에서는 아무 것도 안 함
        if (pressCell >= 0 && !longFired) {
          // 짧은 탭 → 기존 기본동작: "분할"
          const ok = splitCell(pressCell);
          renderAll(app, sk);
          if (ok) app.sound?.snap?.();
        }

        // 상태 리셋
        pressCell = -1;
        longFired = false;
        return;
      }

      // 필요하면 move에 따른 취소(드래그)도 추가 가능:
      // if (type === "move" && pressCell >= 0) { ... 이동거리 임계 넘으면 타이머 취소 ... }
    },

    onLongPress(app) {
      const sk = app.p;
      const dx = (sk.width - layerBase.width) * 0.5;
      const dy = (sk.height - layerBase.height) * 0.5;

      // 마지막 터치 위치 추적용 전역 pt (onPointer와 공유할 수 있음)
      const pt = app.pointer?.last || { x: sk.mouseX, y: sk.mouseY };
      const lx = pt.x - dx;
      const ly = pt.y - dy;

      // 셀 찾기
      let hit = -1;
      for (let i = cells.length - 1; i >= 0; i--) {
        if (inside(cells[i], lx, ly)) {
          hit = i;
          break;
        }
      }
      if (hit < 0) return;

      const cell = cells[hit];

      if (cell.quarter) {
        // 이미 있으면 회전
        cell.quarter.corner = nextCorner(cell.quarter.corner);
      } else {
        // 없으면 새로 생성
        cell.quarter = { corner: currentCorner };
      }

      renderAll(app, sk);
      app.sound.tension(170, 0.45);
    },
  };
}
