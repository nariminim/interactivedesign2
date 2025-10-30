let cols, rows
let grid = []
let cellSize
let lights = []

let fallingRects = []
let settledRects = []
let columnHeights = []

let blockW = 40
let blockH = 40

let palette

let draggingRect = null
let dragOffsetX = 0
let dragOffsetY = 0
let isDragging = false

function setup() {
  createCanvas(windowWidth, windowHeight)
  noStroke()
  rectMode(CORNER)
  initGrid()
  initColumns()
  palette = [
    color(255,0,0),
    color(0,0,255),
    color(255,255,0),
    color(255,255,255)
  ]
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  initGrid()
  initColumns(true)
}

function initGrid() {
  cols = floor((windowWidth / 38) * 1.5)
  rows = floor((windowHeight / 38) * 1.5)
  grid = []
  let cellW = width / cols
  let cellH = height / rows
  cellSize = min(cellW, cellH)
  for (let y = 0; y < rows; y++) {
    let row = []
    for (let x = 0; x < cols; x++) {
      row.push(new Cell(x, y))
    }
    grid.push(row)
  }
}

function initColumns(preserveExisting=false) {
  let numCols = floor(width / blockW)
  if (!preserveExisting) {
    columnHeights = []
    for (let i=0;i<numCols;i++) columnHeights.push(0)
    fallingRects = []
    settledRects = []
    draggingRect = null
    isDragging = false
  } else {
    let oldSettled = settledRects.slice()
    columnHeights = []
    for (let i=0;i<numCols;i++) columnHeights.push(0)
    fallingRects = []
    settledRects = []
    draggingRect = null
    isDragging = false
    for (let r of oldSettled) {
      let colIndex = constrain(floor(r.x / blockW),0,numCols-1)
      let baseY = height - columnHeights[colIndex] - blockH
      let snappedY = baseY
      settledRects.push({
        x: colIndex*blockW,
        y: snappedY,
        w: blockW,
        h: blockH,
        c: r.c
      })
      columnHeights[colIndex] += blockH
    }
  }
}

function draw() {
  background(0)
  updateFallingRects()
  for (let row of grid) {
    for (let cell of row) {
      cell.update()
      cell.show()
    }
  }
  for (let i = lights.length - 1; i >= 0; i--) {
    lights[i].update()
    if (lights[i].done) lights.splice(i, 1)
  }
  renderRects()
  renderDraggingRect()
}

function mousePressed() {
  handlePress(mouseX, mouseY)
}

function mouseDragged() {
  handleDrag(mouseX, mouseY)
}

function mouseReleased() {
  handleRelease(mouseX, mouseY)
}

function touchStarted() {
  handlePress(touchX, touchY)
  return false
}

function touchMoved() {
  handleDrag(touchX, touchY)
  return false
}

function touchEnded() {
  handleRelease(mouseX, mouseY)
  return false
}

function handlePress(px, py) {
  let pick = pickSettledAt(px, py)
  if (pick) {
    let baseRect = pick.rect
    let baseIndex = pick.index
    let colIndex = floor(baseRect.x / blockW)
    let grabbedAndReleasedAbove = breakColumnStack(colIndex, baseRect.y, baseRect)
    draggingRect = grabbedAndReleasedAbove.dragRect
    dragOffsetX = px - draggingRect.x
    dragOffsetY = py - draggingRect.y
    isDragging = true
    settledRects = grabbedAndReleasedAbove.newSettled
    columnHeights = grabbedAndReleasedAbove.newHeights
  } else {
    triggerLight(px, py)
    spawnBlock(px, py)
  }
}

function handleDrag(px, py) {
  if (isDragging && draggingRect) {
    draggingRect.x = px - dragOffsetX
    draggingRect.y = py - dragOffsetY
  }
}

