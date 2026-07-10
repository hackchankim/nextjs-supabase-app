"use client";

// 카카오톡 인앱 브라우저 우회 — 카카오톡으로 공유된 초대 링크/QR코드를 탭하면
// 카카오톡 인앱 브라우저(webview)로 열리는데, 이 webview는 localStorage 등 일부
// 동작이 불안정해 세션 토큰에 의존하는 이 게임과 충돌할 수 있다(F022).
//
// 판정 방식을 용도별로 분리한다:
// - isKakaoInAppBrowser(): 항상 그 자리에서 실시간으로 UA를 재검사하는 순수 함수.
//   React state/렌더 타이밍에 전혀 의존하지 않으므로, 컴포넌트가 언제 리마운트되든
//   호출 시점의 정확한 값을 즉시 준다 — 재접속 게이트처럼 "한 프레임이라도 잘못된
//   값으로 새어나가면 안 되는" 차단 로직은 반드시 이 함수를 직접 불러써야 한다.
// - useKakaoInAppRedirect(): 화면 표시(입장 폼 vs 안내 문구)용 훅. 최초 렌더는
//   서버(HTML엔 window가 없음)와 동일하게 false로 시작한 뒤 마운트 후에만 true로
//   바꿔 하이드레이션 불일치를 피한다 — 순수 렌더링 목적이라 값이 한 커밋 늦게
//   반영돼도 무해하다.
import { useEffect, useState } from "react";

const KAKAOTALK_UA_PATTERN = /kakaotalk/i;

/** 지금 이 순간의 카카오톡 인앱 브라우저 여부를 동기적으로 재판정한다(SSR 시 false). */
export function isKakaoInAppBrowser(): boolean {
  return typeof window !== "undefined" && KAKAOTALK_UA_PATTERN.test(window.navigator.userAgent);
}

/**
 * 카카오톡 인앱 브라우저로 접속했으면 카카오 공식 문서 기준 스킴
 * kakaotalk://web/openExternal로 즉시 기본 브라우저(사파리/크롬)를 연다.
 * 외부 브라우저에서는 UA에 KAKAOTALK이 없으므로 재실행돼도 조건이 거짓이라 루프 없음.
 *
 * 반환값은 오직 **화면에 무엇을 그릴지** 결정하는 용도다(하이드레이션 안전하게
 * false로 시작 → 마운트 후 true). 다른 로직을 막는 게이트로 이 반환값을 쓰지 말고
 * `isKakaoInAppBrowser()`를 직접 호출할 것.
 */
export function useKakaoInAppRedirect(): boolean {
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isKakaoInAppBrowser()) return;
    setIsRedirecting(true);
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
  }, []);

  return isRedirecting;
}
