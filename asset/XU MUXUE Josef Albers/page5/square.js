class Square {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.done = false;

    let palette = [
      color(237, 56, 32, 100),
      color(25, 60, 109, 100),
      color(213, 149, 47, 100),
      color(233, 224, 220, 100),
      color(57, 129, 126, 100),
      color(115, 177, 74, 100),
      color(76, 54, 45, 100),
      color(121, 32, 32, 100),
      color(24, 51, 37, 100),
      color(55, 52, 50, 100),
      color(255, 242, 0, 100),
    ];
    this.c = random(palette);

    this.body = Bodies.rectangle(this.x, this.y, this.size, this.size);
    Composite.add(engine.world, this.body);
    this.pos = this.body.position;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.body.angle);
    noStroke();
    fill(this.c);
    rectMode(CENTER);
    rect(0, 0, this.size, this.size);
    pop();
  }

  checkDeath() {
    if (
      this.pos.x < -this.size ||
      this.pos.x > width + this.size ||
      this.pos.y > height + this.size
    ) {
      this.done = true;
      Composite.remove(engine.world, this.body);
    }
  }
}
