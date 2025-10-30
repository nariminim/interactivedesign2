let angleX = 0
let angleY = 0
let prevMouseX = 0
let prevMouseY = 0
let dragging = false

const palette = ['#d40920', '#f2d31b', '#1347a5', '#ffffff']

let panels = []
let fallingBlocks = []

function setup(){
  createCanvas(window.innerWidth, window.innerHeight, WEBGL)
  const cubeSize = 300
  const half = cubeSize/2
  const depth = 10

  panels.push(makePanel(-80, -60,  half, 120,100, depth, '#d40920'))
  panels.push(makePanel( 70, -60,  half, 100,100, depth, '#f2d31b'))
  panels.push(makePanel(-80,  70,  half, 120,120, depth, '#1347a5'))
  panels.push(makePanel( 70,  70,  half, 100,120, depth, '#ffffff'))

  panels.push(makePanel( half, -40, 20,  depth,120,100, '#ffffff'))
  panels.push(makePanel( half,  80, 20,  depth,100,100, '#d40920'))

  panels.push(makePanel(  0, -half,  40, 200, depth,120, '#f2d31b'))
  panels.push(makePanel(-90, -half, -40, 100, depth,120, '#1347a5'))
}

function makePanel(x,y,z,w,h,d,col){
  return {x:x,y:y,z:z,w:w,h:h,d:d,col:col,offsetZ:0,isPulled:false}
}

function draw(){
  background(255)
  lights()
  rotateX(angleX)
  rotateY(angleY)

  drawFrameCube(320, 320, 320, 8)

  for(let p of panels){
    push()
    translate(p.x, p.y, p.z + p.offsetZ)
    noStroke()
    ambientMaterial(p.col)
    box(p.w, p.h, p.d)
    pop()

    push()
    translate(p.x, p.y, p.z + p.offsetZ)
    noFill()
    stroke(0)
    strokeWeight(2)
    box(p.w+2, p.h+2, p.d+2)
    pop()
  }

  for(let b of fallingBlocks){
    b.vy += 0.4
    b.y += b.vy

    push()
    translate(b.x, b.y, b.z)
    noStroke()
    ambientMaterial(b.col)
    box(b.w, b.h, b.d)
    pop()

    if(b.y > height){
      b.remove = true
    }
  }

  fallingBlocks = fallingBlocks.filter(b => !b.remove)
}

function drawFrameCube(w,h,d,thick){
  stroke(0)
  strokeWeight(2)
  noFill()

  push()
  box(w,h,thick)
  pop()

  push()
  box(w,h,thick)
  rotateY(HALF_PI)
  box(d,h,thick)
  pop()

  push()
  rotateX(HALF_PI)
  box(w,d,thick)
  pop()
}

function mousePressed(){
  dragging = true
  prevMouseX = mouseX
  prevMouseY = mouseY
}

function mouseDragged(){
  if(dragging){
    let dx = mouseX - prevMouseX
    let dy = mouseY - prevMouseY
    angleY += dx * 0.01
    angleX -= dy * 0.01
    prevMouseX = mouseX
    prevMouseY = mouseY
  }
}

function mouseReleased(){
  dragging = false
}

function doubleClicked(){
  let picked = pickPanelUnderMouse()
  if(picked != null){
    let index = panels.indexOf(picked)
    if(index != -1){
      let falling = {
        x:picked.x,
        y:picked.y,
        z:picked.z + picked.offsetZ,
        w:picked.w,
        h:picked.h,
        d:picked.d,
        col:picked.col,
        vy:0,
        remove:false
      }
      fallingBlocks.push(falling)

      let newColOptions = palette.filter(c => c !== picked.col)
      let newCol = random(newColOptions)

      let sizeMulW = random(0.8,1.2)
      let sizeMulH = random(0.8,1.2)
      let sizeMulD = random(0.8,1.2)

      let newPanel = makePanel(
        picked.x,
        picked.y,
        picked.z,
        picked.w * sizeMulW,
        picked.h * sizeMulH,
        picked.d * sizeMulD,
        newCol
      )

      panels.splice(index,1,newPanel)
    }
  }
}

function pickPanelUnderMouse(){
  let best = null
  let bestScore = Infinity

  for(let i=0;i<panels.length;i++){
    let p = panels[i]
    let screenPos = worldToScreen(p.x, p.y, p.z + p.offsetZ)
    let dx = mouseX - screenPos.x
    let dy = mouseY - screenPos.y
    let dist2 = dx*dx + dy*dy
    if(dist2 < bestScore){
      best = p
      bestScore = dist2
    }
  }

  if(bestScore < 2000){
    return best
  } else {
    return null
  }
}

function worldToScreen(x,y,z){
  let v = createVector(x,y,z)
  let mv = treeLocation(v.x,v.y,v.z)
  return createVector(mv.x, mv.y)
}

function treeLocation(x,y,z){
  let v = createVector(x,y,z)
  let rx = angleX
  let ry = angleY
  let cy = cos(ry)
  let sy = sin(ry)
  let cx = cos(rx)
  let sx = sin(rx)

  let x1 = cy*v.x + 0*v.y + (-sy)*v.z
  let y1 = sx*sy*v.x + cx*v.y + sx*cy*v.z
  let z1 = cx*sy*v.x + (-sx)*v.y + cx*cy*v.z

  let scaleProj = (height/2) / (height/2 + z1 + 400)
  let sx2 = x1 * scaleProj + width/2
  let sy2 = y1 * scaleProj + height/2

  return {x:sx2, y:sy2}
}

function windowResized(){
  resizeCanvas(window.innerWidth, window.innerHeight, WEBGL)
}
