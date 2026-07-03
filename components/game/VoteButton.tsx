"use client";

// 투표 버튼 — isSelected(boolean)만으로 선택 상태를 표시한다.
// 역할(role)을 직접 참조하지 않는다: 활성화 여부는 호출하는 쪽이 disabled prop으로 결정한다.
import { Button } from "@/components/ui/button";
import type { GamePlayer } from "@/lib/game/types";

interface VoteButtonProps {
  target: GamePlayer;
  /** 현재 이 대상에게 투표했는지 여부 */
  isSelected: boolean;
  onVote: (id: string) => void;
  disabled?: boolean;
}

export function VoteButton({ target, isSelected, onVote, disabled }: VoteButtonProps) {
  return (
    <Button
      type="button"
      variant={isSelected ? "default" : "outline"}
      className="w-full justify-start"
      onClick={() => onVote(target.id)}
      disabled={disabled}
      aria-pressed={isSelected}
    >
      {target.nickname}
    </Button>
  );
}
