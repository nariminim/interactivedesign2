/**
 * Page 2: SVG Bunny Interaction (토끼 패턴)
 * 수정: 튀어나온 선(MouseConstraint) 제거, 토끼 4배 크게, 색상 팔레트 변경
 */

// Matter.js 모듈
const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Bodies = Matter.Bodies;
const MatterBody = Matter.Body; // 이름 변경
const Vertices = Matter.Vertices;
const Common = Matter.Common;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Bounds = Matter.Bounds;

let engine;
let world;
let elements = []; // 토끼 바디 배열
let boundaries = [];
let mouseConstraint;
let canvas;

const bunnyPathData = "M46.13,124.88c.25,2.19,1.39,6.25,2.67,9.76.95,2.59,2.35,4.99,4.12,7.1,5.07,6.05,12.64,18.32,16.35,11.43,2.38-4.93,1.15-10.19.89-15.45,0-.68.93.47,1.33,1.38,1.62,3.73,6.26,7.61,7.65,8.58,3.58,2.49,8.16,3,10.26,4.49,1.33,1.3,1.51,2.52,2.68,4.65,7.67,16.44,8.18,16.98,6.15,33.53-.02.2-.02.38,0,.52.06.15-.03.21.31.33.46.02.5-.03.8-.06,15.68-2.11,7.56,18.64-1.18,20.75-2.52.73-5.2-.03-7.6,1.25-4.76,2.25-6.57,4.84-11.09,6.56-12.32,4.41-25.81-.38-36.96-.99-4.85-.1-10.15,1.83-15.21,1.65-4.87-.03-12.97-1.21-15.78-4.77-3.41-4.13,2.18-9.8,13.39-12.72.06-.04.07-.08.06-.12-1.33-.97-4.15-1.5-6.1-2.46-2.92-1.21-6.91-3.22-7.66-6.12-1-3.85,1.12-6.67,4.31-7.41,1.82-.52,3.84-.6,5.75-.52.75.02,1.61.23,1.86-.39,1.2-5.79-3.27-10.09-3.94-15.65-.09-.52-.34-.66-.82-.45-3.2,1.55-6.66,1.74-9.91-.06-4.23-2.02-4.55-16.12-4.3-18.66,1.14-6.1,6.71-12.87,9.39-17.84.24-.43.28-.85.23-1.32-.55-5.04,2.67-14.17.44-18.79-.95-1.49-5.38-3.03-7.48-4.63-4.28-3.32-8.46-9.45-6.05-14.99.61.5-.63,6.41,3.63,9.32.97.67,1.99,1.12,3.06,1.31.39-.02.36-.07.53-.18.57-.66,1.5-1.58.34-1.51-3.22-.08-5.83-4.23-3.28-6.37.76-.73,2.01-.35,2.81-.87.4-.29.38-.93.35-1.38-.11-.34-.13-.26-.24-.34-1.19-.04-3.46.4-4.39.44-.25.03-.53-.06-.74-.21-4.11-3.74,3.74-10.99,6.76-13.74,9.86-8.62,31.22-5.03,41.38,1.9,6.9,5.1,9.96,14.32,15.12,20.86,8.3,10.47,18.66,17.51,23.78,31.17,2.75,6.96,4.6,19.57-7.11,13.94-13.32-6.27-13.26-22.7-19.07-33.53-.46-.97-.35-2.02-1.57-1.99-.63.06-.84.22-.72.8,3.7,12.12,10.85,39.25,4.94,40.12-.28.04-.66.16-.84.04-.38-.21-1.19-1.05-2.22-2.21-3.25-3.71-7.45-8.93-10.12-12.68-1.15-1.59-3.8-9.14-4.68-13.33-.65-3.59-.17-10.44-.31-17.14-.02-1.37.05-2.3-.04-2.47-.2-.03-1.62-.2-1.79.14,0,6.13-.69,13.08-.18,19.18l.02.14ZM32.1,90.33c-1.53-1.79-9.11-.5-8.03,3.28.1.42.4.25,1.11.49,1.24.29,3.05.81,4.28,1.05,1.62-.45,3.43-3.06,2.68-4.76l-.04-.07Z M123.06,17.8c6.21-5.81,8.49-16.47,18.27-17.35,2.9-.66,4.7,2.48,5.2,4.91,3.27,15.22-14.99,35.02-25.78,43.32-.42.35-.26.9-.13,1.36.64,2.55,2.22,9.02,2.63,10.62,4.92,4.77,13.02,2.47,19.16,3.39,12.14,1.89,31.98,10.6,41.49,21.57,4.23,5.39,6.6,11.75,8.21,18.3.73,2.78,1.16,5.74,1.82,8.52.19.49.85.37,1.29.37,13.82-.92,7.55,15.94,0,20.05-2.03,1.14-4.43,1.6-6.61,2.4-5.09,1.67-3.62,4.04-5.72,7.81-10.3,9.98-28.39,5.95-41.47,5.35-6.64-2.37-2.11-8.11-.68-11.7,0-.47-.56-.58-.97-.63-2.49-.14-4.19-2.9-6.63-3.01-3.38.75-4.42,6-6.49,8.38-2.11,2.43-5.28,3.72-8.03,5.43-1.48.78-2.89,1.71-4.5,2.06-4.02.5-16.47.59-13.62-6.26.83-1.74-.36-1.78-1.6-2.38-1.25-.61-2.03-1.42-1.89-3,.47-2.23.89-4.58,2.39-6.28,1.72-1.34,5.59-1.27,6.94-4.76,1.24-2.47.53-5.18-1.39-7.13-14.52-9.15-15.76-23.19-16.26-39.08.06-1.34-1.52-1.28-2.47-1.78-9.12-3.52-14.84-12.06-11.33-22.85,1.14-3.35,3.45-7.07,5.51-10.1,1.27-2.01,3.11-3.53,5.45-4.33,2.57-1.1,5.99-.95,7.56-3.61,1.26-1.65,4.31-1.36,5.5-3.05,2.35-3.79,3.45-20.99,10.15-25.52,3.94-2.72,14.47-14.2,17.52-5.81-.51,3.34-3.55,13.28-3.57,14.83l.07-.05ZM96.11,56.03c1.46.16,3.3.13,4.62-.52,2.02-.8,3.42-4.79.22-5.45-2.25-.23-4.38,2.29-5.12,4.08-.27.8-.47,1.53.16,1.87l.12.02ZM82.69,61.88c-1.52.26-3.2.77-4.79.59-.98-.02-3.23-.97-2.85.93.62,2.21,2.75,5.47,3.66,6.89.06.05.18.14.23.19,2.03.36,4.62.33,6.64.54,1.05.31-2.66-1.82-4.69-3.25-.5-.35-1.2-.74-1.58-1.08-.11-.12-.15-.28-.12-.45.66-1.13,2.99-3.37,3.61-4.18.02-.05.03-.11-.03-.14l-.09-.02Z";

