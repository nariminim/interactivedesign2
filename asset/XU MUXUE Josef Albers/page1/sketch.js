let squares = [];
let canvas;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  noStroke();
  canvas.elt.addEventListener("pointerdown", pointerPressed);
}

function draw() {
  background(255);

  for (let i = squares.length - 1; i >= 0; i--) {
    squares[i].update();
    squares[i].display();
  }
}

function pointerPressed(e) {
  let square = new MovingSquare(e.offsetX, e.offsetY);
  squares.push(square);
}

class MovingSquare {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(40, 250);
    let colors = [
      "#e2cd12ff",
      "#c93113ff",
      "#175851ff",
      "#bfbdaeff",
      "#293f86ff",
      "#294b35ff",
      "#84a752ff",
      "#28221dff",
      "#968884ff",
      "#8f5e2eff",
    ];

    this.col = color(random(colors));
    this.alpha = 255;

    if (random() < 0.5) {
      this.vx = random([-3, 3]);
      this.vy = 0;
    } else {
      this.vx = 0;
      this.vy = random([-3, 3]);
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  display() {
    fill(red(this.col), green(this.col), blue(this.col), this.alpha);
    rectMode(CENTER);
    rect(this.x, this.y, this.size, this.size);
  }
}
