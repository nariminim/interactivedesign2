class Bubble {
  // 생성자 함수
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.done = false; //불리언: true or false 상태만 가짐.
    //컬러 변수 생성 함수
    this.c = color(random(255), random(200, 255), 255);
    // Matter 바디 생성
    this.body = Bodies.circle(this.x, this.y, this.r);
    Composite.add(engine.world, this.body);
    this.pos = this.body.position;
  }

  // Bubble클래스의 메서드 정의
  display() {
    stroke(this.c); // 0~255
    noFill();
    // circle(this.x, this.y, this.r);
    circle(this.pos.x, this.pos.y, this.r * 2);
  }

  checkDeath() {
    // || OR 연산자.
    if (this.pos.x < 0 || this.pos.x > width) {
      this.done = true;
      // 엔진에서 matter 바디 제거하기
      Composite.remove(engine.world, this.body);
    }
  }
}
