let colors = [
  "#0c0c08",
  "#db4b1f",
  "#19275e",
  "#1d7c41",
  "#f2bc00",
  "#e49f8f",
  "#f18d00",
];

class Square {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.done = false;
    this.birthTime = millis();
    this.c = color(random(colors));
    this.body = Bodies.rectangle(this.x, this.y, this.w, this.h, {
      restitution: 0.2,
    });
    Composite.add(engine.world, this.body);
    this.pos = this.body.position;
  }

  display() {
    noStroke();
    fill(this.c);
    rect(this.x, this.y, this.w, this.h);
  }

  checkDeath(lifetime = 2000) {
    if (millis() - this.birthTime > lifetime) {
      this.done = true;
    }
  }
}
