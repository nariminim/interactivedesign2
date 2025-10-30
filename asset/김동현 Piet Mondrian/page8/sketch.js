let Engine = Matter.Engine
let World = Matter.World
let Bodies = Matter.Bodies
let Body = Matter.Body
let Mouse = Matter.Mouse
let MouseConstraint = Matter.MouseConstraint

let engine
let world

let ground
let wallZone
let blocks = []

let mConstraint
let justReleasedBody = null

const palette = ['#000000','#d40920','#f2d31b','#1347a5','#ffffff']
let colorCounts = {
  '#000000':0,
  '#d40920':0,
  '#f2d31b':0,
  '#1347a5':0,
  '#ffffff':0
}

let occupiedCells = {}

function setup(){
  createCanvas(window.innerWidth, window.innerHeight)

  engine = Engine.create()
  world = engine.world
  world.gravity.y = 1

  ground = Bodies.rectangle(width/2, height-30, width, 60, { isStatic:true })
  World.add(world, ground)

  let wallWidth = width*0.3
  let wallHeight = height*0.6
  let wallX = width*0.7
  let wallY = height*0.5

  wallZone = {
    x: wallX,
    y: wallY,
    w: wallWidth,
    h: wallHeight,
    cell: 40
  }

  for(let i=0;i<8;i++){
    let base = randomBlockSpec()
    let b = Bodies.rectangle(base.x,base.y,base.w,base.h,{
      restitution:0.2,
      friction:0.7
    })
    b.renderData = { w:base.w, h:base.h, col:base.col }
    b.isSnapped = false
    b.cellKey = null
    World.add(world, b)
    blocks.push(b)
    colorCounts[base.col] += 1
  }

  let canvasMouse = Mouse.create(canvas.elt)
  mConstraint = MouseConstraint.create(engine, {
    mouse: canvasMouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false }
    }
  })
  World.add(world, mConstraint)
}

function draw(){
  background(255)

  Engine.update(engine)

  if(random() < 0.02){
    spawnFallingBlock()
  }

  drawWallZone()
  drawGround()

  for(let b of blocks){
    drawBlock(b)
  }

  if(mConstraint.body){
    drawGrabIndicator(mConstraint.body)
  }
}

function pickBalancedColor(){
  let minCount = Infinity
  for(let c of palette){
    if(colorCounts[c] < minCount){
      minCount = colorCounts[c]
    }
  }
  let candidates = []
  for(let c of palette){
    if(colorCounts[c] === minCount){
      candidates.push(c)
    }
  }
  return random(candidates)
}

function randomBlockSpec(){
  let r = random()
  let shapeType
  if(r < 0.7){
    shapeType = "rect"
  } else if(r < 0.85){
    shapeType = "hBar"
  } else {
    shapeType = "vBar"
  }

  let col = pickBalancedColor()

  if(shapeType === "rect"){
    let w = random(40,110)
    let h = random(40,110)
    return {
      w:w,
      h:h,
      x: width*0.25 + random(-80,80),
      y: height*0.15 + random(-200,-50),
      col:col
    }
  }

  if(shapeType === "hBar"){
    let w = random(160,240)
    let h = random(15,30)
    return {
      w:w,
      h:h,
      x: width*0.3 + random(-100,100),
      y: height*0.15 + random(-200,-50),
      col:col
    }
  }

  if(shapeType === "vBar"){
    let w = random(15,30)
    let h = random(160,240)
    return {
      w:w,
      h:h,
      x: width*0.2 + random(-60,60),
      y: height*0.15 + random(-200,-50),
      col:col
    }
  }
}

function spawnFallingBlock(){
  let base = randomBlockSpec()
  let b = Bodies.rectangle(base.x,base.y,base.w,base.h,{
    restitution:0.2,
    friction:0.7
  })
  b.renderData = { w:base.w, h:base.h, col:base.col }
  b.isSnapped = false
  b.cellKey = null
  World.add(world, b)
  blocks.push(b)
  colorCounts[base.col] += 1
}

function drawWallZone(){
  push()
  stroke(0)
  strokeWeight(2)
  noFill()
  rectMode(CENTER)
  rect(wallZone.x, wallZone.y, wallZone.w, wallZone.h)

  strokeWeight(1)
  for(let gx = wallZone.x - wallZone.w/2; gx <= wallZone.x + wallZone.w/2; gx += wallZone.cell){
    line(gx, wallZone.y - wallZone.h/2, gx, wallZone.y + wallZone.h/2)
  }
  for(let gy = wallZone.y - wallZone.h/2; gy <= wallZone.y + wallZone.h/2; gy += wallZone.cell){
    line(wallZone.x - wallZone.w/2, gy, wallZone.x + wallZone.w/2, gy)
  }
  pop()
}

function drawGround(){
  push()
  rectMode(CENTER)
  stroke(0)
  strokeWeight(2)
  fill(0)
  rect(
    ground.position.x,
    ground.position.y,
    ground.bounds.max.x-ground.bounds.min.x,
    ground.bounds.max.y-ground.bounds.min.y
  )
  pop()
}

