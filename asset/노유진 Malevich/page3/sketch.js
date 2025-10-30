let drawing = false;
let points = [];
let shapes = [];
let polygons = [];
let vertexPoints = [];

let prevTouchX = 0;
let prevTouchY = 0;
let prevTime = 0;
let velocityX = 0;
let velocityY = 0;
let velocityThreshold = 0.002;

let colors = [
  "#1d7c41",
  "#f2bc00",
  "#f18d00",
  "#db4b1f",
  "#e49f8f",
  "#19275e",
  "#290917",
  "#0c0c08",
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  background("#f2ebdb");
  strokeWeight(2);
  stroke(30);
  fill(0, 0, 0, 0);
  textSize(14);

  if (touches.length > 0) {
    prevTouchX = touches[0].x;
    prevTouchY = touches[0].y;
  }
  prevTime = millis();
}

function draw() {
  background("#f2ebdb");

  noStroke();
  for (let poly of polygons) {
    fill(poly.color);
    beginShape();
    for (let v of poly.vertices) vertex(v.x, v.y);
    endShape(CLOSE);
  }

  if (drawing && points.length > 0) {
    noFill();
    stroke(0);
    beginShape();
    for (let p of points) vertex(p.x, p.y);
    endShape();
  }

  if (touches.length === 0) return;

  let t = touches[0];
  let currentTime = millis();
  let deltaTime = currentTime - prevTime;

  if (deltaTime > 0) {
    let dx = t.x - prevTouchX;
    let dy = t.y - prevTouchY;
    velocityX = dx / deltaTime;
    velocityY = dy / deltaTime;
  }

  if (
    abs(velocityX) < velocityThreshold &&
    abs(velocityY) < velocityThreshold
  ) {
    if (
      vertexPoints.length === 0 ||
      dist(
        t.x,
        t.y,
        vertexPoints[vertexPoints.length - 1].x,
        vertexPoints[vertexPoints.length - 1].y
      ) > 10
    ) {
      vertexPoints.push({ x: t.x, y: t.y });
    }
  }

  prevTouchX = t.x;
  prevTouchY = t.y;
  prevTime = currentTime;
}

function touchStarted() {
  drawing = true;
  points = [{ x: touches[0].x, y: touches[0].y }];

  vertexPoints = [];
}

function touchMoved() {
  if (!drawing) return;
  points.push({ x: touches[0].x, y: touches[0].y });
}

function touchEnded() {
  drawing = false;
  points = [];

  if (vertexPoints.length >= 3) {
    polygons.push({ vertices: vertexPoints.slice(), color: random(colors) });
  }

  vertexPoints = [];
}
