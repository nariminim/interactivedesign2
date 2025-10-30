let lines = [];
let prev = null;
let easedX = 0;
let easedY = 0;

let noiseBackground;
let xScale = 0.05;
let yScale = 0.2;
let gap = 4; // 노이즈 간격

let rectGap = 22;
let rectColors = ["#394da4", "#19998d", "#aa4863"];
let rectWidth = 9;
let rectHeight = 20;
let rectOffsetRange = 2;
let prevRect = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);

  noiseBackground = createGraphics(windowWidth, windowHeight);
  drawNoiseToBuffer();
}

function draw() {
  // background("#a2b2ca");
  image(noiseBackground, 0, 0);
  for (let l of lines) {
    stroke("#00000000");
    strokeWeight(1);
    line(
      l.guideLine.start.x,
      l.guideLine.start.y,
      l.guideLine.end.x,
      l.guideLine.end.y
    );

    noStroke();
    for (let r of l.rectangles) {
      fill(r.color);
      rect(r.x, r.y, r.w, r.h);
    }
  }

  if (prev) {
    let targetX = mouseX;
    let targetY = mouseY;

    if (touches.length > 0) {
      targetX = touches[0].x;
      targetY = touches[0].y;
    }

    let easingFactor = 0.3; // 고무줄 느낌 속도 조절
    easedX = lerp(easedX, targetX, easingFactor);
    easedY = lerp(easedY, targetY, easingFactor);

    let startPoint = prev;
    let endPoint = createVector(easedX, easedY);
    let lineVec = p5.Vector.sub(endPoint, startPoint);
    let totalDist = lineVec.mag();
    let direction = lineVec.copy().normalize();
    let perpendicularVec = direction.copy().rotate(HALF_PI);
    let numRectsToShow = floor(totalDist / rectGap) + 1;

    for (let i = prevRect.length; i < numRectsToShow; i++) {
      let d = i * rectGap;
      let p = p5.Vector.add(startPoint, direction.copy().mult(d));
      let randomOffset = random(-rectOffsetRange, rectOffsetRange);
      let offsetVec = perpendicularVec.copy().mult(randomOffset);
      let finalPos = p5.Vector.add(p, offsetVec);

      let rectData = {
        x: finalPos.x,
        y: finalPos.y,
        w: rectWidth,
        h: rectHeight,
        color: random(rectColors),
      };
      prevRect.push(rectData);
    }

    if (numRectsToShow < prevRect.length) {
      prevRect.length = numRectsToShow;
    }

    stroke("#00000000");
    line(prev.x, prev.y, easedX, easedY);

    noStroke();
    for (let r of prevRect) {
      let previewColor = color(r.color);
      previewColor.setAlpha(150);
      fill(previewColor);
      rect(r.x, r.y, r.w, r.h);
    }
  }
}

function drawNoiseToBuffer() {
  noiseBackground.background("#a2b2ca");
  noiseBackground.noStroke();
  noiseBackground.fill("#ffffff");

  let offset = 0;
  for (let x = gap / 2; x < noiseBackground.width; x += gap) {
    for (let y = gap / 2; y < noiseBackground.height; y += gap) {
      let noiseValue = noise((x + offset) * xScale, (y + offset) * yScale);
      let diameter = noiseValue * gap;

      noiseBackground.circle(x, y, diameter);
    }
  }
}

function mousePressed() {
  prev = createVector(mouseX, mouseY);
  easedX = mouseX;
  easedY = mouseY;
  prevRect = [];
  print("start point - desktop");
}

function mouseReleased() {
  finalizeLine();
  // if (prev) {
  //   let endPoint = createVector(easedX, easedY);
  //   lines.push({ start: prev, end: endPoint });
  //   prev = null;
  // }
  print("end point - desktop");
}

function touchStarted() {
  if (touches.length > 0) {
    prev = createVector(touches[0].x, touches[0].y);
    easedX = touches[0].x;
    easedY = touches[0].y;
    prevRect = [];
    print("start point - mobile");
  }
}

function touchEnded() {
  finalizeLine();
  // if (prev) {
  //   let endPoint = createVector(easedX, easedY);
  //   lines.push({ start: prev, end: endPoint });
  //   prev = null;
  // }
  print("end point - mobile");
}

function touchCancel() {
  finalizeLine();
  print("end point - touch cancel");
}

function finalizeLine() {
  if (prev) {
    let startPoint = prev;
    let endPoint = createVector(easedX, easedY);

    let newRectangle = {
      guideLine: { start: startPoint, end: endPoint },
      rectangles: prevRect,
    };

    lines.push(newRectangle);
    prev = null;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  noiseBackground.resizeCanvas(windowWidth, windowHeight);
  drawNoiseToBuffer();
}
