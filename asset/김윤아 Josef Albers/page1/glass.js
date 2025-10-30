class Glass {
  constructor(body, _w, _col) {
    this.body = body;
    this.w = _w;
    this.pixCount = floor(random(3, 4));
    this.pixW = this.w / this.pixCount;
    this.col = _col;
  }

  display() {
    let pos = this.body.position;
    let angle = this.body.angle;

    let base = color(this.col);
    let h = hue(base);
    let s = saturation(base);
    let b = brightness(base);

    let n = noise(pos.x * 0.02, pos.y * 0.02, frameCount * 0.05);
    let flicker = map(n, 0, 1, 0.85, 1.25);
    let newB = b * flicker;

    const threshold = 20;
    const duration = 2000;
    const maxBoost = 2.0;

    for (let i = highlights.length - 1; i >= 0; i--) {
      let hInfo = highlights[i];
      let age = millis() - hInfo.time;

      if (age > duration) {
        highlights.splice(i, 1);
        continue;
      }

      let d = dist(pos.x, pos.y, hInfo.x, hInfo.y);

      if (d < threshold) {
        let intensity = map(d, 0, threshold, 1, 0);
        let fade = map(age, 0, duration, 1, 0);
        let boost = 1 + (maxBoost - 1) * intensity * fade;
        newB = constrain(newB * boost, 0, 100);
      }
    }

    let hueShift = map(
      noise(pos.x * 0.01, pos.y * 0.01, frameCount * 0.02),
      0,
      1,
      -2,
      2
    );
    let newH = (h + hueShift + 360) % 360;

    let newCol = color(newH, s, constrain(newB, 0, 100));

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    noStroke();
    fill(newCol);
    rect(0, 0, this.pixW);
    pop();
  }
}
