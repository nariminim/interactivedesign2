let canvas;
let lines = [];
let animationSpeedMode1 = 15;
let animationSpeedMode2 = 13;

let pressStart = 0;
let pressStartX = 0;
let pressStartY = 0;
let pressing = false;
const pressTime = 200;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
  canvas.elt.addEventListener("contextmenu", (e) => e.preventDefault());

  pressing = false;
}

function pointerDown(event) {
  if (event.offsetY < 50) {
    return;
  }

  pressing = true;
  pressStart = millis();
  pressStartX = event.offsetX;
  pressStartY = event.offsetY;
  console.log("pointer down, mode: ", pressStartX, pressStartY);
}

function pointerMove(event) {
  event.preventDefault();
}

function pointerUp(event) {
  if (!pressing) {
    return;
  }
  let pressDuration = millis() - pressStart;
  let newMode;

  if (pressDuration >= pressTime) {
    newMode = "circle";
  } else {
    newMode = "line";
  }

  let angle1 = random(315, 360);
  let angle2 = random(270, 314);
  let angle3 = random(225, 269);
  let angle4 = random(181, 224);

  lines.push({
    mode: newMode,
    x: pressStartX,
    y: pressStartY,
    angles: [angle1, angle2, angle3, angle4],
    //모션 상태 추가
    currentY: pressStartY,
    currentLength: 0,
  });
  console.log("pointer up");
  pressing = false;
}

