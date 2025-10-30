let trackWidth = 32;
let gapWidth = 2;
let rotationSensitivity = 0.04; // 다이얼 휙휙 민감도
let maxHolesPerTrack = 56; //8배수가 예쁨
let minHolesPerTrack = 4;
let dampingFactor = 0.95; //1에 가까울수록 빙글빙글...

let baseColor;
let ringColor;
let centerColor;
let edgeColor;
let bgGradient;

let numTracks = 0;
let dialAngles = [];
let dragStartAngle = 0;
let dialAngleAtDragStart = 0;
let isDragging = false;
let currentTrack = -1;

let trackOuterR = [];
let trackInnerR = [];

let dialVelocities = [];
let lastAngleInDrag = 0;

let randomColorStart;
let randomColorEnd;

let holeRandomColors = [];

function setup() {
  let myCanvas = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove, { passive: false });
  window.addEventListener("pointerup", handlePointerUp);

  centerColor = color("#e15a4d");
  edgeColor = color("#cca595");
  baseColor = color("#df5d5960");
  ringColor = color("#d8908590");
  randomColorStart = color("#ce4238");
  randomColorEnd = color("#e55652");

  bgGradient = createGraphics(windowWidth, windowHeight);
  drawGradient(bgGradient);
  calculateTrackR();
  dotColors();
}

function dotColors() {
  holeRandomColors = [];
  for (let i = 0; i < numTracks; i++) {
    let thisTrackColors = [];
    let idealHoles;
    if (numTracks == 1) {
      idealHoles = 4;
    } else {
      idealHoles = map(i, 0, numTracks - 1, maxHolesPerTrack, minHolesPerTrack);
    }
    let currentNumHoles;
    if (i == numTracks - 1) {
      currentNumHoles = 4;
    } else {
      let symmetryFactor = 8;
      currentNumHoles = round(idealHoles / symmetryFactor) * symmetryFactor;
      if (currentNumHoles < 8) {
        currentNumHoles = 8;
      }
    }
    for (let j = 0; j < currentNumHoles; j++) {
      let randomAmount = random(1);
      let randomColor = lerpColor(
        randomColorStart,
        randomColorEnd,
        randomAmount
      );
      thisTrackColors.push(randomColor);
    }
    holeRandomColors.push(thisTrackColors);
  }
}

function calculateTrackR() {
  trackOuterR = [];
  trackInnerR = [];
  dialAngles = [];
  dialVelocities = [];

  let maxOuterRadius = dist(width / 2, height / 2, 0, 0);
  let minInnerRadius = 22;
  let currentOuterRadius = maxOuterRadius;
  numTracks = 0;

  while (currentOuterRadius > minInnerRadius) {
    let outerRR = currentOuterRadius;
    let innerRR = currentOuterRadius - trackWidth;
    if (innerRR < minInnerRadius) {
      innerRR = minInnerRadius;
    }
    trackOuterR.push(outerRR);
    trackInnerR.push(innerRR);
    dialAngles.push(0);
    dialVelocities.push(0);
    numTracks++;
    currentOuterRadius = innerRR - gapWidth;
    if (trackWidth + gapWidth <= 0 || numTracks > 200) {
      break;
    }
    if (innerRR == minInnerRadius) {
      break;
    }
  }
}

function draw() {
  updatePhysics();
  image(bgGradient, 0, 0);
  drawDial();
}

function drawDial() {
  push();
  translate(width / 2, height / 2);

  if (numTracks > 0) {
    fill(baseColor);
    noStroke();
    ellipse(0, 0, trackOuterR[0] * 2, trackOuterR[0] * 2);
  }

  for (let i = 0; i < numTracks; i++) {
    let trackDisplayRadius = (trackOuterR[i] + trackInnerR[i]) / 2;
    if (!holeRandomColors[i]) continue;
    let currentNumHoles = holeRandomColors[i].length;

    push();
    rotate(dialAngles[i]);
    stroke(ringColor);
    strokeWeight(1);
    noFill();
    ellipse(0, 0, trackDisplayRadius * 2, trackDisplayRadius * 2);
    let holeDiameter = trackWidth * 0.6;
    noStroke();
    for (let j = 0; j < currentNumHoles; j++) {
      let angle = map(j, 0, currentNumHoles, 0, 360);
      let holeX = trackDisplayRadius * cos(angle);
      let holeY = trackDisplayRadius * sin(angle);
      fill(holeRandomColors[i][j]);
      ellipse(holeX, holeY, holeDiameter, holeDiameter);
    }
    pop();
  }
  pop();
}

function updatePhysics() {
  for (let i = 0; i < numTracks; i++) {
    if (isDragging && currentTrack == i) {
      continue;
    }
    dialAngles[i] += dialVelocities[i];
    dialVelocities[i] *= dampingFactor;
    if (abs(dialVelocities[i]) < 0.01) {
      dialVelocities[i] = 0;
    }
  }
}

function handlePointerDown(event) {
  console.log("Pointer Down");

  let d = dist(event.clientX, event.clientY, width / 2, height / 2);
  currentTrack = -1;

  for (let i = 0; i < numTracks; i++) {
    if (d < trackOuterR[i] && d > trackInnerR[i]) {
      isDragging = true;
      currentTrack = i;
      dragStartAngle = degrees(
        atan2(event.clientY - height / 2, event.clientX - width / 2)
      );
      dialAngleAtDragStart = dialAngles[currentTrack];
      dialVelocities[currentTrack] = 0;
      lastAngleInDrag = dialAngles[currentTrack];
      break;
    }
  }
}

function handlePointerMove(event) {
  if (!isDragging || currentTrack == -1) return;

  event.preventDefault();

  let currentAngle = degrees(
    atan2(event.clientY - height / 2, event.clientX - width / 2)
  );

  let deltaAngle = currentAngle - dragStartAngle;
  let adjustedDelta = deltaAngle * rotationSensitivity;
  let newAngle = dialAngleAtDragStart + adjustedDelta;

  let newVelocity = newAngle - lastAngleInDrag;

  dialVelocities[currentTrack] = newVelocity;
  dialAngles[currentTrack] = newAngle;
  lastAngleInDrag = newAngle;
}

function handlePointerUp(event) {
  if (isDragging) {
    console.log("Pointer Up");
  }

  isDragging = false;
  currentTrack = -1;
}

function drawGradient(pg) {
  let ctx = pg.drawingContext;
  let cx = pg.width / 2;
  let cy = pg.height / 2;
  let r0 = 0;
  let r1 = dist(0, 0, cx, cy);
  let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r1);
  grad.addColorStop(0, centerColor.toString());
  grad.addColorStop(1, edgeColor.toString());
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, pg.width, pg.height);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bgGradient = createGraphics(windowWidth, windowHeight);
  drawGradient(bgGradient);
  calculateTrackR();
  dotColors();
}
