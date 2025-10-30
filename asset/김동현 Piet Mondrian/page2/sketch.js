let cols = 50
let rows = 60
let grid = []
let cellSize
let binaryData = ""
let indexPos = 0
let path = []
let playing = false

let EngineRef, WorldRef, BodiesRef, BodyRef
let engine
let world
let physicsPixels = []
let ground

let lineTriggerRow = 10
let hasJustDropped = false

let draggingBody = null
let prevPointerX = 0
let prevPointerY = 0
let lastPointerX = 0
let lastPointerY = 0
let dragging = false

function setup() {
  createCanvas(windowWidth, windowHeight)
  rectMode(CORNER)
  noStroke()

  let cellW = width / cols
  let cellH = height / rows
  cellSize = max(cellW, cellH)

  for (let y = 0; y < rows; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < cols; x++) path.push({ x, y })
    } else {
      for (let x = cols - 1; x >= 0; x--) path.push({ x, y })
    }
  }

  for (let y = 0; y < rows; y++) {
    let rowArr = []
    for (let x = 0; x < cols; x++) rowArr.push("")
    grid.push(rowArr)
  }

  EngineRef = Matter.Engine
  WorldRef = Matter.World
  BodiesRef = Matter.Bodies
  BodyRef = Matter.Body

  engine = EngineRef.create()
  world = engine.world

  ground = BodiesRef.rectangle(width/2, height+50, width, 100, { isStatic:true })
  WorldRef.add(world, ground)

  background(0)
}

function draw() {
  background(0)

  Matter.Engine.update(engine)

  fillGridAnimation()
  renderGrid()

  runCollisionCheckWithGrid()

  updatePhysicsPixelColors()
  renderPhysicsPixels()

  checkAndTriggerMassDropByRow()
}

function keyTyped() {
  let code = key.charCodeAt(0)
  let bin = code.toString(2).padStart(8, "0")
  binaryData += bin
  if (!playing) {
    indexPos = 0
    playing = true
  }
  hasJustDropped = false
}

function mousePressed() {
  pointerPressed(mouseX, mouseY)
}

function touchStarted() {
  pointerPressed(touchX, touchY)
  return false
}

function mouseDragged() {
  pointerDragged(mouseX, mouseY)
}

function touchMoved() {
  pointerDragged(touchX, touchY)
  return false
}

function mouseReleased() {
  pointerReleased(mouseX, mouseY)
}

function touchEnded() {
  pointerReleased(lastPointerX, lastPointerY)
  return false
}

function pointerPressed(px, py) {
  hasJustDropped = false
  let grabbed = pickPhysicsPixel(px, py)
  if (grabbed) {
    draggingBody = grabbed
    dragging = true
    prevPointerX = px
    prevPointerY = py
    lastPointerX = px
    lastPointerY = py
    BodyRef.setStatic(draggingBody, true)
    BodyRef.setAngle(draggingBody, 0)
    BodyRef.setAngularVelocity(draggingBody, 0)
    BodyRef.setVelocity(draggingBody, {x:0,y:0})
    return
  }
  injectBits()
}

function pointerDragged(px, py) {
  if (!draggingBody) return
  lastPointerX = px
  lastPointerY = py
  BodyRef.setPosition(draggingBody, {x:px, y:py})
  BodyRef.setAngle(draggingBody, 0)
  BodyRef.setAngularVelocity(draggingBody, 0)
}

function pointerReleased(px, py) {
  if (draggingBody) {
    let vx = px - prevPointerX
    let vy = py - prevPointerY
    BodyRef.setStatic(draggingBody, false)
    BodyRef.setVelocity(draggingBody, {x: vx, y: vy})
    draggingBody = null
    dragging = false
  }
}

function injectBits() {
  let code = floor(random(32, 127))
  let bin = code.toString(2).padStart(8, "0")
  binaryData += bin
  if (!playing) {
    indexPos = 0
    playing = true
  }
}

