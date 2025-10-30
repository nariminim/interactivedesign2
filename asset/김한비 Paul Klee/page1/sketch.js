let w = 1200;
let h = 600;
let mint, skyBlue, brown, thinMint;
let baseMint, baseSkyBlue, baseBrown, baseThinMint;
let sun, moon;
let alpha = 0;
let paper;

function preload() {
  paper = loadImage("asset/paper.jpg");
}

function setup() {
  createCanvas(w, h);
  background(161, 209, 212);

  baseMint = color(178, 206, 196);
  baseSkyBlue = color(167, 207, 217);
  baseBrown = color(191, 187, 176);
  baseThinMint = color(190, 210, 202);
  mint = baseMint;
  skyBlue = baseSkyBlue;
  brown = baseBrown;
  thinMint = baseThinMint;
  sun = color(221, 157, 166);
  moon = sun;
}

function draw() {
  print(alpha);
  noStroke();
  //하늘(mint, skyBlue, brown, thinMint)
  for (let i = 0; i < 6; i++) {
    fill(mint);
    rect(0, 0 + h * 0.1 * i, w, h * 0.03);
  }
  for (let i = 0; i < 6; i++) {
    fill(skyBlue);
    rect(0, h * 0.03 + h * 0.1 * i, w, h * 0.03);
  }
  for (let i = 0; i < 6; i++) {
    fill(brown);
    rect(0, h * 0.03 * 2 + h * 0.1 * i, w, h * 0.03);
  }
  for (let i = 0; i < 7; i++) {
    fill(thinMint);
    rect(0, h * 0.03 * 2 + h * 0.1 * i, w, h * 0.01);
  }
  //태양
  fill(moon);
  rect(0, h * 0.15, w, h * 0.03);
  //바다
  fill(7, 21, 4);
  rect(0, h * 0.6, w, h * 0.03);
  fill(39, 48, 147);
  rect(0, h * 0.6 + h * 0.03, w, h * 0.03);
  fill(83, 139, 191);
  rect(0, h * 0.6 + h * 0.03 * 2, w, h * 0.03);
  fill(181, 194, 184);
  rect(0, h * 0.6 + h * 0.03 * 3, w, h * 0.03);
  fill(135, 156, 189);
  rect(0, h * 0.6 + h * 0.03 * 4, w, h * 0.03);
  fill(196, 216, 220);
  rect(0, h * 0.6 + h * 0.03 * 5, w, h * 0.03);
  fill(216, 218, 210);
  rect(0, h * 0.6 + h * 0.03 * 6, w, h * 0.03);
  fill(180, 208, 211);
  rect(0, h * 0.6 + h * 0.03 * 7, w, h * 0.03);
  //도시-----------------------------------------
  fill(177, 178, 166);
  rect(0, h * 0.6 + h * 0.03 * 8, w, h * 0.03);
  fill(181, 162, 161);
  rect(0, h * 0.6 + h * 0.03 * 9, w, h * 0.03);
  fill(156, 194, 211);
  rect(0, h * 0.6 + h * 0.03 * 10, w, h * 0.03);
  fill(164, 172, 196);
  rect(0, h * 0.6 + h * 0.03 * 11, w, h * 0.03);
  fill(160, 187, 201);
  rect(0, h * 0.6 + h * 0.03 * 12, w, h * 0.03);
  fill(216, 174, 187);
  rect(0, h * 0.6 + h * 0.03 * 13, w, h * 0.03);
  //건물------------------------------------------
  stroke(177, 128, 126);
  strokeWeight(1.5);
  fill(204, 148, 129);
  rect(50, h - h * 0.15, w * 0.1, h * 0.15);
  fill(217, 171, 184);
  rect(70, h - h * 0.1 - 10, w * 0.1, h * 0.1 + 10);
  fill(96, 130, 127); //----------------------
  rect(250, h - h * 0.15, w * 0.1, h * 0.15);
  fill(170, 172, 160);
  rect(270, h - h * 0.1, w * 0.1, h * 0.1);
  fill(150, 188, 176); //----------------------
  rect(580, h - h * 0.15, w * 0.1, h * 0.15);
  fill(176, 167, 155);
  rect(570, h - h * 0.1, w * 0.1, h * 0.1);
  fill(217, 177, 189); //----------------------
  rect(890, h - h * 0.15, w * 0.1, h * 0.15);
  fill(147, 194, 205);
  rect(870, h - h * 0.1 - 10, w * 0.1, h * 0.1 + 10);

  fill(143, 198, 195);
  rect(0, h - h * 0.03, w * 0.4, h * 0.03);

  fill(161, 183, 201);
  rect(w * 0.2, h - h * 0.03, w * 0.4, h * 0.03);
  fill(179, 167, 158);
  rect(w * 0.5, h - h * 0.03, w * 0.4, h * 0.03);
  fill(173, 204, 192);
  rect(w * 0.8, h - h * 0.03, w * 0.4, h * 0.03);
  //어둠
  noStroke();
  fill(0, alpha);
  rect(0, h * 0.6, w, h);
  // texture
  tint(255, 30);
  image(paper, 0, 0, 1200, 600);
  noTint();
}

function touchStarted() {
  lastY = touches[0].y;
}

function touchMoved() {
  if (touches.length > 0 && touches[0].y < h * 0.6) {
    // movedY : 위로 움직이면 음수....사용보류
    let deltaY = touches[0].y - lastY;
    alpha -= deltaY * 0.3;
    alpha = constrain(alpha, 0, 100);
    lastY = touches[0].y;

    let t = alpha / 100;

    mint = lerpColor(baseMint, color(112, 113, 180), t);
    skyBlue = lerpColor(baseSkyBlue, color(131, 158, 172), t);
    brown = lerpColor(baseBrown, color(142, 155, 150), t);
    thinMint = lerpColor(baseThinMint, color(143, 144, 194), t);
    moon = lerpColor(sun, color(246, 207, 95), t);
  }

  return false;
}
