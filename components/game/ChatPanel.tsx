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
    // 모바일 키보드 대응(Task 015) — 이 페이지 전체는 고정 높이 레이아웃이 아니라 자연스러운
    // 문서 스크롤 구조라(app/game/layout.tsx의 min-h-svh), 메시지 목록을 flex-1로 부모 높이에
    // 맞춰 늘리는 방식은 부모에 실제 높이가 없어 동작하지 않는다. 대신 목록 자체에 dvh(동적
    // 뷰포트 높이) 기준 높이를 직접 줘서 메시지가 아무리 많아도 이 영역만 내부 스크롤되고,
    // 입력바(shrink-0)는 항상 그 아래 고정 위치에 남아 키보드가 올라와도 가려지지 않는다.
    <div className="flex flex-col gap-3">
      {/* 메시지 목록 영역 — 내부 스크롤 전용, 입력바 높이를 침범하지 않는다.
          390×844 기준 실측(QA) — 상단 콘텐츠(역할 버튼·페이즈 배너·생존 현황·탭)와 합치면
          45dvh는 입력바가 뷰포트 하단 밖으로 ~40px 밀려나 전송 버튼이 잘렸다. 38dvh로
          줄여 초기 로드 시 입력바+전송 버튼이 뷰포트 안에 들어오도록 한다. */}
      <ScrollArea className="h-[38dvh] min-h-48 rounded-md border">
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

      {/* 입력 영역 — shrink-0으로 목록에 밀려 찌그러지지 않게 고정한다 */}
      <div className="flex shrink-0 items-center gap-2">
        <Input
          className="min-h-11"
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
          className="min-h-11 min-w-11"
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
