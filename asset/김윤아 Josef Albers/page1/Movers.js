class Mover {
  constructor(x, y, w, tx, ty) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.restTime = int(random(0));
    this.timings = [];
    let t = 0;
    for (let i = 0; i < 10; i++) {
      this.timings.push(t);
      t += 1.5;
    }

    this.curX1 = this.x;
    this.curY1 = this.y;
    this.curX2 = this.x;
    this.curY2 = this.y;

    this.init(tx, ty);

    this.clrs = moverPalette.slice();
    shuffle(this.clrs, true);

    this.pixelW = this.w;

    this.timer = 0;

    this.moveCount = 0;
    this.isDone = false;
  }

  show() {
    strokeCap(PROJECT);
    strokeWeight(this.pixelW);
    stroke(this.clrs[1]);
    line(this.curX1, this.curY1, this.curX2, this.curY2);
  }

  update() {
    if (this.timings[0] < this.timer && this.timer < this.timings[3]) {
      let nrm = norm(this.timer, this.timings[0], this.timings[3] - 1);
      this.curX1 = lerp(this.orgX, this.tgtX, easeInOutQuint(nrm));
      this.curY1 = lerp(this.orgY, this.tgtY, easeInOutQuint(nrm));
    }
    if (this.timings[1] < this.timer && this.timer < this.timings[4]) {
      let nrm = norm(this.timer, this.timings[1], this.timings[4] - 1);
      this.curX2 = lerp(this.orgX, this.tgtX, easeInOutQuint(nrm));
      this.curY2 = lerp(this.orgY, this.tgtY, easeInOutQuint(nrm));
    }
    if (this.timings[4] < this.timer) {
      this.moveCount++;

      if (this.moveCount >= 4) {
        this.isDone = true;
      } else {
        this.init();
      }
    }
    this.timer++;
  }

  init(tx, ty) {
    this.orgX = this.curX1;
    this.orgY = this.curY1;
    let r = floor(random(1, 1)) * gridCountW;

    let isFirstMove = tx !== undefined && ty !== undefined;

    if (isFirstMove) {
      let angle = atan2(this.orgY - ty, this.orgX - tx);
      this.moveDir = round(angle / (TAU / 4)) * (TAU / 4);
    } else if (this.moveDir === undefined) {
      this.moveDir = int(random(4)) * (TAU / 4);
    }

    this.direction = this.moveDir;

    this.tgtX = this.orgX + r * cos(this.direction);
    this.tgtY = this.orgY + r * sin(this.direction);

    let isOutOfBounds =
      this.tgtX < centerX - (gridCountW * gridCountCol) / 2 ||
      this.tgtX > centerX + (gridCountW * gridCountCol) / 2 ||
      this.tgtY < centerY - (gridCountW * gridCountRow) / 2 ||
      this.tgtY > centerY + (gridCountW * gridCountRow) / 2;

    if (isOutOfBounds) {
      this.moveDir = (this.moveDir + PI) % TAU;
      this.direction = this.moveDir;

      this.tgtX = this.orgX + r * cos(this.direction);
      this.tgtY = this.orgY + r * sin(this.direction);
    }

    this.timer = -this.restTime;
  }

  run() {
    this.show();
    this.update();
  }
}
