window.CustomLine = class Line {
  constructor(_centerX, _centerY, _add1, _moveX, _moveY, _mX, _mY) {
    this.x = _centerX;
    this.y = _centerY;
    this.add1 = _add1;
    this.moveX = _moveX;
    this.moveY = _moveY;
    this.mX = _mX;
    this.mY = _mY;
    this.w1 = 457;

    this.w2 = 86;
    this.h2 = 170;

    this.bodies = [];
    this.initialRotation = totalRotation;

    this.createBodies();
  }

  createBodies() {
    const offsetX = this.x + this.mX;
    const offsetY = this.y + this.mY;
    const offsetX2 = this.x - 38;

    this.bodies.push(
      Bodies.rectangle(offsetX, offsetY, this.w1, 4, {
        density: 1.0,
        friction: 1.0,
        restitution: 0.2,
        mass: 9999999,
        inertia: Infinity,
        frictionAir: 0,
        collisionFilter: {
          category: category1,
          mask: category1,
        },
      })
    );

    this.bodies.push(
      Bodies.rectangle(offsetX + this.w1 / 2, offsetY - 315 / 2, 2, 315, {
        density: 1.0,
        friction: 1.0,
        restitution: 0.2,
        mass: 9999999,
        inertia: Infinity,
        frictionAir: 0,
        collisionFilter: {
          category: category2,
          mask: category2,
        },
      })
    );

    this.bodies.push(
      Bodies.rectangle(offsetX + this.w1 / 2 - 230 / 2, offsetY - 315, 230, 5, {
        density: 1.0,
        friction: 1.0,
        restitution: 0.2,
        mass: 9999999,
        inertia: Infinity,
        frictionAir: 0,
        collisionFilter: {
          category: category3,
          mask: category3,
        },
      })
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230,
        offsetY - 315 - 83 / 2,
        2,
        83,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category2,
            mask: category2,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230 - 310 / 2,
        offsetY - 315 - 83,
        310,
        5,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category3,
            mask: category3,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230 - 310,
        offsetY - 315 - 83 + 483 / 2,
        2,
        483,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category4,
            mask: category4,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230 - 310 + 147 / 2,
        offsetY - 315 - 83 + 483,
        147,
        5,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category5,
            mask: category5,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230 - 310 + 147,
        offsetY - 315 - 83 + 483 + 84 / 2,
        2,
        84,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category4,
            mask: category4,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230 - 310 + 147 + 310 / 2,
        offsetY - 315 - 83 + 483 + 84,
        310,
        4,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category5,
            mask: category5,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230 - 310 + 147 + 310,
        offsetY - 315 - 83 + 483 + 84 - 395 / 2,
        6,
        395,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category6,
            mask: category6,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + this.w1 / 2 - 230 - 310 + 147 + 310 - 230 / 2,
        offsetY - 315 - 83 + 483 + 84 - 395,
        230,
        4,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category7,
            mask: category7,
          },
        }
      )
    );

    let lastXP = this.w1 / 2 - 230 - 310 + 147 + 310 - 230;
    let lastYP = -315 - 83 + 483 + 84 - 395;

    this.bodies.push(
      Bodies.rectangle(
        offsetX + lastXP,
        offsetY + lastYP - 26 / 2 - this.add1 / 2,
        6,
        26 + this.add1,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category6,
            mask: category6,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + lastXP - 143 / 2,
        offsetY + lastYP - 26 - this.add1,
        143,
        4,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category7,
            mask: category7,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX + lastXP - 143,
        offsetY + lastYP - 26 - this.add1 / 2 + 253 / 2,
        6,
        253 + this.add1,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category8,
            mask: category8,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX2,
        this.y + this.h2 / 2 + this.mY,
        this.w2 - this.mX * 2,
        4,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category1,
            mask: category1,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX2 + this.w2 / 2 - this.mX,
        this.y,
        2,
        this.h2 + this.mY * 2,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category2,
            mask: category2,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX2,
        this.y - this.h2 / 2 - this.mY,
        this.w2 - this.mX * 2,
        5,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category3,
            mask: category3,
          },
        }
      )
    );

    this.bodies.push(
      Bodies.rectangle(
        offsetX2 - this.w2 / 2 + this.mX,
        this.y,
        6,
        this.h2 + this.mY * 2,
        {
          density: 1.0,
          friction: 1.0,
          restitution: 0.2,
          mass: 9999999,
          inertia: Infinity,
          frictionAir: 0,
          collisionFilter: {
            category: category4,
            mask: category4,
          },
        }
      )
    );

    const pivot = { x: width / 2, y: height / 2 };
    Matter.Composite.rotate(
      { bodies: this.bodies },
      this.initialRotation,
      pivot
    );
    Composite.add(lineComposite, this.bodies);
    Composite.add(world, lineComposite);
  }

  removeBodies() {
    for (let b of this.bodies) {
      Composite.remove(world, b);
    }

    for (let b of this.bodies) {
      Composite.remove(lineComposite, b);
    }

    this.bodies = [];
  }

  display() {
    if (!this.bodies || this.bodies.length === 0) return;

    for (let body of this.bodies) {
      noStroke();
      fill(0);
      beginShape();
      for (const v of body.vertices) {
        vertex(v.x, v.y);
      }
      endShape(CLOSE);
    }
  }
};
