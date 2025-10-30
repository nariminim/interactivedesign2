class Pixel {
  constructor({ useGravity = false } = {}) {
    this.size = random(5, 50);

    const directions = ["down", "up", "left", "right"];
    this.gravityGroup = random(directions);

    switch (this.gravityGroup) {
      case "down":
        this.x = random(0, width);
        this.y = random(-1000, -500);
        break;
      case "up":
        this.x = random(0, width);
        this.y = random(height + 500, height + 1000);
        break;
      case "left":
        this.x = random(width + 500, width + 1000);
        this.y = random(0, height);
        break;
      case "right":
        this.x = random(-1000, -500);
        this.y = random(0, height);
        break;
    }

    const categories = [
      category1,
      category2,
      category3,
      category4,
      category5,
      category6,
      category7,
      category8,
    ];
    const randomCategory = random(categories);

    this.body = Bodies.rectangle(this.x, this.y, this.size, this.size, {
      mass: 0.0001,
      density: 0.0001,
      friction: 0,
      collisionFilter: {
        category: randomCategory,
        mask: randomCategory,
      },
    });
    Composite.add(world, this.body);

    if (useGravity) {
      if (this.gravityGroup === "down") gravityObjects1.add(this.body);
      else if (this.gravityGroup === "up") gravityObjects2.add(this.body);
      else if (this.gravityGroup === "right") gravityObjects3.add(this.body);
      else if (this.gravityGroup === "left") gravityObjects4.add(this.body);
    }
  }

  display() {
    const { x, y } = this.body.position;
    push();
    rectMode(CENTER);
    fill(0);
    noStroke();
    rect(x, y, this.size + random(5, 10), this.size + random(5, 10));
    pop();
  }

  destroy() {
    gravityObjects1.delete(this.body);
    gravityObjects2.delete(this.body);
    gravityObjects3.delete(this.body);
    gravityObjects4.delete(this.body);
    Composite.remove(world, this.body);
  }
}
