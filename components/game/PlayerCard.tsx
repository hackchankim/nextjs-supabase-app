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
}

export function PlayerCard({ player, isOnline }: PlayerCardProps) {
  return (
    <Card
      className={cn("w-full transition-opacity", !player.isAlive && "opacity-60")}
      aria-label={`${player.nickname}, ${player.isAlive ? "생존" : "탈락"}`}
    >
      <CardContent className="flex items-center gap-3 p-4">
        {/* 닉네임 이니셜 아바타 — 역할 구분 없이 동일한 모양 */}
        <Avatar>
          <AvatarFallback>{player.nickname.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-sm font-medium leading-none">
            {player.nickname}
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* 생존/탈락 여부만 표시 — 역할 정보 없음 */}
            <Badge variant={player.isAlive ? "secondary" : "outline"}>
              {player.isAlive ? "생존" : "탈락"}
            </Badge>

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
        </div>
      </CardContent>
    </Card>
  );
}