function draw() {
  background("#141c2f");

  let fullLength = max(width, height) * 1.5;
  for (let t of lines) {
    let currentSpeed;
    if (t.mode === "line") {
      currentSpeed = animationSpeedMode1;
    } else {
      currentSpeed = animationSpeedMode2;
    }

    t.currentY = min(t.currentY + currentSpeed, height);
    t.currentLength = min(t.currentLength + currentSpeed, fullLength);

    stroke("#5b717e");
    strokeWeight(3);
    noFill();
    line(t.x, t.y, t.x, t.currentY);

    if (t.mode === "line") {
      for (let angle of t.angles) {
        let x2 = t.x + t.currentLength * cos(angle);
        let y2 = t.y + t.currentLength * sin(angle);
        line(t.x, t.y, x2, y2);
      }
    } else if (t.mode === "circle") {
      fill("#5b717e");
      noStroke();
      circle(t.x, t.y, 12);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* 혹시몰라...
let canvas;
let lines = [];
let animationSpeedMode1 = 15;
let animationSpeedMode2 = 13;

let currentMode = "line";
let btnLine, btnCircle;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  btnLine = createButton("Mode 1");
  btnLine.position(10, 10);
  btnLine.mousePressed(setModeLine);

  btnCircle = createButton("Mode 2");
  btnCircle.position(150, 10);
  btnCircle.mousePressed(setModeCircle);

  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
}

function setModeLine() {
  currentMode = "line";
  console.log("Mode set to: " + currentMode);
}

function setModeCircle() {
  currentMode = "circle";
  console.log("Mode set to: " + currentMode);
}

function pointerDown(event) {
  if (event.offsetY < 50) {
    return;
  }

  let angle1 = random(315, 360);
  let angle2 = random(270, 314);
  let angle3 = random(225, 269);
  let angle4 = random(181, 224);

  lines.push({
    mode: currentMode,
    x: event.offsetX,
    y: event.offsetY,
    angles: [angle1, angle2, angle3, angle4],
    //모션 상태 추가
    currentY: event.offsetY,
    currentLength: 0,
  });
  console.log("pointer down, mode: " + currentMode);
}

function pointerMove(event) {
  event.preventDefault();
}

function pointerUp(event) {
  console.log("pointer up");
}

function draw() {
  background("#141c2f");

  let fullLength = max(width, height) * 1.5;
  for (let t of lines) {
    let currentSpeed;
    if (t.mode === "line") {
      currentSpeed = animationSpeedMode1;
    } else {
      currentSpeed = animationSpeedMode2;
    }

    t.currentY = min(t.currentY + currentSpeed, height);
    t.currentLength = min(t.currentLength + currentSpeed, fullLength);

    stroke("#5b717e");
    strokeWeight(3);
    noFill();
    line(t.x, t.y, t.x, t.currentY);

    if (t.mode === "line") {
      for (let angle of t.angles) {
        let x2 = t.x + t.currentLength * cos(angle);
        let y2 = t.y + t.currentLength * sin(angle);
        line(t.x, t.y, x2, y2);
      }
    } else if (t.mode === "circle") {
      fill("#5b717e");
      noStroke();
      circle(t.x, t.y, 12);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
*/

/* 
1탄 (그냥 선 생성)
let canvas;
let lines = [];

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
}

function pointerDown(event) {
  lines.push({
    x: event.offsetX,
    y: event.offsetY,
  });
  console.log("pointer down");
}

function pointerMove(event) {
  event.preventDefault();
}

function pointerUp(event) {
  console.log("pointer up");
}

function draw() {
  background(20);
  stroke(255);
  strokeWeight(2);

  for (let t of lines) {
    line(t.x, t.y, t.x, height);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
*/

/*
2탄 (모션 이전)

let canvas;
let lines = [];
let animationSpeed = 10;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
}

function pointerDown(event) {
  let angle1 = random(315, 360);
  let angle2 = random(270, 314);
  let angle3 = random(225, 269);
  let angle4 = random(181, 224);

  lines.push({
    x: event.offsetX,
    y: event.offsetY,
    angles: [angle1, angle2, angle3, angle4],
  });
  console.log("pointer down");
}

function pointerMove(event) {
  event.preventDefault();
}

function pointerUp(event) {
  console.log("pointer up");
}

function draw() {
  background(20);
  stroke(255);
  strokeWeight(2);

  let lineLength = max(width, height) * 1.5;
  for (let t of lines) {
    line(t.x, t.y, t.x, height);

    for (let angle of t.angles) {
      let x2 = t.x + lineLength * cos(angle);
      let y2 = t.y + lineLength * sin(angle);

      line(t.x, t.y, x2, y2);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
  */

/*
3탄 (모드전환 이전)
let canvas;
let lines = [];
let animationSpeed = 15;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
}

function pointerDown(event) {
  let angle1 = random(315, 360);
  let angle2 = random(270, 314);
  let angle3 = random(225, 269);
  let angle4 = random(181, 224);

  lines.push({
    x: event.offsetX,
    y: event.offsetY,
    angles: [angle1, angle2, angle3, angle4],
    //모션 상태 추가
    currentY: event.offsetY,
    currentLength: 0,
  });
  console.log("pointer down");
}

function pointerMove(event) {
  event.preventDefault();
}

function pointerUp(event) {
  console.log("pointer up");
}

function draw() {
  background(20);
  stroke(255);
  strokeWeight(2);

  let fullLength = max(width, height) * 1.5;
  for (let t of lines) {
    t.currentY = min(t.currentY + animationSpeed, height);
    line(t.x, t.y, t.x, t.currentY);

    t.currentLength = min(t.currentLength + animationSpeed, fullLength);

    for (let angle of t.angles) {
      let x2 = t.x + t.currentLength * cos(angle);
      let y2 = t.y + t.currentLength * sin(angle);

      line(t.x, t.y, x2, y2);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* 
1탄 (그냥 선 생성)
let canvas;
let lines = [];

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
}

function pointerDown(event) {
  lines.push({
    x: event.offsetX,
    y: event.offsetY,
  });
  console.log("pointer down");
}

function pointerMove(event) {
  event.preventDefault();
}

function pointerUp(event) {
  console.log("pointer up");
}

function draw() {
  background(20);
  stroke(255);
  strokeWeight(2);

  for (let t of lines) {
    line(t.x, t.y, t.x, height);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
*/

/*
2탄 (모션 이전)

let canvas;
let lines = [];
let animationSpeed = 10;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);
}

function pointerDown(event) {
  let angle1 = random(315, 360);
  let angle2 = random(270, 314);
  let angle3 = random(225, 269);
  let angle4 = random(181, 224);

  lines.push({
    x: event.offsetX,
    y: event.offsetY,
    angles: [angle1, angle2, angle3, angle4],
  });
  console.log("pointer down");
}

function pointerMove(event) {
  event.preventDefault();
}

function pointerUp(event) {
  console.log("pointer up");
}

function draw() {
  background(20);
  stroke(255);
  strokeWeight(2);

  let lineLength = max(width, height) * 1.5;
  for (let t of lines) {
    line(t.x, t.y, t.x, height);

    for (let angle of t.angles) {
      let x2 = t.x + lineLength * cos(angle);
      let y2 = t.y + lineLength * sin(angle);

      line(t.x, t.y, x2, y2);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
  */
