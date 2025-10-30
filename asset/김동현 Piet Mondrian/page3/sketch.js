let cols = 40;
let rows = 56;
let grid = [];
let cellSize;
let xOffset = 0;
let yOffset = 0;

let buildings = [];
let cars = [];
let signals = [];

let dragTarget = null;
let dragType = "";
let dragOffsetX = 0;
let dragOffsetY = 0;

const LAYOUT_SEED = 2025;

function setup() {
createCanvas(windowWidth, windowHeight);
rectMode(CORNER);
noStroke();

randomSeed(LAYOUT_SEED);
noiseSeed(LAYOUT_SEED);

initGrid();
placeRoads();
placeBuildings();
placeSignals();
placeCars();
}

function initGrid() {
grid = Array.from({ length: rows }, () =>
Array.from({ length: cols }, () => ({ type: "empty", roadDir: null }))
);
resizeGrid();
}

function resizeGrid() {
let cellW = width / cols;
let cellH = height / rows;
cellSize = min(cellW, cellH);

xOffset = (width - cellSize * cols) / 2;
yOffset = (height - cellSize * rows) / 2;
}

function placeRoads() {
let numH = 4 + floor(random(0, 3));
let numV = 4 + floor(random(0, 3));
let thickness = 2;

let chosenH = [];
let chosenV = [];

while (chosenH.length < numH && chosenH.length < rows) {
let y = floor(random(rows));
if (!chosenH.some((ch) => abs(ch - y) < thickness * 2)) chosenH.push(y);
}
while (chosenV.length < numV && chosenV.length < cols) {
let x = floor(random(cols));
if (!chosenV.some((ch) => abs(ch - x) < thickness * 2)) chosenV.push(x);
}

for (let y0 of chosenH) {
for (let dy = 0; dy < thickness; dy++) {
let y = constrain(y0 + dy, 0, rows - 1);
for (let x = 0; x < cols; x++) {
if (grid[y][x].type === "empty") grid[y][x] = { type: "road", roadDir: "h" };
else if (grid[y][x].type === "road")
grid[y][x].roadDir = grid[y][x].roadDir === "v" ? "both" : "h";
}
}
}

for (let x0 of chosenV) {
for (let dx = 0; dx < thickness; dx++) {
let x = constrain(x0 + dx, 0, cols - 1);
for (let y = 0; y < rows; y++) {
if (grid[y][x].type === "empty") grid[y][x] = { type: "road", roadDir: "v" };
else if (grid[y][x].type === "road")
grid[y][x].roadDir = grid[y][x].roadDir === "h" ? "both" : "v";
}
}
}
}

function placeBuildings() {
buildings = [];
let tries = 0;
let target = 12;
while (buildings.length < target && tries < 500) {
tries++;
let w = floor(random(4, 12));
let h = w;
let x = floor(random(0, cols - w));
let y = floor(random(0, rows - h));

let overlap = false;
for (let yy = y; yy < y + h && !overlap; yy++) {
  for (let xx = x; xx < x + w; xx++) {
    if (grid[yy][xx].type === "road") overlap = true;
  }
}
if (!overlap) {
  let mainColor = random([color(255, 0, 0), color(0, 0, 255)]);
  buildings.push({ x, y, w, h, color: mainColor });
}


}
}

function placeSignals() {
signals = [];
for (let y = 1; y < rows - 1; y++) {
for (let x = 1; x < cols - 1; x++) {
let c = grid[y][x];
if (c.type === "road" && c.roadDir === "both") {
signals.push({
x,
y,
isRed: random() < 0.5,
timer: random(3, 8),
cycle: random(5, 9)
});
}
}
}
}

function placeCars() {
cars = [];
let roadCells = [];
for (let y = 0; y < rows; y++) {
for (let x = 0; x < cols; x++) {
if (grid[y][x].type === "road") roadCells.push({ x, y, dir: grid[y][x].roadDir });
}
}

for (let i = 0; i < 120; i++) {
let r = random(roadCells);
let dirChoice;
if (r.dir === "h") dirChoice = random(["right", "left"]);
else if (r.dir === "v") dirChoice = random(["up", "down"]);
else dirChoice = random(["right", "left", "up", "down"]);

let c = random([color(255, 0, 0), color(0, 0, 255), color(255, 204, 0)]);
cars.push({
  x: r.x,
  y: r.y,
  dir: dirChoice,
  color: c,
  speed: random(0.15, 0.25),
  progress: 0,
  stopped: false,
  dragging: false
});


}
}

function draw() {
background(255);

push();
translate(xOffset, yOffset);

for (let y = 0; y < rows; y++) {
for (let x = 0; x < cols; x++) {
fill(grid[y][x].type === "road" ? color(255, 220, 0) : 245);
rect(x * cellSize, y * cellSize, cellSize, cellSize);
}
}

for (let b of buildings) {
fill(b.color);
rect(b.x * cellSize, b.y * cellSize, b.w * cellSize, b.h * cellSize);
let innerSize = floor(min(b.w, b.h) * 0.45);
if (innerSize > 0) {
let ix = b.x + floor((b.w - innerSize) * 0.5);
let iy = b.y + floor((b.h - innerSize) * 0.5);
let innerColor = red(b.color) > 200 ? color(0, 0, 255) : color(255, 0, 0);
fill(innerColor);
rect(ix * cellSize, iy * cellSize, innerSize * cellSize, innerSize * cellSize);
}
}

for (let s of signals) {
s.timer -= deltaTime / 1000;
if (s.timer <= 0) {
s.isRed = !s.isRed;
s.timer = s.cycle;
}
fill(s.isRed ? color(200, 0, 0) : color(0, 80, 0));
rect(
s.x * cellSize + cellSize * 0.3,
s.y * cellSize + cellSize * 0.3,
cellSize * 0.4,
cellSize * 0.4,
3
);
}

updateCars();
pop();
}