let bunnyVertices;
let bunnyScale = 1.6; // 4배 크게 (0.4 * 4)
let bunnyBounds;

// --- 색상 팔레트 (수정) ---
const palettes = [{
    bg: '#000000',
    bunny: '#FFFFFF'
  }, // 0. 블랙
  {
    bg: '#096641',
    bunny: '#F9F7F3'
  }, // 1. 초록
  {
    bg: '#F9C74F',
    bunny: '#F9F7F3'
  } // 2. 노랑 (토끼 흰색)
];
let paletteIndex = 0; // 기본 블랙톤
let currentColors = palettes[paletteIndex];

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);

  engine = Engine.create();
  world = engine.world;
  Common.setDecomp(decomp);

  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  let options = {
    mouse: canvasMouse,
    constraint: {
      stiffness: 0.1,
      render: {
        visible: false
      }
    } // <-- 선 안보이게!
  };
  mouseConstraint = MouseConstraint.create(engine, options);
  Composite.add(world, mouseConstraint);

  addBoundaries();

  // --- SVG 파싱 ---
  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.innerHTML = `<path d="${bunnyPathData}"></path>`;
  let pathElement = svg.querySelector('path');

  if (!pathElement || typeof Matter.Svg === 'undefined' || typeof decomp === 'undefined') {
    console.error("SVG 파싱 라이브러리(pathseg, poly-decomp)가 로드되지 않았거나 경로를 찾을 수 없습니다.");
    return;
  }

  let vertices = Matter.Svg.pathToVertices(pathElement, 30);
  if (!vertices || vertices.length === 0) {
    console.error("SVG 경로에서 꼭짓점을 추출하지 못했습니다.");
    return;
  }

  bunnyVertices = Vertices.scale(vertices, bunnyScale, bunnyScale);
  bunnyBounds = Bounds.create(bunnyVertices);
  let bunnyWidth = bunnyBounds.max.x - bunnyBounds.min.x;
  let bunnyHeight = bunnyBounds.max.y - bunnyBounds.min.y;

  // --- 토끼 패턴 생성 (개수 증가) ---
  let cols = 5; // 크기가 커져서 개수 조절
  let rows = 3; // 크기가 커져서 개수 조절
  let spacingX = 20;
  let spacingY = 20;

  let totalGridWidth = cols * (bunnyWidth + spacingX) - spacingX;
  let totalGridHeight = rows * (bunnyHeight + spacingY) - spacingY;
  let startX = (width - totalGridWidth) / 2;
  let startY = (height - totalGridHeight) / 2;

  let bunnyStack = Composites.stack(
    startX, startY,
    cols, rows,
    spacingX, spacingY,
    (x, y) => {
      let bodyX = x + bunnyWidth / 2 + bunnyBounds.min.x;
      let bodyY = y + bunnyHeight / 2 + bunnyBounds.min.y;

      let body = Bodies.fromVertices(
        bodyX, bodyY,
        [bunnyVertices], {
          restitution: 0.8,
          friction: 0.05,
          render: {
            fillStyle: currentColors.bunny,
            strokeStyle: 'none' // 선 없음
          }
        },
        true
      );

      if (!body) {
        console.warn("Could not create bunny body at", x, y);
      }
      return body;
    }
  );

  elements = bunnyStack.bodies.filter(body => body);
  Composite.add(world, bunnyStack);
}

