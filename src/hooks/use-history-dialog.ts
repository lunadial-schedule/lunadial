"use client"

import * as React from "react"

/**
 * 🔄 모바일 뒤로가기 모달/시트 제어 훅 (useHistoryDialog)
 *
 * [역할 및 주의사항]
 * - 모바일 웹 환경에서 뒤로가기 제스처(스와이프/버튼)를 누를 때, 페이지를 이탈하지 않고
 *   열려있는 모달/드로어(Drawer, Sheet, Dialog)만 닫게 해주는 상태 관리 훅입니다.
 * 
 * [원리 및 중요 분기]
 * - 모달이 열리면(isOpen === true) 의도적으로 `window.history.pushState`를 발생시켜 브라우저 히스토리를 1칸 쌓습니다.
 * - 이후 사용자가 뒤로가기를 실행하면 `popstate` 이벤트가 트리거되며, 브라우저가 이전 페이지로 가는 대신 모달의 `setIsOpen(false)`만 실행시킵니다.
 *
 * ⚠️ 수정 시 주의 시나리오 (필수 테스트):
 * - 바탕 화면을 클릭하여 모달을 닫을 경우: popstate가 발생하지 않으므로 히스토리에 쌓인 잉여 상태를 제거하기 위해
 *   의도된 `window.history.back()` 강제 실행 로직이 포함되어 있습니다. 이 부분이 꼬이면 무한 뒤로가기 지옥에 빠지니 조심하세요.
 */
export function useHistoryDialog(
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  dialogId: string
) {
  const setIsOpenRef = React.useRef(setIsOpen);
  React.useEffect(() => {
    setIsOpenRef.current = setIsOpen;
  }, [setIsOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    // 방어코드: 이미 동일한 상태가 있으면 push하지 않음
    if (window.history.state?.dialogId !== dialogId) {
      window.history.pushState({ dialogId }, "");
    }

    const handlePopState = (e: PopStateEvent) => {
      // 뒤로가기로 인해 popstate가 발생했고, 모달이 열려있다면 닫아줌
      setIsOpenRef.current(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      
      // 언마운트 되거나 모달이 닫힐 때, 현재 history 상단이 해당 모달 state라면 history를 하나 되돌림
      // (예: 닫기/배경 클릭 등으로 닫힌 경우 history 상태를 정돈해주기 위함)
      if (window.history.state?.dialogId === dialogId) {
        window.history.back();
      }
    };
  }, [isOpen, dialogId]);
}
