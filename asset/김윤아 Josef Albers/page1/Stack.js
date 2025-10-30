class Stack {
  constructor(_xIndex, _yIndex, innerGap, outerGap) {
    this.xIndex = _xIndex;
    this.yIndex = _yIndex;
    this.innerGap = innerGap;
    this.outerGap = outerGap;

    const stackW = glassCountCol * (glassW + this.innerGap * 2);
    const stackH = glassCountRow * (glassW + this.innerGap * 2);

    this.x =
      width / 2 -
      (stackCountCol * stackW + (stackCountCol - 1) * this.outerGap) / 2 +
      this.xIndex * (stackW + this.outerGap);
    this.y =
      height / 2 -
      (stackCountRow * stackH + (stackCountRow - 1) * this.outerGap) / 2 +
      this.yIndex * (stackH + this.outerGap);

    const categories = [
      category1,
      category2,
      category3,
      category4,
      category5,
      category6,
      category7,
      category8,
      category9,
      category10,
      category11,
      category12,
      category13,
      category14,
      category15,
    ];
    this.collisionCategory = random(categories);
    this.collisionMask = this.collisionCategory | defaultCategory;

    if (!categoryPaletteMap.has(this.collisionCategory)) {
      const newPalette = paletteGroups[floor(random(paletteGroups.length))];
      categoryPaletteMap.set(this.collisionCategory, newPalette);
    }
    this.paletteGroup = categoryPaletteMap.get(this.collisionCategory);

    this.stack = Composites.stack(
      this.x,
      this.y,
      glassCountCol,
      glassCountRow,
      this.innerGap * 2,
      this.innerGap * 2,
      (x, y) =>
        Bodies.rectangle(x, y, glassW, glassW, {
          restitution: 0.5,
          isStatic: true,
          collisionFilter: {
            category: this.collisionCategory,
            mask: this.collisionMask,
          },
        })
    );

    Composite.add(engine.world, this.stack);

    this.glasses = [];
    for (let b of this.stack.bodies) {
      const col = this.paletteGroup[floor(random(this.paletteGroup.length))];
      this.glasses.push(new Glass(b, glassW * 2, col));
    }
  }

  display() {
    for (let g of this.glasses) {
      g.display();
    }
  }

  releaseGlassAt(mx, my) {
    const threshold = glassW / 2;

    for (let i = 0; i < this.stack.bodies.length; i++) {
      const body = this.stack.bodies[i];
      const bx = body.position.x;
      const by = body.position.y;
      const d = dist(mx, my, bx, by);

      if (d < threshold && body.isStatic) {
        const pos = Matter.Vector.clone(body.position);
        const angle = body.angle;

        Composite.remove(engine.world, body);
        Composite.remove(engine.world, this.stack);

        const newBody = Bodies.rectangle(pos.x, pos.y, glassW, glassW, {
          restitution: 0.5,
          frictionAir: 0.0005,
          angle: angle,
          isStatic: false,
          collisionFilter: {
            category: this.collisionCategory,
            mask: this.collisionMask,
          },
        });

        this.stack.bodies[i] = newBody;
        Composite.add(engine.world, newBody);
        this.glasses[i].body = newBody;
      }
    }
  }
}
