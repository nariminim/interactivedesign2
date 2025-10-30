let armAngle = 0
let armAngleVel = 0

let armLength
let armThickness = 6

let armOriginX
let armOriginY

let angleStiffness = 0.08
let angleDamping = 0.85

let squares = []
let squareSize = 12

let palette

let baseSpawnChance = 0.6
let spawnJitter = 0.4

let dragging = false
let prevPointerX = 0
let prevPointerY = 0

function setup() {
  createCanvas(windowWidth, windowHeight)
  rectMode(CENTER)
  noStroke()

  armLength = min(windowWidth, windowHeight) * 0.3
  armThickness = 6

  armOriginX = width/2
  armOriginY = height/2

  palette = [
    {r:255,g:255,b:255},
    {r:255,g:0,b:0},
    {r:255,g:255,b:0},
    {r:0,g:0,b:255}
  ]
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  armLength = min(windowWidth, windowHeight) * 0.3
}

function draw() {
  background(0)

  updateArmPhysics()

  maybeSpawnSquaresAlongArm()

  updateSquaresMotion()

  cullSquaresOffscreen()

  drawSquares()

  drawArm()
}

function mousePressed() {
  dragging = true
  armOriginX = mouseX
  armOriginY = mouseY
  prevPointerX = mouseX
  prevPointerY = mouseY
}

function mouseDragged() {
  dragging = true
  updateArmFromPointer(mouseX, mouseY, prevPointerX, prevPointerY)
  prevPointerX = mouseX
  prevPointerY = mouseY
}

function mouseReleased() {
  dragging = false
}

function touchStarted() {
  dragging = true
  armOriginX = touchX
  armOriginY = touchY
  prevPointerX = touchX
  prevPointerY = touchY
  return false
}

function touchMoved() {
  dragging = true
  updateArmFromPointer(touchX, touchY, prevPointerX, prevPointerY)
  prevPointerX = touchX
  prevPointerY = touchY
  return false
}

function touchEnded() {
  dragging = false
  return false
}

function updateArmFromPointer(x, y, px, py) {
  let dx = x - px
  let dy = y - py

  armOriginX = x
  armOriginY = y

  if (dx !== 0 || dy !== 0) {
    let newAngle = atan2(dy, dx)
    let dAng = angleDiff(newAngle, armAngle)
    armAngleVel = dAng
    armAngle = newAngle
  }
}

function updateArmPhysics() {
  if (!dragging) {
    let targetAngle = PI/2
    let diff = angleDiff(targetAngle, armAngle)
    armAngleVel += diff * angleStiffness
    armAngleVel *= angleDamping
    armAngle += armAngleVel
  }
}

function angleDiff(target, current) {
  let d = target - current
  while (d > PI) d -= TWO_PI
  while (d < -PI) d += TWO_PI
  return d
}

function drawArm() {
  push()
  translate(armOriginX, armOriginY)
  rotate(armAngle)
  noStroke()
  fill(255)
  rect(armLength/2, 0, armLength, armThickness, armThickness*0.5)
  pop()
}

function pointOnCurrentArm(t) {
  let r = armLength * t
  let x = armOriginX + cos(armAngle) * r
  let y = armOriginY + sin(armAngle) * r
  return {x, y}
}

function currentSpawnChance() {
  let jitter = random(-spawnJitter, spawnJitter)
  let chance = baseSpawnChance + jitter
  if (chance < 0) chance = 0
  if (chance > 1) chance = 1
  return chance
}

function maybeSpawnSquaresAlongArm() {
  if (random() < currentSpawnChance()) {
    let t = random()
    let p = pointOnCurrentArm(t)
    let col = random(palette)

    let spreadAng = random(-PI/2, PI/2)
    let ca = cos(armAngle + spreadAng)
    let sa = sin(armAngle + spreadAng)
    let baseSpeed = random(1,2)

    squares.push({
      x: p.x,
      y: p.y,
      size: squareSize,
      c: {r:col.r,g:col.g,b:col.b},
      vx: ca * baseSpeed,
      vy: sa * baseSpeed,
      drag: 0.96
    })
  }
}

function updateSquaresMotion() {
  for (let s of squares) {
    let dirx = s.x - width/2
    let diry = s.y - height/2
    let mag = sqrt(dirx*dirx + diry*diry)
    if (mag === 0) mag = 1

    let nx = dirx / mag
    let ny = diry / mag

    let spreadForce = 0.02
    s.vx += nx * spreadForce
    s.vy += ny * spreadForce

    s.vx *= s.drag
    s.vy *= s.drag

    s.x += s.vx
    s.y += s.vy
  }
}

function cullSquaresOffscreen() {
  let kept = []
  for (let s of squares) {
    if (
      s.x < -100 || s.x > width + 100 ||
      s.y < -100 || s.y > height + 100
    ) {
    } else {
      kept.push(s)
    }
  }
  squares = kept
}

function drawSquares() {
  for (let s of squares) {
    fill(s.c.r, s.c.g, s.c.b)
    rect(s.x, s.y, s.size, s.size)
  }
}