function handleRelease(px, py) {
  if (isDragging && draggingRect) {
    let numCols = floor(width / blockW)
    let colIndex = constrain(floor((draggingRect.x + draggingRect.w*0.5) / blockW),0,numCols-1)
    let dropX = colIndex * blockW
    let dropY = draggingRect.y
    spawnFallingFromDrag(dropX, dropY, draggingRect.c, colIndex)
    draggingRect = null
    isDragging = false
  }
}

function pickSettledAt(px, py) {
  for (let i = settledRects.length - 1; i >= 0; i--) {
    let r = settledRects[i]
    if (
      px >= r.x &&
      px <= r.x + r.w &&
      py >= r.y &&
      py <= r.y + r.h
    ) {
      return {rect:{x:r.x,y:r.y,w:r.w,h:r.h,c:r.c}, index:i}
    }
  }
  return null
}

function breakColumnStack(colIndex, grabbedY, grabbedRect) {
  let newSettled = []
  let releasedAsFalling = []
  for (let r of settledRects) {
    let ci = floor(r.x / blockW)
    if (ci === colIndex && r.y < grabbedY + 0.5) {
      releasedAsFalling.push(r)
    } else if (!(ci === colIndex && r.y === grabbedY && sameColor(r.c, grabbedRect.c))) {
      newSettled.push(r)
    }
  }
  let dragRect = {x:grabbedRect.x, y:grabbedRect.y, w:grabbedRect.w, h:grabbedRect.h, c:grabbedRect.c}
  fallingRectsFromRelease(releasedAsFalling, colIndex, grabbedY, dragRect)
  let newHeights = recomputeHeights(newSettled)
  return { newSettled:newSettled, newHeights:newHeights, dragRect:dragRect }
}

function sameColor(a,b) {
  return red(a)===red(b) && green(a)===green(b) && blue(a)===blue(b)
}

function fallingRectsFromRelease(blocks, colIndex, grabbedY, dragRect) {
  for (let r of blocks) {
    if (r.x === dragRect.x && r.y === dragRect.y) continue
    let ci = floor(r.x / blockW)
    fallingRects.push({
      x: ci*blockW,
      y: r.y,
      w: blockW,
      h: blockH,
      vy: 0,
      bounce: 0,
      state: "fall",
      colIndex: ci,
      c: r.c
    })
  }
}

function recomputeHeights(rects) {
  let numCols = floor(width / blockW)
  let heights = []
  for (let i=0;i<numCols;i++) heights.push(0)
  for (let r of rects) {
    let ci = constrain(floor(r.x / blockW),0,numCols-1)
    heights[ci] += blockH
  }
  return heights
}

function removeSettled(i) {
  settledRects.splice(i,1)
}

function recalcColumnHeights() {
  let numCols = floor(width / blockW)
  columnHeights = []
  for (let i=0;i<numCols;i++) columnHeights.push(0)
  for (let r of settledRects) {
    let ci = constrain(floor(r.x / blockW),0,numCols-1)
    columnHeights[ci] += blockH
  }
}

function triggerLight(px, py) {
  let xIndex = floor(px / cellSize)
  let yIndex = floor(py / cellSize)
  if (xIndex >= 0 && xIndex < cols && yIndex >= 0 && yIndex < rows) {
    lights.push(new LightWave(xIndex, yIndex, "both"))
  }
}

function spawnBlock(px, py) {
  let numCols = floor(width / blockW)
  let colIndex = constrain(floor(px / blockW),0,numCols-1)
  let startX = colIndex * blockW
  let startY = py
  if (!palette) {
    palette = [
      color(255,0,0),
      color(0,0,255),
      color(255,255,0),
      color(255,255,255)
    ]
  }
  let colColor = random(palette)
  fallingRects.push({
    x: startX,
    y: startY,
    w: blockW,
    h: blockH,
    vy: 2,
    bounce: 0,
    state: "fall",
    colIndex: colIndex,
    c: colColor
  })
}