function updateCars() {
for (let car of cars) {
if (!car.dragging) {
let nextX = car.x;
let nextY = car.y;
if (car.dir === "right") nextX += 1;
else if (car.dir === "left") nextX -= 1;
else if (car.dir === "up") nextY -= 1;
else if (car.dir === "down") nextY += 1;

  car.stopped = false;
  for (let s of signals) {
    if (s.isRed && s.x === nextX && s.y === nextY) car.stopped = true;
  }

  for (let other of cars) {
    if (other === car) continue;
    if (car.dir !== other.dir) continue;
    if (car.dir === "right" && other.y === car.y && other.x > car.x && other.x - car.x < 2)
      car.stopped = true;
    if (car.dir === "left" && other.y === car.y && other.x < car.x && car.x - other.x < 2)
      car.stopped = true;
    if (car.dir === "down" && other.x === car.x && other.y > car.y && other.y - car.y < 2)
      car.stopped = true;
    if (car.dir === "up" && other.x === car.x && other.y < car.y && car.y - other.y < 2)
      car.stopped = true;
  }

  if (!car.stopped) {
    car.progress += car.speed;
    if (car.progress >= 1) {
      car.progress = 0;
      if (car.dir === "right") car.x++;
      else if (car.dir === "left") car.x--;
      else if (car.dir === "up") car.y--;
      else if (car.dir === "down") car.y++;

      car.x = (car.x + cols) % cols;
      car.y = (car.y + rows) % rows;
    }
  }
}

let rx = car.x + (car.dir === "right" ? car.progress : car.dir === "left" ? -car.progress : 0);
let ry = car.y + (car.dir === "down" ? car.progress : car.dir === "up" ? -car.progress : 0);
rx = (rx + cols) % cols;
ry = (ry + rows) % rows;

fill(car.color);
rect(rx * cellSize, ry * cellSize, cellSize, cellSize);


}
}

function worldMouse() {
let wx = (mouseX - xOffset) / cellSize;
let wy = (mouseY - yOffset) / cellSize;
return { wx, wy };
}

function hitTestCar(wx, wy) {
for (let i = cars.length - 1; i >= 0; i--) {
let car = cars[i];
let rx = car.x + (car.dir === "right" ? car.progress : car.dir === "left" ? -car.progress : 0);
let ry = car.y + (car.dir === "down" ? car.progress : car.dir === "up" ? -car.progress : 0);
rx = (rx + cols) % cols;
ry = (ry + rows) % rows;
if (
wx >= rx &&
wx <= rx + 1 &&
wy >= ry &&
wy <= ry + 1
) {
return { car, rx, ry };
}
}
return null;
}

function hitTestSignal(wx, wy) {
for (let i = signals.length - 1; i >= 0; i--) {
let s = signals[i];
let sx = s.x + 0.3;
let sy = s.y + 0.3;
let sw = 0.4;
let sh = 0.4;
if (
wx >= sx &&
wx <= sx + sw &&
wy >= sy &&
wy <= sy + sh
) {
return { s, sx, sy };
}
}
return null;
}

function hitTestBuilding(wx, wy) {
for (let i = buildings.length - 1; i >= 0; i--) {
let b = buildings[i];
if (
wx >= b.x &&
wx <= b.x + b.w &&
wy >= b.y &&
wy <= b.y + b.h
) {
return { b };
}
}
return null;
}

function mousePressed() {
let m = worldMouse();
let wx = m.wx;
let wy = m.wy;

let carHit = hitTestCar(wx, wy);
if (carHit) {
dragTarget = carHit.car;
dragType = "car";
dragTarget.dragging = true;
dragOffsetX = wx - carHit.rx;
dragOffsetY = wy - carHit.ry;
return;
}

let sigHit = hitTestSignal(wx, wy);
if (sigHit) {
dragTarget = sigHit.s;
dragType = "signal";
dragOffsetX = wx - sigHit.s.x;
dragOffsetY = wy - sigHit.s.y;
return;
}

let bHit = hitTestBuilding(wx, wy);
if (bHit) {
dragTarget = bHit.b;
dragType = "building";
dragOffsetX = wx - bHit.b.x;
dragOffsetY = wy - bHit.b.y;
return;
}
}

function mouseDragged() {
if (!dragTarget) return;
let m = worldMouse();
let wx = m.wx;
let wy = m.wy;

if (dragType === "car") {
let car = dragTarget;
let nx = wx - dragOffsetX;
let ny = wy - dragOffsetY;
nx = constrain(nx, 0, cols - 1);
ny = constrain(ny, 0, rows - 1);
car.x = nx;
car.y = ny;
car.progress = 0;
} else if (dragType === "signal") {
let s = dragTarget;
let nx = wx - dragOffsetX;
let ny = wy - dragOffsetY;
nx = constrain(nx, 0, cols - 1);
ny = constrain(ny, 0, rows - 1);
s.x = nx;
s.y = ny;
} else if (dragType === "building") {
let b = dragTarget;
let nx = wx - dragOffsetX;
let ny = wy - dragOffsetY;
nx = constrain(nx, 0, cols - b.w);
ny = constrain(ny, 0, rows - b.h);
b.x = nx;
b.y = ny;
}
}

function mouseReleased() {
if (dragTarget && dragType === "car") {
dragTarget.dragging = false;
}
dragTarget = null;
dragType = "";
}

function windowResized() {
resizeCanvas(windowWidth, windowHeight);
resizeGrid();
}