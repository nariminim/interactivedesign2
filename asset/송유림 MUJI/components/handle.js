// Simple handle component with physics engine
window.CDPlayer = (function () {
  let engine, world, anchor, handle, spring, mConstraint;
  let isInitialized = false;
  const LINE_GAP = 50; // 손잡이가 앵커에서 얼마나 내려갈지(px)
  const HANDLE_RADIUS = 26; // 물리 핸들 반지름(Body 생성과 동일)

  // 줄 그리기
  function drawTrimmedConnector(
    ax,
    ay,
    hx,
    hy,
    handleVisualRadius,
    endClear = 1.5
  ) {
    // 연결선을 앵커 위쪽(화면 바깥)까지 뻗어나가 보이도록 시작점을 크게 확장
    const dx0 = hx - ax;
    const dy0 = hy - ay;
    const len0 = Math.hypot(dx0, dy0) || 1;
    const ux = dx0 / len0;
    const uy = dy0 / len0;

    const OVERSHOOT = Math.max(height, 400); // 화면을 넘어갈 정도
    const sx = ax - ux * OVERSHOOT;
    const sy = ay - uy * OVERSHOOT;
    const dx = hx - sx;
    const dy = hy - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ex = hx - ux * (handleVisualRadius + endClear);
    const ey = hy - uy * (handleVisualRadius + endClear);
    line(sx, sy, ex, ey);
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

    // 앵커: 화면 최상단(0) 중앙
    anchor = { x: width / 2, y: 0 };

    // 손잡이: 화면 최상단에 붙도록 중심을 반지름만큼 아래 배치
    const handleX = anchor.x;
    const handleY = Math.max(HANDLE_RADIUS + 1, anchor.y + 1);

    handle = Bodies.circle(handleX, handleY, 26, {
      restitution: 0.5,
      friction: 0.1,
      density: 0.001,
      collisionFilter: { category: 0x0002, mask: 0xffff },
    });

    const distance = Math.hypot(anchor.x - handleX, anchor.y - handleY);
    spring = Constraint.create({
      pointA: { x: anchor.x, y: anchor.y },
      bodyB: handle,
      length: distance,
      stiffness: 0.01,
      damping: 0.1,
    });

    World.add(world, [handle, spring]);

    const canvas = document.querySelector("canvas");
    if (!canvas) {
      console.warn("Canvas not found for handle physics");
      return;
    }

    const mouse = Mouse.create(canvas);
    if (typeof window.pixelDensity === "function") {
      mouse.pixelRatio = pixelDensity();
    }

    mConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.15,
        damping: 0.1,
        render: { visible: false },
      },
    });

    mConstraint.constraint.collisionFilter = { mask: 0x0002 };
    World.add(world, mConstraint);
    canvas.style.touchAction = "none";

    isInitialized = true;
  }

  function updatePhysics() {
    if (!isInitialized) return;
    if (typeof Matter === "undefined") return;
    const { Engine } = Matter;
    Engine.update(engine);
    // 앵커 위로는 올라가지 않도록(아래쪽 180도 제한)
    if (handle && anchor && handle.position.y < anchor.y + 1) {
      Matter.Body.setPosition(handle, {
        x: handle.position.x,
        y: anchor.y + 1,
      });
      Matter.Body.setVelocity(handle, {
        x: handle.velocity.x,
        y: Math.max(0, handle.velocity.y),
      });
      Matter.Body.setAngularVelocity(handle, 0);
    }
  }

  function handleInteraction(x, y, isPressed) {
    if (!isInitialized || !handle || !anchor || !mConstraint) return 0;

    const handlePos = handle.position;
    const distance = Math.sqrt(
      Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2)
    );

    const handleRadius = 80;
    if (distance <= handleRadius) {
      if (isPressed) {
        mConstraint.mouse.position.x = handlePos.x;
        mConstraint.mouse.position.y = handlePos.y;
        mConstraint.mouse.button = 0;
        mConstraint.mouse.pressed = true;
      } else {
        mConstraint.mouse.pressed = false;
        mConstraint.mouse.button = -1;

        const totalDistance = Math.sqrt(
          Math.pow(anchor.x - handlePos.x, 2) +
            Math.pow(anchor.y - handlePos.y, 2)
        );
        const pull = Math.max(0, totalDistance - 100);

        if (pull > 5 && typeof window.currentOnPullEnd === "function") {
          window.currentOnPullEnd(pull);
        }
        return pull;
      }
    } else {
      if (mConstraint.mouse.pressed) {
        mConstraint.mouse.pressed = false;
        mConstraint.mouse.button = -1;
      }
    }
    return 0;
  }

  function drawDevice(opts) {
    const o = opts || {};
    const onPullEnd = o.onPullEnd;
    window.currentOnPullEnd = onPullEnd;

    initializePhysics();

    // 앵커 그리기
    if (anchor && handle) {
      const ctx = drawingContext;
      ctx.save();

      // 연결선
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      const handleVisualDiameter = o.handleSize || 20;
      const handleVisualRadius = handleVisualDiameter / 2;

      stroke(255, 180);
      strokeWeight(3);
      drawTrimmedConnector(
        anchor.x,
        anchor.y,
        handle.position.x,
        handle.position.y,
        handleVisualRadius,
        1.5
      );

      // 손잡이
      ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      noFill();
      stroke(255, 200);
      strokeWeight(3);
      ellipse(handle.position.x, handle.position.y, o.handleSize || 20);

      stroke(255, 255);
      strokeWeight(1);
      ellipse(handle.position.x, handle.position.y, (o.handleSize || 20) * 0.7);

      ctx.restore();
    }
  }

  function handlePointerDown(x, y) {
    if (!isInitialized || !mConstraint) return;
    handleInteraction(x, y, true);
  }

  function handlePointerMove(x, y) {
    if (!isInitialized || !mConstraint) return;
    // 포인터 목표를 앵커 아래쪽으로만 제한
    const clampedY = Math.max(anchor ? anchor.y + 1 : 1, y);
    mConstraint.mouse.position.x = x;
    mConstraint.mouse.position.y = clampedY;
  }

  function handlePointerUp(x, y) {
    if (!isInitialized || !mConstraint) return;
    handleInteraction(x, y, false);
  }

  function resetHandle(canvasWidth, canvasHeight) {
    if (!isInitialized || !handle) return;
    const cw = canvasWidth || width;
    const ch = canvasHeight || height;

    anchor.x = cw / 2;
    anchor.y = 20; // 화면 상단에서 20px 아래

    const handleX = cw / 2;
    const handleY = Math.max(HANDLE_RADIUS + 1, anchor.y + 1);

    Matter.Body.setPosition(handle, { x: handleX, y: handleY });
    Matter.Body.setVelocity(handle, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(handle, 0);
    if (spring)
      spring.length = Math.hypot(anchor.x - handleX, anchor.y - handleY);
    if (mConstraint) mConstraint.length = 0;
  }

  return {
    drawDevice,
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
  };
})();
