// 참가자 카드 — 닉네임과 생존 여부만 표시 (역할 정보 노출 없음, 무차별 UI 원칙 준수)
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GamePlayer } from "@/lib/game/types";

interface PlayerCardProps {
  player: GamePlayer;
  /** 온라인 여부 (Realtime Presence 연동 전에는 생략 가능) */
  isOnline?: boolean;
  /** 생존/탈락 배지 표시 여부 (기본 true) — 대기실처럼 게임 시작 전에는 false로 숨긴다 */
  showAliveStatus?: boolean;
}

export function PlayerCard({ player, isOnline, showAliveStatus = true }: PlayerCardProps) {
  return (
    <Card
      className={cn(
        "w-full transition-opacity",
        showAliveStatus && !player.isAlive && "opacity-60",
      )}
      aria-label={
        showAliveStatus
          ? `${player.nickname}, ${player.isAlive ? "생존" : "탈락"}`
          : player.nickname
      }
    >
      <CardContent className="flex items-center gap-3 p-4">
        {/* 닉네임 이니셜 아바타 — 역할 구분 없이 동일한 모양 */}
        <Avatar className="shrink-0">
          <AvatarFallback>{player.nickname.charAt(0)}</AvatarFallback>
        </Avatar>

        {/* 닉네임 — 가운데 유연 영역을 차지해 카드 폭을 채운다 */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {player.nickname}
        </span>

        {/* 상태 배지 — 카드 오른쪽 끝에 정렬 */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {/* 생존/탈락 여부만 표시 — 역할 정보 없음 */}
          {showAliveStatus && (
            <Badge variant={player.isAlive ? "secondary" : "outline"}>
              {player.isAlive ? "생존" : "탈락"}
            </Badge>
          )}

          {isOnline !== undefined && (
            <Badge variant="outline" className="gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                aria-hidden="true"
              />
              {isOnline ? "온라인" : "오프라인"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
