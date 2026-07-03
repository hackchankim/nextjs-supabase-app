"use client";

// 대기실 (F003 실시간 목록 · F004 역할 배분 · F019 강퇴 · F020 접속 상태)
// 다음 Task에서 Realtime 구독이 추가될 예정이라 미리 client component로 전환.
// 이번 단계에서는 실제 구독 없이 더미 데이터로 정적 UI만 구성한다.
import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/game/PlayerCard";
import { DUMMY_PLAYERS } from "@/lib/game/dummy";
import { MIN_PLAYERS } from "@/lib/game/constants";

/**
 * 데모용 진행자 플래그.
 * Phase 3에서 실제 세션/PIN 기반 판정으로 교체 예정, 지금은 UI 시연용 임시 플래그.
 */
const IS_ADMIN_DEMO = true;

export default function GameWaitingPage() {
  const canStartGame = IS_ADMIN_DEMO && DUMMY_PLAYERS.length >= MIN_PLAYERS;

  return (
    <section className="flex flex-col gap-6" data-route="game-waiting">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">대기실</h1>
        <p className="text-muted-foreground">
          참가자 실시간 목록(F003) · 역할 배분(F004) · 강퇴(F019) · 접속 상태(F020)
        </p>
        <p className="text-sm font-medium">
          현재 인원 {DUMMY_PLAYERS.length} / 최소 {MIN_PLAYERS}명
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {DUMMY_PLAYERS.map((player) => (
          <div key={player.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <PlayerCard player={player} isOnline />
            </div>
            {IS_ADMIN_DEMO && (
              <Button
                variant="destructive"
                size="sm"
                aria-label={`${player.nickname} 강퇴`}
              >
                강퇴
              </Button>
            )}
          </div>
        ))}
      </div>

      {canStartGame && (
        <div className="flex justify-center">
          <Button size="lg">게임 시작</Button>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        참가자를 기다리는 중입니다...
      </p>
    </section>
  );
}
