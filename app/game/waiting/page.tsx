"use client";

// 대기실 (F003 실시간 목록 · F004 역할 배분 · F019 강퇴 · F020 접속 상태)
// 다음 Task에서 Realtime 구독이 추가될 예정이라 미리 client component로 전환.
// 이번 단계에서는 실제 구독 없이 더미 데이터로 정적 UI만 구성한다.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/game/PlayerCard";
import { DUMMY_PLAYERS } from "@/lib/game/dummy";
import { MIN_PLAYERS } from "@/lib/game/constants";

/** 데모 컨트롤 노출 여부 — 개발 환경에서만 표시(프로덕션 빌드에서는 제거) */
const SHOW_DEMO_CONTROLS = process.env.NODE_ENV === "development";

export default function GameWaitingPage() {
  // 데모: 진행자/참가자 시점 전환.
  // 개발 환경은 진행자 시점으로 시작(토글로 전환), 프로덕션은 참가자 시점으로 고정(버튼 미노출).
  // Phase 3에서 실제 세션/PIN 기반 판정으로 대체 예정.
  const [isAdminView, setIsAdminView] = useState(SHOW_DEMO_CONTROLS);
  const canStartGame = isAdminView && DUMMY_PLAYERS.length >= MIN_PLAYERS;

  return (
    <section className="flex flex-col gap-6" data-route="game-waiting">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">대기실</h1>
        <p className="text-muted-foreground">
          참가자들이 모두 모이면 진행자가 게임을 시작합니다.
        </p>
        <p className="text-sm font-medium">
          현재 인원 {DUMMY_PLAYERS.length} / 최소 {MIN_PLAYERS}명
        </p>
      </div>

      {/* 데모 컨트롤 — 개발 환경에서만 노출(프로덕션 빌드에서 자동 제거).
          진행자/참가자 시점에 따라 강퇴·게임 시작 버튼 노출이 달라지는 것을 확인하기 위한 용도 */}
      {SHOW_DEMO_CONTROLS && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            ⚠️ 개발용 데모 컨트롤 (참가자에게는 보이지 않음 · 프로덕션 빌드에서 자동 제거)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">시점:</span>
            <Button
              type="button"
              size="sm"
              variant={isAdminView ? "default" : "outline"}
              onClick={() => setIsAdminView(true)}
            >
              진행자 시점
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!isAdminView ? "default" : "outline"}
              onClick={() => setIsAdminView(false)}
            >
              참가자 시점
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {DUMMY_PLAYERS.map((player) => (
          <div key={player.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {/* 대기실은 게임 시작 전이라 생존/탈락 배지를 숨기고 접속 상태만 표시 */}
              <PlayerCard player={player} isOnline showAliveStatus={false} />
            </div>
            {/* 강퇴는 진행자 전용 — 참가자 시점에서는 노출되지 않는다 */}
            {isAdminView && (
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

      {/* 게임 시작도 진행자 전용 — 참가자 시점에서는 노출되지 않는다 */}
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
