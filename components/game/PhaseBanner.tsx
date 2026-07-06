"use client";

// 낮/밤 단계 배너 — 현재 진행 상태와 라운드 번호를 표시
// transitionAt이 있으면 1초 간격으로 남은 초를 계산해 카운트다운을 표시한다. 실제 전환은
// 서버(commitPhaseTransition, lib/game/hooks/useGamePhase.ts)가 transition_at 기준으로
// 확정하므로, 이 컴포넌트의 카운트다운은 어디까지나 로컬 표시용 UX다(전 클라이언트가 같은
// transitionAt을 기준으로 각자 계산하므로 초 단위로 동기화되어 보인다).
import { useEffect, useState } from "react";
import { Clock, Moon, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { GameStatus } from "@/lib/game/types";

interface PhaseBannerProps {
  status: GameStatus;
  phaseNumber: number;
  /** 전환 예정 상태 (카운트다운 중에만 값 존재) */
  transitionTo?: GameStatus | null;
  /** 전환 완료 예정 시각 (ISO 문자열) */
  transitionAt?: string | null;
}

const STATUS_LABELS: Record<GameStatus, string> = {
  waiting: "대기 중",
  day: "낮",
  night: "밤",
  ended: "게임 종료",
};

/** transitionAt(ISO)까지 남은 초를 0 이상 정수로 계산한다. */
function computeRemainingSeconds(transitionAt: string): number {
  const remainingMs = Date.parse(transitionAt) - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function PhaseBanner({
  status,
  phaseNumber,
  transitionTo,
  transitionAt,
}: PhaseBannerProps) {
  const PhaseIcon = status === "night" ? Moon : Sun;

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!transitionAt) return;

    setRemainingSeconds(computeRemainingSeconds(transitionAt));
    const interval = setInterval(() => {
      setRemainingSeconds(computeRemainingSeconds(transitionAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [transitionAt]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <PhaseIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <span className="text-lg font-semibold">{STATUS_LABELS[status]}</span>
          <Badge variant="outline">{phaseNumber}라운드</Badge>
        </div>

        {transitionAt && (
          <div
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>
              곧 {transitionTo ? STATUS_LABELS[transitionTo] : "다음 단계"}이 됩니다 (
              {remainingSeconds}초)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
