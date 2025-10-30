/* global Matter, p5 */

const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Body,
  Constraint,
  Composite,
  Composites,
  Events,
  Vector,
} = Matter;

const App = {
  p: null,
  engine: null,
  runner: null,
  world: null,
  current: null,
  sections: [],
  sound: null,
  input: null,
  ui: null,
  isTouch: false,
  pixelDensity: window.devicePixelRatio || 1,

  switchTo(idx) {
    const s = this.sections[idx];
    if (!s) return;
    if (this.current && this.current.teardown) this.current.teardown(this);
    this.clearWorld();
    this.current = s;
    if (this.current.setup) this.current.setup(this);
    this.ui.setActive(idx);
  },

  clearWorld() {
    const all = Composite.allBodies(this.world);
    for (let b of all) World.remove(this.world, b);
    const allC = Composite.allConstraints(this.world);
    for (let c of allC) World.remove(this.world, c);
  },
};

class SoundBus {
  constructor(p) {
    this.p = p;
    this.master = new p5.Gain();
    this.master.connect();
    this.master.amp(0.9);

    this.percGain = new p5.Gain();
    this.percGain.connect(this.master);
    this.percGain.amp(0.6);
    this.strGain = new p5.Gain();
    this.strGain.connect(this.master);
    this.strGain.amp(0.5);
    this.fxGain = new p5.Gain();
    this.fxGain.connect(this.master);
    this.fxGain.amp(0.4);

    this.comp = new p5.Compressor();
    this.comp.process(this.master);
  }

  // 짧은 충돌음 (모래/마찰) : 노이즈+빠른 엔벌로프
  tick(freq = 200, dur = 0.06, gain = 0.3) {
    const o = new p5.Oscillator("triangle");
    o.disconnect();
    o.connect(this.percGain);
    const env = new p5.Envelope();
    env.setADSR(0.001, 0.06, 0, 0.02);
    env.setRange(gain, 0.0001);
    o.start();
    o.freq(freq);
    env.play(o, 0, dur);
    setTimeout(() => o.stop(), (dur + 0.08) * 1000);
  }

  // 장력/직조 감: 밴드가 당겨질 때 나는 스트링성 사운드
  tension(optsOrBase = 110, maybeForce = 0.5, maybeDepth = null) {
    // ── 입력 해석: (base, force [, depth]) 또는 ({ depth, force })
    let force, depth;
    if (typeof optsOrBase === "object" && optsOrBase !== null) {
      force = optsOrBase.force ?? 0.5;
      depth = optsOrBase.depth ?? 0;
    } else {
      force = maybeForce;
      depth =
        typeof maybeDepth === "number"
          ? maybeDepth
          : window.App?.currentDepth ?? 0; // 없으면 0
    }

    // p5.sound 미로드 가드
    if (typeof p5 === "undefined" || typeof p5.Oscillator !== "function") {
      return; // 소리 생략하고 안전 종료
    }

    // 가온도(C4) 기준, 반음 단위 상승
    const c4 = 261.63;
    const freq = c4 * Math.pow(2, depth / 12);

    const o = new p5.Oscillator("sawtooth");
    o.disconnect();
    if (this.strGain?.connect) o.connect(this.strGain);

    const env = new p5.Envelope();
    env.setADSR(0.005, 0.18, 0.0, 0.15);

    o.start();
    o.freq(freq);
    env.setRange(0.22 + 0.3 * force, 0.0001);
    env.play(o);
    setTimeout(() => o.stop(), 240);
  }

  // 스냅/스프링 복귀
  snap() {
    this.tick(320, 0.08, 0.35);
  }

  // 채널 충돌(섹션3)
  thump(vel = 5) {
    const base = 90 + Math.min(180, vel * 25);
    this.tick(base, 0.07, 0.45);
  }
}

class Input {
  constructor(p, app) {
    this.p = p;
    this.app = app;
    this.points = new Map(); // pointerId -> {x,y,t,pressure}
    this.longPressMs = 1100;
    this._lpTimers = new Map();
    this.bind();
  }
  bind() {
    const c = this.p.canvas;
    c.addEventListener("pointerdown", (e) => this.onDown(e));
    c.addEventListener("pointermove", (e) => this.onMove(e));
    c.addEventListener("pointerup", (e) => this.onUp(e));
    c.addEventListener("pointercancel", (e) => this.onUp(e));
  }
  onDown(e) {
    e.preventDefault();
    this.app.isTouch = true;
    const pt = {
      x: e.offsetX,
      y: e.offsetY,
      t: performance.now(),
      pressure: e.pressure || 0.5,
    };
    this.points.set(e.pointerId, pt);
    // 롱프레스 → 섹션별 reset/snap
    const tm = setTimeout(() => {
      if (this.app.current?.onLongPress)
        this.app.current.onLongPress(this.app, pt);
      this.app.sound.snap();
    }, this.longPressMs);
    this._lpTimers.set(e.pointerId, tm);
    this.app.current?.onPointer?.(this.app, "down", pt);
  }
  onMove(e) {
    if (!this.points.has(e.pointerId)) return;
    const pt = this.points.get(e.pointerId);
    pt.x = e.offsetX;
    pt.y = e.offsetY;
    pt.pressure = e.pressure || 0.5;
    this.app.current?.onPointer?.(this.app, "move", pt);
  }
  onUp(e) {
    const pt = this.points.get(e.pointerId);
    clearTimeout(this._lpTimers.get(e.pointerId));
    this._lpTimers.delete(e.pointerId);
    this.points.delete(e.pointerId);
    this.app.current?.onPointer?.(this.app, "up", pt);
  }
}

(function boot() {
  const p = new p5((sk) => {
    App.p = sk;

    sk.setup = () => {
      const cnv = sk.createCanvas(sk.windowWidth, sk.windowHeight);
      cnv.parent(document.getElementById("app"));
      sk.pixelDensity(App.pixelDensity);
      sk.frameRate(60);
      App.engine = Engine.create({ enableSleeping: false });
      App.world = App.engine.world;
      App.runner = Runner.create();
      Runner.run(App.runner, App.engine);

      App.sound = new SoundBus(sk);
      App.input = new Input(sk, App);

      // 섹션 목록 등록
      App.sections = [
        Section0_QuarterWeave(),
        Section1_LoomGrid(),
        Section2_WeftRipple(),
        Section3_ShuttleChannels(),
        Section4_PatternTiles(),
      ];

      // UI
      App.ui = createTabs(
        ["Quarter", "Loom", "Ripple", "Shuttle", "Tiles", "Rope"],
        (i) => App.switchTo(i)
      );
      App.switchTo(0);
    };

    sk.draw = () => {
      Engine.update(App.engine, 1000 / 60);

      // 배경/레이어 베이스
      sk.background(10, 12, 16);

      // 섹션 렌더
      if (App.current?.draw) App.current.draw(App, sk);
    };

    sk.windowResized = () => {
      sk.resizeCanvas(sk.windowWidth, sk.windowHeight);
      App.current?.onResize?.(App);
    };

    sk.keyPressed = () => {
      const k = sk.key;
      if (k >= "1" && k <= "5") App.switchTo(parseInt(k) - 1);
    };
  }, document.body);
})();