function drawBlock(b){
  push()
  translate(b.position.x, b.position.y)
  rotate(b.angle)
  rectMode(CENTER)
  stroke(0)
  strokeWeight(2)
  fill(b.renderData.col)
  rect(0,0,b.renderData.w,b.renderData.h,3)
  pop()
}

function drawGrabIndicator(body){
  push()
  noStroke()
  fill(0)
  circle(mouseX, mouseY, 8)
  pop()
}

function trySnapToWall(body){
  if(!body) return

  let x = body.position.x
  let y = body.position.y

  let within =
    x > wallZone.x - wallZone.w/2 &&
    x < wallZone.x + wallZone.w/2 &&
    y > wallZone.y - wallZone.h/2 &&
    y < wallZone.y + wallZone.h/2

  if(!within){
    return
  }

  let snappedPos = snapToGrid(x,y)
  let key = snappedPos.gx + "," + snappedPos.gy

  if(isCellFreeForBody(key, body)){
    Body.setPosition(body, {x:snappedPos.gx,y:snappedPos.gy})
    Body.setVelocity(body,{x:0,y:0})
    Body.setAngularVelocity(body,0)
    Body.setAngle(body,0)
    Body.setStatic(body,true)
    markCell(body, key)
  }
}

function isCellFreeForBody(key, body){
  if(occupiedCells[key] === undefined) return true
  if(occupiedCells[key] === body) return true
  return false
}

function markCell(body, key){
  if(body.cellKey && occupiedCells[body.cellKey] === body){
    delete occupiedCells[body.cellKey]
  }
  occupiedCells[key] = body
  body.cellKey = key
  body.isSnapped = true
}

function releaseCell(body){
  if(body.cellKey && occupiedCells[body.cellKey] === body){
    delete occupiedCells[body.cellKey]
  }
  body.cellKey = null
  body.isSnapped = false
}

function snapToGrid(x,y){
  let cell = wallZone.cell
  let gx = round((x - (wallZone.x - wallZone.w/2))/cell)*cell + (wallZone.x - wallZone.w/2)
  let gy = round((y - (wallZone.y - wallZone.h/2))/cell)*cell + (wallZone.y - wallZone.h/2)
  return {gx:gx, gy:gy}
}

function doubleClicked(){
  let target = findClosestSnappedBlock(mouseX, mouseY)
  if(target){
    releaseCell(target)
    Body.setStatic(target,false)
    Body.setVelocity(target,{x:random(-2,2),y:-5})

    let replacement = spawnReplacementBlock(target)
    let key = replacement.cellKey
    occupiedCells[key] = replacement
  }
}

function findClosestSnappedBlock(mx,my){
  let best = null
  let bestDist2 = Infinity
  for(let b of blocks){
    if(!b.isSnapped) continue
    let dx = mx - b.position.x
    let dy = my - b.position.y
    let d2 = dx*dx + dy*dy
    if(d2 < bestDist2){
      bestDist2 = d2
      best = b
    }
  }
  if(bestDist2 < 2000){
    return best
  }
  return null
}

function spawnReplacementBlock(refBlock){
  let w = random(40,110)
  let h = random(40,110)

  let cChoices = palette.filter(col => col !== refBlock.renderData.col)
  let colNew = pickBalancedFromSubset(cChoices)

  let b = Bodies.rectangle(
    refBlock.position.x,
    refBlock.position.y,
    w,h,
    { isStatic:true }
  )
  b.renderData = { w:w, h:h, col:colNew }
  b.isSnapped = true

  let snappedPos = snapToGrid(refBlock.position.x, refBlock.position.y)
  Body.setPosition(b, {x:snappedPos.gx,y:snappedPos.gy})
  Body.setAngle(b,0)
  Body.setVelocity(b,{x:0,y:0})

  let key = snappedPos.gx + "," + snappedPos.gy
  b.cellKey = key
  occupiedCells[key] = b

  World.add(world, b)
  blocks.push(b)
  colorCounts[colNew] += 1

  return b
}

function pickBalancedFromSubset(subset){
  let minCount = Infinity
  for(let c of subset){
    if(colorCounts[c] < minCount){
      minCount = colorCounts[c]
    }
  }
  let candidates = []
  for(let c of subset){
    if(colorCounts[c] === minCount){
      candidates.push(c)
    }
  }
  return random(candidates)
}

function mousePressed(){
  justReleasedBody = null
}

function mouseReleased(){
  if(mConstraint.body){
    justReleasedBody = mConstraint.body
  } else {
    justReleasedBody = null
  }

  if(justReleasedBody){
    trySnapToWall(justReleasedBody)
  }

  justReleasedBody = null
}

function windowResized(){
  resizeCanvas(window.innerWidth, window.innerHeight)

  Body.setPosition(ground, {x:width/2, y:height-30})
  Body.setVertices(ground, [
    {x:0, y:height-60},
    {x:width, y:height-60},
    {x:width, y:height},
    {x:0, y:height}
  ])

  let wallWidth = width*0.3
  let wallHeight = height*0.6
  let wallX = width*0.7
  let wallY = height*0.5
  wallZone.x = wallX
  wallZone.y = wallY
  wallZone.w = wallWidth
  wallZone.h = wallHeight
  wallZone.cell = 40
}
