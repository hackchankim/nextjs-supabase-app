// 채팅 말풍선 — system은 중앙 정렬, 그 외에는 isOwn 여부로만 좌/우 정렬 (역할 기반 분기 없음)
import { cn } from "@/lib/utils";
import type { GameMessage } from "@/lib/game/types";

interface ChatBubbleProps {
  message: GameMessage;
  /** 현재 사용자가 보낸 메시지인지 여부 */
  isOwn?: boolean;
  /** 발신자 닉네임 (상대방 메시지 상단에 표시) */
  senderNickname?: string;
}

export function ChatBubble({ message, isOwn, senderNickname }: ChatBubbleProps) {
  // 시스템 메시지 — 중앙 정렬된 안내 스타일
  if (message.channel === "system") {
    return (
      <div className="flex justify-center py-1" role="status">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      {!isOwn && senderNickname && (
        <span className="px-1 text-xs text-muted-foreground">{senderNickname}</span>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words",
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