function spawnFallingFromDrag(px, py, colColor, forcedColIndex) {
  let colIndex = forcedColIndex
  let startX = px
  let startY = py
  fallingRects.push({
    x: startX,
    y: startY,
    w: blockW,
    h: blockH,
    vy: 0,
    bounce: 0,
    state: "fall",
    colIndex: colIndex,
    c: colColor
  })
}

class Cell {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.brightness = 0
    this.c = color(255)
  }
  lightUp(col) {
    this.brightness = 255
    this.c = col
  }
  update() {
    if (this.brightness > 0.1) {
      this.brightness *= 0.87 + random(-0.02, 0.02)
    } else {
      this.brightness = 0
    }
  }
  show() {
    fill(red(this.c), green(this.c), blue(this.c), this.brightness)
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize)
  }
}

class LightWave {
  constructor(cx, cy, direction = "both", spawned = false) {
    this.cx = cx
    this.cy = cy
    this.frame = 0
    this.done = false
    this.direction = direction
    this.spawned = spawned
  }
  update() {
    this.frame++
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let isInPath = false
        if (this.direction === "horizontal" || this.direction === "both") {
          if (y === this.cy) isInPath = true
        }
        if (this.direction === "vertical" || this.direction === "both") {
          if (x === this.cx) isInPath = true
        }
        if (isInPath) {
          let distWave = abs(x - this.cx) + abs(y - this.cy)
          if (distWave === this.frame) {
            let chance = random(1)
            let c = color(255)
            let isColorful = false
            if (chance < 0.2) {
              let colors = [color(255, 0, 0), color(255, 255, 0), color(0, 0, 255)]
              c = random(colors)
              isColorful = true
            }
            grid[y][x].lightUp(c)
            if (isColorful && !this.spawned) {
              if (this.direction === "horizontal") {
                lights.push(new LightWave(x, y, "vertical", true))
              } else if (this.direction === "vertical") {
                lights.push(new LightWave(x, y, "horizontal", true))
              } else if (this.direction === "both") {
                let dir = random(["horizontal","vertical"])
                lights.push(new LightWave(x, y, dir, true))
              }
            }
          }
        }
      }
    }
    if (this.frame > cols + rows) {
      this.done = true
    }
  }
}

function updateFallingRects() {
  let groundYForCol = (colIndex)=> height - columnHeights[colIndex] - blockH
  for (let i = fallingRects.length - 1; i >= 0; i--) {
    let r = fallingRects[i]
    if (r.state === "fall") {
      r.vy += 0.4
      r.y += r.vy
      let targetY = groundYForCol(r.colIndex)
      if (r.y >= targetY) {
        r.y = targetY
        r.vy = -r.vy * 0.4
        r.bounce = 1
        r.state = "bounce"
      }
    } else if (r.state === "bounce") {
      r.vy += 0.4
      r.y += r.vy
      let targetY = groundYForCol(r.colIndex)
      if (r.y >= targetY) {
        r.y = targetY
        if (abs(r.vy) < 1.5 || r.bounce > 2) {
          settleRect(r, i)
        } else {
          r.vy = -r.vy * 0.3
          r.bounce += 1
        }
      }
    }
  }
}

function settleRect(r, idx) {
  r.y = height - columnHeights[r.colIndex] - blockH
  settledRects.push({
    x: r.colIndex*blockW,
    y: r.y,
    w: blockW,
    h: blockH,
    c: r.c
  })
  columnHeights[r.colIndex] += blockH
  fallingRects.splice(idx,1)
}

function renderRects() {
  noStroke()
  rectMode(CORNER)
  for (let r of settledRects) {
    fill(r.c)
    rect(r.x, r.y, r.w, r.h)
  }
  for (let r of fallingRects) {
    fill(r.c)
    rect(r.x, r.y, r.w, r.h)
  }
}

function renderDraggingRect() {
  if (isDragging && draggingRect) {
    noStroke()
    rectMode(CORNER)
    fill(draggingRect.c)
    rect(draggingRect.x, draggingRect.y, draggingRect.w, draggingRect.h)
  }
}
