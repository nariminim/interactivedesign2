// 메인 스케치 관리자 - 이벤트·루프 중앙화
import * as CDPlayer from "./visuals/cd-player.js";
import * as sketchMusic from "./visuals/sketchMusic.js";
import * as sketchAmbient from "./visuals/sketchAmbient.js";
import { eventToCanvasXY } from "./visuals/utils.js";

// 활성 스케치 선택 (music or ambient)
const activeSketch = sketchMusic; // ← 여기서 모드 선택
let p5ref, cnv;

// p5 인스턴스 생성
new p5((p) => {
  p5ref = p;

  p.setup = () => {
    cnv = p.createCanvas(p.windowWidth, p.windowHeight);
    cnv.style("width", "100vw");
    cnv.style("height", "100vh");
    p.pixelDensity(Math.max(1, Math.min(2, window.devicePixelRatio * 0.6)));

    // 활성 스케치 초기화
    activeSketch.setupSketch(p);
  };

  p.draw = () => {
    // 활성 스케치 그리기
    activeSketch.drawSketch(p);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    // 활성 스케치 리사이즈 처리
    activeSketch.resizeSketch(p);
  };
}, document.body);

// DOM pointer events — 중앙에서 한 번만 등록
const target = document.querySelector("canvas");
if (target) {
  target.addEventListener("pointerdown", (e) => {
    activeSketch.onPointerDown(e);
  });

  target.addEventListener("pointermove", (e) => {
    activeSketch.onPointerMove(e);
  });

  target.addEventListener("pointerup", (e) => {
    activeSketch.onPointerUp(e);
  });
}

// 스케치 전환 함수 (필요시 사용)
export function switchToMusicSketch() {
  activeSketch = sketchMusic;
  // 필요시 재초기화
}

export function switchToAmbientSketch() {
  activeSketch = sketchAmbient;
  // 필요시 재초기화
}
