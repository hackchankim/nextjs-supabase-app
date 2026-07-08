"use client";

// 오프라인 감지 + Realtime 복구 공용 훅 (Task 015 모바일 UX) — 모바일 브라우저는 화면을 끄거나
// 앱을 백그라운드로 보내면 OS가 소켓을 끊어버리는데, supabase-js의 realtime 클라이언트가 항상
// 그 단절을 깨끗하게 감지하고 재구독하는 것은 아니다(특히 iOS Safari에서 탭이 장시간 hidden
// 상태였다가 복귀하는 경우). 따라서 "네트워크가 끊겼다/살아났다"와 "탭이 백그라운드에서
// 돌아왔다"는 두 신호를 이 훅이 직접 감지해 recoveryKey를 증가시키고, 그 값을 각 실데이터 훅의
// useEffect 의존성 배열에 흘려보내 스냅샷 재조회 + 채널 재구독을 강제한다(각 훅 내부 구조는
// 그대로 두고 "다시 마운트된 것처럼" 만드는 최소 침습적 신호일 뿐이다).
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UseNetworkRecoveryResult {
  /** 현재 온라인 여부 (navigator.onLine 기준) */
  isOnline: boolean;
  /**
   * 온라인 복귀 또는 탭 visible 복귀 때마다 증가하는 카운터. 실시간 데이터 훅의
   * useEffect 의존성에 그대로 추가하면 스냅샷 재조회 + 채널 재구독이 트리거된다.
   */
  recoveryKey: number;
}

export function useNetworkRecovery(): UseNetworkRecoveryResult {
  // 서버 렌더링 시점엔 navigator가 없으므로 true로 시작하고, 마운트 후 실제 값으로 보정한다.
  const [isOnline, setIsOnline] = useState(true);
  const [recoveryKey, setRecoveryKey] = useState(0);

  // 탭이 hidden→visible로 돌아올 때만 recoveryKey를 올리기 위해 직전 visibility 상태를 추적한다.
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    wasHiddenRef.current = document.visibilityState === "hidden";

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("오프라인 상태입니다. 네트워크를 확인해주세요.");
    };

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("재연결되었습니다.");
      setRecoveryKey((prev) => prev + 1);
    };

    // 백그라운드(hidden) 복귀 시에도 놓친 델타를 복원해야 하지만, visible로 돌아올 때마다
    // 토스트를 띄우면 탭 전환할 때마다 알림이 뜨는 셈이라 시끄럽다 — 토스트는 온라인 복귀
    // (handleOnline) 때만 띄우고, 여기서는 recoveryKey만 조용히 올린다.
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === "hidden";
      if (!isHidden && wasHiddenRef.current) {
        setRecoveryKey((prev) => prev + 1);
      }
      wasHiddenRef.current = isHidden;
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { isOnline, recoveryKey };
}
