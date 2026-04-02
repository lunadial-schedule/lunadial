"use client"

import * as React from "react"

/**
 * 모바일 환경에서 뒤로 가기를 눌렀을 때 
 * 브라우저 이전 페이지로 이동하는 대신 모달/시트(Dialog, Drawer 등)를 닫아주는 훅.
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