function fillGridAnimation() {
  if (playing && indexPos < binaryData.length && indexPos < path.length) {
    let p = path[indexPos]
    grid[p.y][p.x] = binaryData[indexPos]
    indexPos++
  }
}

function renderGrid() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let val = grid[y][x]
      let px = x * cellSize
      let py = y * cellSize
      if (val === "1") {
        fill(255)
        rect(px, py, cellSize, cellSize)
      } else if (val === "0") {
        fill(0)
        rect(px, py, cellSize, cellSize)
      } else {
        fill(0)
        rect(px, py, cellSize, cellSize)
      }
    }
  }
}

function checkAndTriggerMassDropByRow() {
  if (hasJustDropped) return
  for (let y = 0; y < rows; y++) {
    if (y >= lineTriggerRow) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === "1") {
          triggerMassDrop()
          hasJustDropped = true
          return
        }
      }
    }
  }
}

function triggerMassDrop() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === "1") {
        spawnPhysicsCell(x, y)
        grid[y][x] = ""
      } else if (grid[y][x] === "0") {
        grid[y][x] = ""
      }
    }
  }
  binaryData = ""
  indexPos = 0
  playing = false
}

function spawnPhysicsCell(cx, cy) {
  let px = cx * cellSize + cellSize/2
  let py = cy * cellSize + cellSize/2
  let body = BodiesRef.rectangle(px, py, cellSize, cellSize, {
    restitution:0.4,
    friction:0.2
  })
  body.w = cellSize
  body.h = cellSize
  body.fillCol = { r:255, g:255, b:255, fixed:false }
  physicsPixels.push(body)
  WorldRef.add(world, body)
}

function updatePhysicsPixelColors() {
  let zone1 = width/3
  let zone2 = (width/3)*2
  for (let b of physicsPixels) {
    if (b.fillCol && b.fillCol.fixed) continue
    if (b.position.y > height - 80) {
      if (b.position.x < zone1) {
        b.fillCol = { r:255, g:0, b:0, fixed:true }
      } else if (b.position.x < zone2) {
        b.fillCol = { r:255, g:255, b:0, fixed:true }
      } else {
        b.fillCol = { r:0, g:0, b:255, fixed:true }
      }
    }
  }
}

function renderPhysicsPixels() {
  noStroke()
  rectMode(CENTER)
  for (let b of physicsPixels) {
    fill(b.fillCol.r, b.fillCol.g, b.fillCol.b)
    push()
    translate(b.position.x, b.position.y)
    rotate(b.angle)
    rect(0, 0, b.w, b.h)
    pop()
  }
  rectMode(CORNER)
}

function pickPhysicsPixel(px, py) {
  for (let i = physicsPixels.length - 1; i >= 0; i--) {
    let b = physicsPixels[i]
    let halfW = b.w/2
    let halfH = b.h/2
    let bx = b.position.x
    let by = b.position.y
    if (
      px >= bx - halfW &&
      px <= bx + halfW &&
      py >= by - halfH &&
      py <= by + halfH
    ) {
      return b
    }
  }
  return null
}

function runCollisionCheckWithGrid() {
  for (let b of physicsPixels) {
    let halfW = b.w/2
    let halfH = b.h/2
    let left = b.position.x - halfW
    let right = b.position.x + halfW
    let top = b.position.y - halfH
    let bottom = b.position.y + halfH

    let gxMin = floor(left / cellSize)
    let gxMax = floor(right / cellSize)
    let gyMin = floor(top / cellSize)
    let gyMax = floor(bottom / cellSize)

    for (let gy = gyMin; gy <= gyMax; gy++) {
      for (let gx = gxMin; gx <= gxMax; gx++) {
        if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue
        if (grid[gy][gx] === "1") {
          grid[gy][gx] = ""
          spawnPhysicsCell(gx, gy)
        }
      }
    }
  }
}
