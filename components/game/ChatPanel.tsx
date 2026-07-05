"use client";

// 채팅 패널 — 메시지 목록(ScrollArea) + 하단 입력창/전송 버튼
// disabled=true면 입력창과 전송 버튼이 비활성화된다 (읽기 전용 열람 상태 등에 사용).
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatBubble } from "@/components/game/ChatBubble";
import type { GameMessage } from "@/lib/game/types";

interface ChatPanelProps {
  messages: GameMessage[];
  currentPlayerId: string;
  /** true면 입력창/전송 버튼 비활성화 (권한 없음, 채널 없음 등) */
  disabled?: boolean;
  /** 전송 버튼 클릭 시 호출 (입력값은 컴포넌트 내부에서 초기화) */
  onSend?: (text: string) => void;
  /** 입력창 플레이스홀더 (기본값: "메시지를 입력하세요") */
  placeholder?: string;
}

export function ChatPanel({
  messages,
  currentPlayerId,
  disabled,
  onSend,
  placeholder = "메시지를 입력하세요",
}: ChatPanelProps) {
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가되면 최신 대화가 보이도록 하단으로 스크롤한다.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setValue("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* 메시지 목록 영역 */}
      <ScrollArea className="h-72 flex-1 rounded-md border">
        <div className="flex flex-col gap-2 p-3">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              아직 대화가 없습니다.
            </p>
          ) : (
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.playerId === currentPlayerId}
                senderNickname={message.senderNickname}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* 입력 영역 */}
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="채팅 메시지 입력"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={disabled}
          aria-label="메시지 전송"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
