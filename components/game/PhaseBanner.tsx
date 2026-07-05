// 낮/밤 단계 배너 — 현재 진행 상태와 라운드 번호를 표시
// transitionAt이 있으면 카운트다운 표시 영역만 마련 (실제 타이머 로직은 이후 Phase에서 구현)
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

export function PhaseBanner({
  status,
  phaseNumber,
  transitionTo,
  transitionAt,
}: PhaseBannerProps) {
  const PhaseIcon = status === "night" ? Moon : Sun;

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
            {/* TODO: transitionAt 기준 실시간 카운트다운 로직 구현 필요 */}
            <span>
              {transitionTo ? STATUS_LABELS[transitionTo] : "다음 단계"}(으)로 전환
              대기 중
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
