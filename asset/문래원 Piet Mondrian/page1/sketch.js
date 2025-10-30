const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;
let world;

let W, H;

let isDrawing = false;
let startX, startY;

let currentX, currentY;

let endTouchX, endTouchY;

const WALL_THICKNESS = 10;
let walls = [];

let colorAreas = [];
const MONDRIAAN_COLORS = [
  [255, 0, 0], // 빨강
  [0, 0, 255], // 파랑
  [255, 255, 0], // 노랑
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  W = windowWidth;
  H = windowHeight;

  rectMode(CENTER);
  noStroke();

  engine = Engine.create();
  world = engine.world;

  colorAreas.push({
    x: W / 2,
    y: H / 2,
    w: W,
    h: H,
    color: [255, 255, 255],
  });
}

function draw() {
  background(255);

  Engine.update(engine);

  renderColorAreas();
  renderWalls();

  drawDragLinePreview();
}

function createWall(startX, startY, endX, endY) {
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);

  if (dx < 30 && dy < 30) return;

  let wallX, wallY, wallW, wallH;

  if (dx > dy) {
    wallW = W;
    wallH = WALL_THICKNESS;
    wallX = W / 2;
    wallY = startY;
  } else {
    wallW = WALL_THICKNESS;
    wallH = H;
    wallX = startX;
    wallY = H / 2;
  }

  const wallOptions = { isStatic: true };
  const newWall = Bodies.rectangle(wallX, wallY, wallW, wallH, wallOptions);

  newWall.width = wallW;
  newWall.height = wallH;

  walls.push(newWall);
  Composite.add(world, newWall);

  updateColorAreas(newWall);
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    startX = mouseX;
    startY = mouseY;
    currentX = mouseX;
    currentY = mouseY;
    isDrawing = true;
  }
}

function mouseDragged() {
  if (isDrawing) {
    currentX = mouseX;
    currentY = mouseY;
  }
}

function mouseReleased() {
  if (!isDrawing) return;
  isDrawing = false;
  createWall(startX, startY, currentX, currentY);
}

function touchStarted() {
  if (touches.length > 0) {
    const touchX = touches[0].x;
    const touchY = touches[0].y;

    if (touchX > 0 && touchX < width && touchY > 0 && touchY < height) {
      startX = touchX;
      startY = touchY;
      isDrawing = true;
      currentX = touchX;
      currentY = touchY;
      endTouchX = touchX;
      endTouchY = touchY;
    }
  }
  return false;
}

function touchMoved() {
  if (isDrawing && touches.length > 0) {
    currentX = touches[0].x;
    currentY = touches[0].y;
    endTouchX = touches[0].x;
    endTouchY = touches[0].y;
  }
  return false;
}

function touchEnded() {
  if (!isDrawing) return false;
  isDrawing = false;
  const endX = endTouchX;
  const endY = endTouchY;
  createWall(startX, startY, endX, endY);
  return false;
}

function updateColorAreas(newWall) {
  const isHorizontal = newWall.height < newWall.width;
  const wallPos = isHorizontal ? newWall.position.y : newWall.position.x;

  let newAreas = [];
  let areasToKeep = [];

  for (let area of colorAreas) {
    let shouldSplit = false;
    if (isHorizontal) {
      const areaTop = area.y - area.h / 2;
      const areaBottom = area.y + area.h / 2;
      if (
        wallPos > areaTop + WALL_THICKNESS &&
        wallPos < areaBottom - WALL_THICKNESS
      ) {
        shouldSplit = true;
      }
    } else {
      const areaLeft = area.x - area.w / 2;
      const areaRight = area.x + area.w / 2;
      if (
        wallPos > areaLeft + WALL_THICKNESS &&
        wallPos < areaRight - WALL_THICKNESS
      ) {
        shouldSplit = true;
      }
    }

    if (shouldSplit) {
      let area1, area2;
      const wallHalfThickness = WALL_THICKNESS / 2;
      if (isHorizontal) {
        const topEdge = area.y - area.h / 2;
        const bottomEdge = area.y + area.h / 2;
        const h1 = wallPos - topEdge - wallHalfThickness;
        const y1 = topEdge + h1 / 2;
        const h2 = bottomEdge - wallPos - wallHalfThickness;
        const y2 = bottomEdge - h2 / 2;
        area1 = { x: area.x, y: y1, w: area.w, h: h1, color: [255, 255, 255] };
        area2 = { x: area.x, y: y2, w: area.w, h: h2, color: [255, 255, 255] };
      } else {
        const leftEdge = area.x - area.w / 2;
        const rightEdge = area.x + area.w / 2;
        const w1 = wallPos - leftEdge - wallHalfThickness;
        const x1 = leftEdge + w1 / 2;
        const w2 = rightEdge - wallPos - wallHalfThickness;
        const x2 = rightEdge - w2 / 2;
        area1 = { x: x1, y: area.y, w: w1, h: area.h, color: [255, 255, 255] };
        area2 = { x: x2, y: area.y, w: w2, h: area.h, color: [255, 255, 255] };
      }

      const randomColor =
        MONDRIAAN_COLORS[Math.floor(random(MONDRIAAN_COLORS.length))];
      if (random() < 0.5) area1.color = randomColor;
      else area2.color = randomColor;

      const MIN_AREA_SIZE = 5;
      if (area1.w > MIN_AREA_SIZE && area1.h > MIN_AREA_SIZE)
        newAreas.push(area1);
      if (area2.w > MIN_AREA_SIZE && area2.h > MIN_AREA_SIZE)
        newAreas.push(area2);
    } else {
      areasToKeep.push(area);
    }
  }
  colorAreas = areasToKeep.concat(newAreas);
}

function renderWalls() {
  fill(0);
  noStroke();
  rectMode(CENTER);
  for (let wall of walls) {
    push();
    translate(wall.position.x, wall.position.y);
    rotate(wall.angle);
    rect(0, 0, wall.width, wall.height);
    pop();
  }
}

function renderColorAreas() {
  rectMode(CENTER);
  noStroke();
  for (let area of colorAreas) {
    fill(area.color[0], area.color[1], area.color[2]);
    if (area.w > 1 && area.h > 1) {
      rect(area.x, area.y, area.w, area.h);
    }
  }
}

function drawDragLinePreview() {
  if (!isDrawing) return;

  const dx = Math.abs(currentX - startX);
  const dy = Math.abs(currentY - startY);

  if (dx < 30 && dy < 30) return;

  push();
  stroke(0, 0, 0, 100);
  strokeWeight(WALL_THICKNESS);

  if (dx > dy) {
    line(startX, startY, currentX, startY);
  } else {
    line(startX, startY, startX, currentY);
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  W = windowWidth;
  H = windowHeight;
  walls = [];
  Composite.clear(world, false);
  colorAreas = [{ x: W / 2, y: H / 2, w: W, h: H, color: [255, 255, 255] }];
}
