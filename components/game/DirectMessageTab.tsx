"use client";

// 1:1 귓속말(DM) 탭 — 본인을 제외한 대상 선택 + 선택된 대상과의 DM만 필터링해 표시
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/game/ChatPanel";
import { cn } from "@/lib/utils";
import type { GameMessage, GamePlayer } from "@/lib/game/types";

interface DirectMessageTabProps {
  players: GamePlayer[];
  currentPlayerId: string;
  messages: GameMessage[];
  disabled?: boolean;
  /** 전송 버튼 클릭 시 호출 (현재 선택된 대상 id와 함께) */
  onSend?: (text: string, recipientId: string) => void;
}

export function DirectMessageTab({
  players,
  currentPlayerId,
  messages,
  disabled,
  onSend,
}: DirectMessageTabProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // 본인을 제외한 대상 목록
  const targets = players.filter((player) => player.id !== currentPlayerId);

  // 선택된 대상과 주고받은 dm 채널 메시지만 필터링
  const dmMessages = messages.filter(
    (message) =>
      message.channel === "dm" &&
      selectedTargetId !== null &&
      ((message.playerId === currentPlayerId && message.recipientId === selectedTargetId) ||
        (message.playerId === selectedTargetId && message.recipientId === currentPlayerId)),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* 대상 선택 영역 */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="귓속말 대상 선택">
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">대화할 수 있는 대상이 없습니다.</p>
        ) : (
          targets.map((target) => {
            const isSelected = target.id === selectedTargetId;
            return (
              <Button
                key={target.id}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className={cn("min-h-11", !target.isAlive && "opacity-60")}
                onClick={() => setSelectedTargetId(target.id)}
                disabled={disabled}
                aria-pressed={isSelected}
              >
                {target.nickname}
              </Button>
            );
          })
        )}
      </div>

      {/* 선택된 대상과의 DM 채팅 패널 */}
      <ChatPanel
        messages={dmMessages}
        currentPlayerId={currentPlayerId}
        disabled={disabled || !selectedTargetId}
        placeholder={selectedTargetId ? "메시지를 입력하세요" : "먼저 대상을 선택하세요"}
        onSend={
          selectedTargetId ? (text) => onSend?.(text, selectedTargetId) : undefined
        }
      />
    </div>
  );
}
