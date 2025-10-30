/**
 * Page Modal Component - 글래스모피즘 스타일 모달 컴포넌트
 * 각 페이지의 작품 설명을 표시하는 모달
 */

(function (window) {
  "use strict";

  const PageModal = {
    // 페이지별 설명 데이터
    pageInfo: {
      1: {
        title: "뮤직 플레이어",
        description:
          "CD플레이어 손잡이를 당기면 음악이 재생됩니다. 당기기의 강도에 따라 배경 스파클의의 속도와 음악 속도가 변화하며, 떠다니는 구슬들이 반응합니다. 중앙을 클릭하면 정지되며 구슬들이 순간적으로 반짝입니다.",
        tips: [
          "손잡이를 당겨 음악을 시작하세요.",
          "당기는 거리에 따라 속도가 달라집니다.",
          "마우스 움직임에 구슬이 반응합니다.",
          "중앙을 클릭하면 정지됩니다.",
        ],
      },
      2: {
        title: "공기 청정 플레이어",
        description:
          "손잡이를 당겨 회전시키면 공기 청정 모드가 실행됩니다. 거품들이 낙하하고 상승하며 공기를 정화합니다. 드래그하면서 지나가면 새로운 거품이 생성됩니다.",
        tips: [
          "손잡이를 당겨 회전을 시작하세요.",
          "배경의 스파클을 터치하면 낙하합니다.",
          "하나의 스파클이 사라지면면 밑에서 새 거품이 올라옵니다.",
          "드래그 중 지나간 거품도 터치됩니다.",
        ],
      },
      3: {
        title: "야광스티커 플레이어",
        description:
          "밤하늘의 별자리를, 직접 만들 수 있어요. 이 야광스티커만 있다면요!",
        tips: [
          "화면에 마음껏 그림을 그려주세요.",
          "손잡이를 당기면, 별들이 떨어집니다.",
          "내 그림이 받치지 못한 별들은 사라집니다.",
          "플레이어 중앙 버튼을 누르면, 별들이 별자리를 만듭니다.",
        ],
      },
      4: {
        title: "샤워용 플레이어",
        description: "거품놀이를 하고 시원한 물로 터트려보세요.",
        tips: [
          "배경을 만지면 거품이 나옵니다.",
          "손잡이를 잡아당기면 샤워기에서 물이 나옵니다.",
          "플레이어의 중앙 정지 버튼을 누르면, 뜨거운 열에 의한 수증기 효과가 나타납니다.",
        ],
      },
      5: {
        title: "청소 플레이어어",
        description:
          "먼지를 한 번에 빨아들이고, 물걸레까지 할 수 있는 특별한 청소기.",
        tips: [
          "배경을 만지면 먼지가 떨어집니다.",
          "손잡이를 잡아당기면, 청소기가 먼지를 한 번에 빨아들여요.",
          "플레이어가 돌아가는 동안, 배경을 만지면 물걸레질을 할 수 있습니다.",
          "청소 후 정지 버튼을 눌러서, 반짝임 효과를 감상하세요.",
        ],
      },
      6: {
        title: "드론쇼 플레이어",
        description: "케데헌 드론쇼 이쁘더라... 메시지를 드론에 담아보세요.",
        tips: [
          "화면 아무 곳이나 터치하면 파란 파동이 생성됩니다.",
          "손잡이를 당기면 무지개 모드로 전환됩니다.",
          "무지개 모드에서는 색상이 계속 순환합니다.",
          "중앙 버튼을 누르면 다시 파란색으로 돌아갑니다.",
        ],
      },
    },

    // 모달 DOM 생성
    createModal: function (pageNumber) {
      const info = this.pageInfo[pageNumber] || this.pageInfo[1];

      const modalHTML = `
        <div id="pageModal" class="page-modal" style="display: none;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title">${info.title}</h2>
            </div>
            <div class="modal-body">
              <p class="modal-description">${info.description}</p>
              <div class="modal-tips">
                <h3>이용 방법</h3>
                <ul>
                  ${info.tips.map((tip) => `<li>${tip}</li>`).join("")}
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button class="modal-button" onclick="PageModal.closeModal()">
                체험하기
              </button>
            </div>
          </div>
        </div>
      `;

      // 기존 모달이 있으면 제거
      const existingModal = document.getElementById("pageModal");
      if (existingModal) {
        existingModal.remove();
      }

      // 모달 추가
      document.body.insertAdjacentHTML("beforeend", modalHTML);

      // 스타일이 없으면 추가
      if (!document.getElementById("pageModalStyles")) {
        this.addStyles();
      }

      // 표시
      requestAnimationFrame(() => {
        const modal = document.getElementById("pageModal");
        if (modal) {
          modal.style.display = "block";
          setTimeout(() => {
            modal.classList.add("show");
          }, 10);
        }
      });
    },

    // 모달 스타일 추가
    addStyles: function () {
      const styles = `
        <style id="pageModalStyles">
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
          }

          .page-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.15s ease;
          }

          .page-modal.show {
            opacity: 1;
          }

          .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }

          .modal-content {
            position: fixed; /* 뷰포트 기준 중앙 배치 보장 */
            top: 50%;
            left: 50%;
            max-width: 500px;
            width: 80vw;
            height: auto;
            max-height: 80vh;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3),
                        0 0 0 1px rgba(255, 255, 255, 0.1) inset,
                        0 2px 16px rgba(255, 255, 255, 0.05);
            display: flex;
            flex-direction: column;
            transform: translate(-50%, -50%) scale(0.95);
            transition: transform 0.15s ease;
            overflow: hidden;
            margin: 0;
            pointer-events: auto;
          }

          .page-modal.show .modal-content {
            transform: translate(-50%, -50%) scale(1);
          }

          .modal-header {
            padding: 32px 32px 0;
          }

          .modal-title {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            letter-spacing: -0.5px;
          }

          .modal-body {
            padding: 24px 32px;
            flex: 1;
            overflow-y: auto;
          }

          .modal-description {
            font-size: 16px;
            line-height: 1.7;
            color: rgba(255, 255, 255, 0.9);
            margin: 0 0 24px 0;
          }

          .modal-tips {
            margin-top: 24px;
          }

          .modal-tips h3 {
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 16px 0;
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          }

          .modal-tips ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .modal-tips li {
            font-size: 15px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.85);
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
          }

          .modal-tips li::before {
            content: "•";
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.6);
            font-size: 16px;
            line-height: 1.6;
          }

          .modal-footer {
            padding: 20px 32px 32px;
          }

          .modal-button {
            width: 100%;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 600;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          .modal-button::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.15) 0%,
              rgba(255, 255, 255, 0.05) 50%,
              rgba(255, 255, 255, 0.15) 100%
            );
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .modal-button:hover::before {
            opacity: 1;
          }

          .modal-button:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.35);
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }

          .modal-button:active {
            transform: translateY(0);
            background: rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15);
          }

          /* 모바일 대응 */
          @media (max-width: 768px) {
            .modal-content {
              width: 90vw;
              max-height: 90vh;
              border-radius: 20px;
            }

            .modal-header {
              padding: 24px 24px 0;
            }

            .modal-title {
              font-size: 24px;
            }

            .modal-body {
              padding: 20px 24px;
            }

            .modal-description {
              font-size: 15px;
            }

            .modal-tips h3 {
              font-size: 16px;
            }

            .modal-tips li {
              font-size: 14px;
              padding: 8px 0;
              padding-left: 28px; /* 모바일에서 불릿과 텍스트 간 여유 확보 */
            }

            .modal-tips li::before {
              left: 6px; /* 화면이 좁을 때 불릿을 약간 안쪽으로 */
              font-size: 14px;
            }

            .modal-footer {
              padding: 16px 24px 24px;
            }

            .modal-button {
              padding: 14px 28px;
              font-size: 15px;
            }
          }

          @media (max-width: 480px) {
            .modal-content {
              width: 90vw;
              max-height: 95vh;
              border-radius: 16px;
            }

            .modal-header {
              padding: 20px 20px 0;
            }

            .modal-title {
              font-size: 22px;
            }

            .modal-body {
              padding: 16px 20px;
            }

            .modal-description {
              font-size: 14px;
              line-height: 1.6;
            }

            .modal-tips h3 {
              font-size: 15px;
            }

            .modal-tips li {
              font-size: 13px;
              padding: 6px 0;
              padding-left: 30px; /* 더 좁은 화면에서 여유 추가 */
            }

            .modal-tips li::before {
              left: 6px;
              font-size: 13px;
            }

            .modal-footer {
              padding: 14px 20px 20px;
            }

            .modal-button {
              padding: 12px 24px;
              font-size: 14px;
              border-radius: 10px;
            }
          }
        </style>
      `;

      document.head.insertAdjacentHTML("beforeend", styles);
    },

    // 모달 닫기
    closeModal: function () {
      const modal = document.getElementById("pageModal");
      if (modal) {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.remove();
        }, 300);
      }
    },

    // 페이지 번호 자동 감지 및 모달 표시
    showModalForCurrentPage: function () {
      // URL에서 페이지 번호 추출
      const pathMatch = window.location.pathname.match(/page(\d+)/);
      const pageNumber = pathMatch ? parseInt(pathMatch[1], 10) : 1;

      // 로컬스토리지에 모달 표시 여부 확인
      const modalKey = `modal_shown_${pageNumber}`;
      const hasShown = localStorage.getItem(modalKey);

      // 이 페이지에서 이미 모달을 보여줬는지 확인
      if (!hasShown) {
        // 로컬스토리지에 표시 기록
        localStorage.setItem(modalKey, "true");

        // 페이지 로드 후 모달 표시
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => {
            setTimeout(() => this.createModal(pageNumber), 200);
          });
        } else {
          setTimeout(() => this.createModal(pageNumber), 200);
        }
      }
    },

    // 특정 페이지 번호로 모달 강제 표시 (디버깅용)
    forceShow: function (pageNumber) {
      this.createModal(pageNumber);
    },

    // 모든 모달 표시 기록 초기화
    resetAll: function () {
      for (let i = 1; i <= 6; i++) {
        localStorage.removeItem(`modal_shown_${i}`);
      }
    },
  };

  // 전역으로 노출
  window.PageModal = PageModal;
})(window);
