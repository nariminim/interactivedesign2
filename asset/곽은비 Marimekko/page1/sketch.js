var Engine = Matter.Engine;
var World = Matter.World;
var Bodies = Matter.Bodies;
var Events = Matter.Events;

var engine, world;
var circles = [];
var MAX_BALLS = 250;

var PALETTE = ["#000000", "#0C1B5E", "#F4E34C"]; // 검정, 남색, 노랑
var spawnIndex = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1.0;

  makeBoundaries();

  // 충돌 시 색 순환
  Events.on(engine, "collisionStart", function (evt) {
    for (var i = 0; i < evt.pairs.length; i++) {
      var p = evt.pairs[i];
      cycleColorIfCircle(p.bodyA);
      cycleColorIfCircle(p.bodyB);
    }
  });
}

function makeBoundaries() {
  var t = 60;
  var ground = Bodies.rectangle(width / 2, height + t / 2, width * 2, t, {
    isStatic: true,
  });
  var left = Bodies.rectangle(-t / 2, height / 2, t, height * 2, {
    isStatic: true,
  });
  var right = Bodies.rectangle(width + t / 2, height / 2, t, height * 2, {
    isStatic: true,
  });
  World.add(world, [ground, left, right]);
}

function draw() {
  background(255);
  Engine.update(engine, 1000 / 60);

  noStroke();
  for (var i = 0; i < circles.length; i++) {
    var c = circles[i],
      pos = c.body.position;
    fill(PALETTE[c.colorIndex]);
    circle(pos.x, pos.y, c.r * 2);
  }

  // 바닥 아래로 사라진 원 제거
  for (var j = circles.length - 1; j >= 0; j--) {
    var cc = circles[j];
    if (cc.body.position.y - cc.r > height + 300) {
      World.remove(world, cc.body);
      circles.splice(j, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function cycleColorIfCircle(body) {
  if (!body || body.label !== "dot") return;
  for (var i = 0; i < circles.length; i++) {
    if (circles[i].body === body) {
      circles[i].colorIndex = (circles[i].colorIndex + 1) % PALETTE.length;
      break;
    }
  }
}

function spawnCircle(x) {
  var r = random(24, 42);
  var startX = constrain(x + random(-8, 8), r + 6, width - r - 6);
  var startY = -r - 10;

  var body = Bodies.circle(startX, startY, r, {
    restitution: 0.45,
    friction: 0.02,
    frictionAir: 0.0025,
    label: "dot",
  });

  var c = { body: body, r: r, colorIndex: spawnIndex };
  spawnIndex = (spawnIndex + 1) % PALETTE.length;

  World.add(world, body);
  circles.push(c);

  if (circles.length > MAX_BALLS) {
    var removeCount = circles.length - MAX_BALLS;
    for (var i = 0; i < removeCount; i++) {
      World.remove(world, circles[i].body);
    }
    circles.splice(0, removeCount);
  }
}

function mousePressed() {
  spawnCircle(mouseX);
}
function touchStarted() {
  if (touches && touches.length) {
    for (var i = 0; i < touches.length; i++) spawnCircle(touches[i].x);
  } else {
    spawnCircle(mouseX);
  }
  return false;
}
