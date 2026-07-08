"use client";

// 밤 행동 패널 — canAct(boolean)만으로 활성화 여부를 결정한다.
// role을 이 컴포넌트에서 import하거나 참조하지 않는다: 레이아웃/문구는 canAct와 무관하게 항상 동일하다.
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GamePlayer } from "@/lib/game/types";

interface ActionPanelProps {
  targets: GamePlayer[];
  /** 행동 가능 여부 — false면 모든 버튼이 비활성화된다 */
  canAct: boolean;
  /** 행동 이름 (예: "제거하기", "조사하기", "보호하기") */
  actionLabel: string;
  onAction: (targetId: string) => void;
}

export function ActionPanel({ targets, canAct, actionLabel, onAction }: ActionPanelProps) {
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
              variant="outline"
              className="min-h-11 w-full justify-start"
              onClick={() => onAction(target.id)}
              disabled={!canAct}
            >
              {target.nickname}
            </Button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
