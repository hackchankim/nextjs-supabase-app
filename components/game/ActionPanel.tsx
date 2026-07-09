"use client";

// 밤 행동 패널 — canAct(boolean)만으로 활성화 여부를 결정한다.
// role을 이 컴포넌트에서 import하거나 참조하지 않는다: 레이아웃/문구는 canAct와 무관하게 항상 동일하다.
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GamePlayer } from "@/lib/game/types";

interface ActionPanelProps {
  targets: GamePlayer[];
  /** 행동 가능 여부 — false면 모든 버튼이 비활성화된다 */
  canAct: boolean;
  /** 행동 이름 (예: "제거하기", "조사하기", "보호하기") */
  actionLabel: string;
  /** 이번 phase에 본인 밤 행동을 이미 확정했는지 여부 — true면 선택/확정 모두 잠긴다 */
  locked: boolean;
  /** 확정된 대상 id (locked가 false면 null) */
  lockedTargetId: string | null;
  /** 확정된 대상의 닉네임 — targets(생존자만)가 아닌 전체 참가자 기준으로 호출부가 조회해
   *  넘겨준다. 밤 사이 대상이 탈락 처리되면 targets에서 사라지므로, 이 컴포넌트 내부에서
   *  targets.find로 계산하면 "확정됨:" 문구의 닉네임이 빈칸이 되는 문제를 피하기 위함이다. */
  lockedTargetNickname?: string | null;
  /** 목사님(pastor)의 조사 결과 — investigate 확정 시에만 채워진다 */
  investigationResult?: "heretic" | "saint" | null;
  onConfirm: (targetId: string) => void;
}

export function ActionPanel({
  targets,
  canAct,
  actionLabel,
  locked,
  lockedTargetId,
  lockedTargetNickname,
  investigationResult,
  onConfirm,
}: ActionPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 확정 직후·재접속 복원 모두 lockedTargetId로 선택 상태를 동기화한다.
  useEffect(() => {
    if (locked && lockedTargetId) {
      setSelectedId(lockedTargetId);
    }
  }, [locked, lockedTargetId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{actionLabel}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {targets.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            선택할 수 있는 대상이 없습니다.
          </p>
        ) : (
          targets.map((target) => (
            <Button
              key={target.id}
              type="button"
              variant={selectedId === target.id ? "default" : "outline"}
              className="min-h-11 w-full justify-start"
              onClick={() => setSelectedId(target.id)}
              disabled={!canAct || locked}
            >
              {target.nickname}
            </Button>
          ))
        )}
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={!canAct || locked || !selectedId}
          onClick={() => selectedId && onConfirm(selectedId)}
        >
          확정하기
        </Button>
        {locked && (
          <p className="text-center text-sm text-muted-foreground">
            확정됨: {lockedTargetNickname}
            {investigationResult &&
              ` · 조사 결과: ${investigationResult === "heretic" ? "이단입니다" : "성도입니다"}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
