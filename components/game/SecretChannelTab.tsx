// 비밀 채널 탭 — 모든 참가자에게 동일한 제목/레이아웃으로 렌더링된다 (무차별 UI 원칙)
// membership 값에 따라 채팅 패널에 전달되는 데이터(메시지/플레이스홀더)만 바뀔 뿐,
// 카드 제목·설명·구조는 절대 분기하지 않는다.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatPanel } from "@/components/game/ChatPanel";
import type { GameMessage } from "@/lib/game/types";

/** 비밀 채널 소속 — 이단 팀 / 당회(목사님·장로님) / 소속 없음 */
type SecretChannelMembership = "heretic" | "council" | "none";

interface SecretChannelTabProps {
  membership: SecretChannelMembership;
  messages: GameMessage[];
  currentPlayerId: string;
  /** 페이즈(낮/밤) 등 외부 사정으로 강제 비활성화할지 여부 — 실제 전송 자격은 서버가 최종 검증 */
  disabled?: boolean;
  /** 전송 버튼 클릭 시 호출 */
  onSend?: (text: string) => void;
}

export function SecretChannelTab({
  membership,
  messages,
  currentPlayerId,
  disabled,
  onSend,
}: SecretChannelTabProps) {
  // membership에 따라 데이터만 결정 — 레이아웃/라벨은 항상 동일하게 유지
  const isMember = membership !== "none";
  const panelMessages = isMember ? messages : [];
  const placeholder = isMember ? "메시지를 입력하세요" : "개인 기도 메모";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">비밀 채널</CardTitle>
        <CardDescription>
          이 채널은 특별한 권한을 가진 참가자만 함께 열람할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChatPanel
          messages={panelMessages}
          currentPlayerId={currentPlayerId}
          disabled={!isMember || disabled}
          onSend={onSend}
          placeholder={placeholder}
        />
      </CardContent>
    </Card>
  );
}
