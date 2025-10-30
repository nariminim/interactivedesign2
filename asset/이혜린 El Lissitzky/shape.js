class Bubble {

    constructor(x, y, r) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.done = false;
        this.c = color(random(255), random(255), random(255));
        this.body = Bodies.circle(x, y, r);
        Composite.add(engine.world, this.body);
        this.pos = this.body.position;
    }

    //method
    display() {
        stroke(this.c);
        noFill();
        //circle(this.x, this.y, this.r);
        circle(this.pos.x, this.pos.y, this.r*2);
    }

    checkDeath() {
        if (this.pos.x < 0 || this.pos.x > width) {
            this.done = true;
            Composite.remove(engine.world, this.body);
        }
    }
}