function draw() {
  background(currentColors.bg);
  Engine.update(engine);

  // --- p5.js로 토끼 그리기 ---
  for (let i = 0; i < elements.length; i++) {
    let body = elements[i];
    let pos = body.position;
    let angle = body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);

    fill(body.render.fillStyle);
    noStroke(); // <-- 튀어나온 선 제거!

    if (body.parts && body.parts.length > 1) {
      for (let j = 1; j < body.parts.length; j++) {
        let part = body.parts[j];
        beginShape();
        for (let k = 0; k < part.vertices.length; k++) {
          vertex(part.vertices[k].x - pos.x, part.vertices[k].y - pos.y);
        }
        endShape(CLOSE);
      }
    } else {
      beginShape();
      for (let j = 0; j < body.vertices.length; j++) {
        vertex(body.vertices[j].x - pos.x, body.vertices[j].y - pos.y);
      }
      endShape(CLOSE);
    }
    pop();
  }
}

// 경계 생성 함수
function addBoundaries() {
  let thickness = 50;
  boundaries.push(Bodies.rectangle(width / 2, height + thickness / 2, width * 2, thickness, {
    isStatic: true,
    label: "ground"
  }));
  boundaries.push(Bodies.rectangle(width / 2, -thickness / 2, width * 2, thickness, {
    isStatic: true,
    label: "ceiling"
  }));
  boundaries.push(Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, {
    isStatic: true,
    label: "leftWall"
  }));
  boundaries.push(Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, {
    isStatic: true,
    label: "rightWall"
  }));
  Composite.add(world, boundaries);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  Composite.remove(world, boundaries);
  boundaries = [];
  addBoundaries();

  if (mouseConstraint.mouse) {
    Mouse.setScale(mouseConstraint.mouse, {
      x: 1,
      y: 1
    });
    Mouse.setOffset(mouseConstraint.mouse, {
      x: 0,
      y: 0
    });
  }
}

// 클릭 시 색상 팔레트 변경
function mousePressed() {
  if (!mouseConstraint.body) {
    paletteIndex = (paletteIndex + 1) % palettes.length;
    currentColors = palettes[paletteIndex];

    for (let body of elements) {
      body.render.fillStyle = currentColors.bunny;
    }
  }
}

// p5 이벤트 기본 동작 방지
function mouseDragged() {
  return false;
}

function touchMoved() {
  return false;
}