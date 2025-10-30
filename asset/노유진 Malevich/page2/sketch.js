let l;
let col = [
  "#0c0c08",
  "#db4b1f",
  "#19275e",
  "#1d7c41",
  "#f2bc00",
  "#e49f8f",
  "#f18d00",
];
let rect_darkblue = [];
let rect_black = [];
let rect_green = [];
let rect_yellow = [];
let rect_orange = [];
let rect_pink = [];
let rect_must = [];
let rects = [];
let point = [];

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  l = windowWidth;
  rectMode(CENTER);
  angleMode(DEGREES);

  rect_darkblue.push({
    x: 0.6 * l,
    y: 0.54 * l,
    w: 0.32 * l,
    h: 0.36 * l,
    angle: 0,
    touchangle: 124,
  });
  rect_darkblue.push({
    x: 0.57 * l,
    y: 0.19 * l,
    w: 0.02 * l,
    h: 0.03 * l,
    angle: 0,
    touchangle: 35,
  });
  rect_darkblue.push({
    x: 0.58 * l,
    y: 0.16 * l,
    w: 0.01 * l,
    h: 0.06 * l,
    angle: 0,
    touchangle: 35,
  });
  rect_darkblue.push({
    x: 0.66 * l,
    y: 0.08 * l,
    w: 0.014 * l,
    h: 0.014 * l,
    angle: 0,
    touchangle: 35,
  });
  rect_darkblue.push({
    x: 0.67 * l,
    y: 0.06 * l,
    w: 0.006 * l,
    h: 0.02 * l,
    angle: 0,
    touchangle: 125,
  });
  rect_darkblue.push({
    x: 0.68 * l,
    y: 0.067 * l,
    w: 0.006 * l,
    h: 0.02 * l,
    angle: 0,
    touchangle: 125,
  });

  rect_black.push({
    x: 0.51 * l,
    y: 0.69 * l,
    w: 0.13 * l,
    h: 0.77 * l,
    angle: 0,
    touchangle: 0,
  });
  rect_black.push({
    x: 0.13 * l,
    y: 0.34 * l,
    w: 0.04 * l,
    h: 0.21 * l,
    angle: 0,
    touchangle: 124,
  });
  rect_black.push({
    x: 0.21 * l,
    y: 0.11 * l,
    w: 0.03 * l,
    h: 0.19 * l,
    angle: 0,
    touchangle: 124,
  });
  rect_black.push({
    x: 0.22 * l,
    y: 0.14 * l,
    w: 0.03 * l,
    h: 0.19 * l,
    angle: 0,
    touchangle: 124,
  });
  rect_black.push({
    x: 0.32 * l,
    y: 0.12 * l,
    w: 0.02 * l,
    h: 0.12 * l,
    angle: 0,
    touchangle: 130,
  });
  rect_black.push({
    x: 0.31 * l,
    y: 0.077 * l,
    w: 0.02 * l,
    h: 0.04 * l,
    angle: 0,
    touchangle: 130,
  });
  rect_black.push({
    x: 0.44 * l,
    y: 1.08 * l,
    w: 0.06 * l,
    h: 0.25 * l,
    angle: 0,
    touchangle: 310,
  });
  rect_black.push({
    x: 0.23 * l,
    y: 1.18 * l,
    w: 0.11 * l,
    h: 0.23 * l,
    angle: 0,
    touchangle: 310,
  });
  rect_black.push({
    x: 0.61 * l,
    y: 0.14 * l,
    w: 0.015 * l,
    h: 0.037 * l,
    angle: 0,
    touchangle: 35,
  });
  rect_black.push({
    x: 0.37 * l,
    y: 0.05 * l,
    w: 0.02 * l,
    h: 0.05 * l,
    angle: 0,
    touchangle: 310,
  });

  rect_green.push({
    x: 0.31 * l,
    y: 0.34 * l,
    w: 0.12 * l,
    h: 0.51 * l,
    angle: 0,
    touchangle: 118,
  });

  rect_yellow.push({
    x: 0.74 * l,
    y: 0.2 * l,
    w: 0.03 * l,
    h: 0.2 * l,
    angle: 0,
    touchangle: 126,
  });
  rect_yellow.push({
    x: 0.74 * l,
    y: 0.28 * l,
    w: 0.02 * l,
    h: 0.13 * l,
    angle: 0,
    touchangle: 128,
  });
  rect_yellow.push({
    x: 0.67 * l,
    y: 0.33 * l,
    w: 0.03 * l,
    h: 0.05 * l,
    angle: 0,
    touchangle: 128,
  });
  rect_yellow.push({
    x: 0.78 * l,
    y: 0.35 * l,
    w: 0.075 * l,
    h: 0.11 * l,
    angle: 0,
    touchangle: 38,
  });
  rect_yellow.push({
    x: 0.81 * l,
    y: 0.27 * l,
    w: 0.04 * l,
    h: 0.05 * l,
    angle: 0,
    touchangle: 128,
  });
  rect_yellow.push({
    x: 0.85 * l,
    y: 0.24 * l,
    w: 0.03 * l,
    h: 0.03 * l,
    angle: 0,
    touchangle: 128,
  });
  rect_yellow.push({
    x: 0.79 * l,
    y: 0.85 * l,
    w: 0.02 * l,
    h: 0.12 * l,
    angle: 0,
    touchangle: 178,
  });
  rect_yellow.push({
    x: 0.82 * l,
    y: 0.88 * l,
    w: 0.02 * l,
    h: 0.04 * l,
    angle: 0,
    touchangle: 178,
  });
  rect_yellow.push({
    x: 0.46 * l,
    y: 1.16 * l,
    w: 0.06 * l,
    h: 0.25 * l,
    angle: 0,
    touchangle: 309,
  });
  rect_yellow.push({
    x: 0.24 * l,
    y: 1.03 * l,
    w: 0.03 * l,
    h: 0.04 * l,
    angle: 0,
    touchangle: 37,
  });
  rect_yellow.push({
    x: 0.16 * l,
    y: 1.04 * l,
    w: 0.02 * l,
    h: 0.05 * l,
    angle: 0,
    touchangle: 307,
  });
  rect_yellow.push({
    x: 0.36 * l,
    y: 0.82 * l,
    w: 0.02 * l,
    h: 0.04 * l,
    angle: 0,
    touchangle: 307,
  });
  rect_yellow.push({
    x: 0.35 * l,
    y: 0.78 * l,
    w: 0.01 * l,
    h: 0.05 * l,
    angle: 0,
    touchangle: 307,
  });
  rect_yellow.push({
    x: 0.15 * l,
    y: 0.41 * l,
    w: 0.01 * l,
    h: 0.22 * l,
    angle: 0,
    touchangle: 127,
  });

  rect_orange.push({
    x: 0.16 * l,
    y: 0.87 * l,
    w: 0.07 * l,
    h: 0.23 * l,
    angle: 0,
    touchangle: 307,
  });
  rect_orange.push({
    x: 0.3 * l,
    y: 0.88 * l,
    w: 0.06 * l,
    h: 0.06 * l,
    angle: 0,
    touchangle: -90,
  });
  rect_orange.push({
    x: 0.13 * l,
    y: 1.03 * l,
    w: 0.01 * l,
    h: 0.17 * l,
    angle: 0,
    touchangle: 307,
  });
  rect_orange.push({
    x: 0.53 * l,
    y: 0.47 * l,
    w: 0.01 * l,
    h: 0.79 * l,
    angle: 0,
    touchangle: 307,
  });
  rect_orange.push({
    x: 0.58 * l,
    y: 1.08 * l,
    w: 0.03 * l,
    h: 0.22 * l,
    angle: 0,
    touchangle: 310,
  });
  rect_orange.push({
    x: 0.21 * l,
    y: 0.87 * l,
    w: 0.04 * l,
    h: 0.08 * l,
    angle: 0,
    touchangle: 307,
  });

  rect_pink.push({
    x: 0.81 * l,
    y: 0.98 * l,
    w: 0.06 * l,
    h: 0.15 * l,
    angle: 0,
    touchangle: 117,
  });

  rect_must.push({
    x: 0.18 * l,
    y: 1.07 * l,
    w: 0.02 * l,
    h: 0.15 * l,
    angle: 0,
    touchangle: 307,
  });
  rect_must.push({
    x: 0.38 * l,
    y: 1.08 * l,
    w: 0.04 * l,
    h: 0.37 * l,
    angle: 0,
    touchangle: 310,
  });
  rect_must.push({
    x: 0.45 * l,
    y: 1.13 * l,
    w: 0.02 * l,
    h: 0.25 * l,
    angle: 0,
    touchangle: 310,
  });
  rect_must.push({
    x: 0.78 * l,
    y: 0.81 * l,
    w: 0.03 * l,
    h: 0.28 * l,
    angle: 0,
    touchangle: 180,
  });
  rect_must.push({
    x: 0.63 * l,
    y: 0.11 * l,
    w: 0.03 * l,
    h: 0.05 * l,
    angle: 0,
    touchangle: 35,
  });

  rects = [
    rect_black,
    rect_orange,
    rect_darkblue,
    rect_green,
    rect_yellow,
    rect_pink,
    rect_must,
  ];
}

function draw() {
  background("#f2ebdb");

  for (let i = 0; i < rects.length; i++) {
    for (let d of rects[i]) {
      push();
      translate(d.x, d.y);
      if (touches.length > 0) {
        let deltx = touches[0].x - d.x;
        let delty = touches[0].y - d.y;
        d.touchangle = atan2(delty, deltx);
      }

      let deltangle = d.touchangle - d.angle;

      if (deltangle > 180) {
        deltangle -= 360;
      }
      if (deltangle <= -180) {
        deltangle += 360;
      }

      d.angle += deltangle * 0.1;

      rotate(d.angle - 90);
      fill(col[i]);
      noStroke();
      rect(0, 0, d.w, d.h);
      pop();
    }
  }
}

function touchStarted() {}
