/* 
  참고: 이미지 스트립 분할 방식과 움직임은 
  OpenProcessing 스케치(https://openprocessing.org/sketch/2722921)에서 착안했습니다.
*/
let page, pageR, pageBack;
let strips = [];
let stripsR = [];
let stripsBack = [];
let num = 1;
let offset = 0;
let toff = 0;
let tilt = 0;
let ttilt = 0;

let blackImage;
let redImage;
let backImage;

let canvas;
let pointers = new Map(); // p5의 map 함수와 다른 js 의 map 객체

function preload() {
  blackImage = loadImage("assets/black.png");
  redImage = loadImage("assets/red.png");
  backImage = loadImage("assets/back.png");
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  page = createGraphics(width, height);
  pageR = createGraphics(width, height);
  pageBack = createGraphics(width, height);

  // canvas element
  canvas.elt.addEventListener("pointerdown", pointerDown);
  canvas.elt.addEventListener("pointermove", pointerMove);
  canvas.elt.addEventListener("pointerup", pointerUp);

  makeBlack();
  makeRed();
}

function makeBlack() {
  page.clear();
  page.push();
  page.imageMode(CENTER);

  page.image(
    blackImage,
    width / 2,
    height / 2,
    blackImage.width / 2,
    blackImage.height / 2
  );
  page.pop();

  rectMode(CENTER);
  strips = [];
  for (let i = 0; i < num; i++) {
    let y = (i * page.height) / num;
    let strip = page.get(0, y, page.width, floor(page.height / num));
    strips.push({
      x: width / 2,
      y: y + page.height / (2 * num) + (height / 2 - page.height / 2),
      img: strip,
      a: 0,
    });
  }
}

function makeRed() {
  pageR.clear();

  pageR.push();
  pageR.imageMode(CENTER);
  pageR.image(
    redImage,
    width / 2,
    height / 2,
    redImage.width / 2,
    redImage.height / 2
  );
  pageR.pop();

  rectMode(CENTER);
  stripsR = [];
  for (let i = 0; i < num; i++) {
    let y = (i * pageR.height) / num;
    let stripR = pageR.get(0, y, pageR.width, floor(pageR.height / num));
    stripsR.push({
      x: width / 2,
      y: y + pageR.height / (2 * num) + (height / 2 - pageR.height / 2),
      img: stripR,
      a: 0,
    });
  }
}

function draw() {
  offset = lerp(offset, toff, 0.1);
  tilt = lerp(tilt, ttilt, 0.2);
  background("#eae5e1");
  imageMode(CENTER);

  for (let s of strips) {
    s.a = tilt * (0.5 - noise(frameCount / 60 + s.y / 300));
  }
  for (let s of strips) {
    push();
    translate(s.x + offset * (0.5 - noise(frameCount / 180 + s.y / 50)), s.y);
    rotate(s.a);
    image(s.img, 0, 0);
    pop();
  }

  for (let s of stripsR) {
    s.a = -tilt * 0.9 * (0.5 - noise(frameCount / 60 + s.y / 300));
  }
  for (let s of stripsR) {
    push();
    translate(
      s.x - offset * 0.8 * (0.5 - noise(frameCount / 180 + s.y / 50)), // offset도 반대로, 약하게
      s.y
    );
    rotate(s.a);
    image(s.img, 0, 0);
    pop();
  }
}

function pointerDown(event) {
  print("pointer down");

  pointers.set(event.pointerId, {
    x: event.offsetX,
    y: event.offsetY,
    pressur: event.pressure,
    tX: event.tiltX,
    tY: event.tiltY,
    w: event.width,
    h: event.height,
  });

  num = floor(random(20, 120));
  makeBlack();
  makeRed();
}

function pointerMove(event) {
  print("pointer move");

  // 좌표값 업데이트
  if (pointers.has(event.pointerId)) {
    pointers.set(event.pointerId, {
      x: event.offsetX,
      y: event.offsetY,
      pressur: event.pressure,
      tX: event.tiltX,
      tY: event.tiltY,
      w: event.width,
      h: event.height,
    });
  }

  if (pointers.size > 0) {
    for (let [id, pos] of pointers) {
      // map 객체 순회

      if (num == 1) {
        num = 40;
        makeBlack();
        makeRed();
      }
      toff = map(pos.x, width / 8, (7 * width) / 8, -height, height, true);
      if (abs(toff) < height / 8) {
        toff = 0;
      }
      ttilt = map(pos.y, height / 8, (7 * height) / 8, 0, PI / 4, true);
    }
  }
}

function pointerUp(event) {
  print("pointer up");
  pointers.delete(event.pointerId);
  // num = 1;
  toff = 0;
  tilt = 0;
  ttilt = 0;
  makeBlack();
  makeRed();
  return false;
}
