"use client";

// 게임 플레이 (F005~F011, F014~F017) — 역할 무차별 UI
// 밤 행동 패널의 라벨/문구/외형은 역할과 무관하게 항상 동일해야 한다 (actionLabel="밤 행동" 고정).
import { useState } from "react";
import { MessageSquare, Users, Vote } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionPanel } from "@/components/game/ActionPanel";
import { ChatPanel } from "@/components/game/ChatPanel";
import { DirectMessageTab } from "@/components/game/DirectMessageTab";
import { PhaseBanner } from "@/components/game/PhaseBanner";
import { RoleCard } from "@/components/game/RoleCard";
import { SecretChannelTab } from "@/components/game/SecretChannelTab";
import { VoteButton } from "@/components/game/VoteButton";
import { ROLE_LABELS } from "@/lib/game/constants";
import { DUMMY_MESSAGES, DUMMY_PLAYERS } from "@/lib/game/dummy";
import type { GameStatus, Winner } from "@/lib/game/types";
import { canPerformNightAction, isCouncil, isHeretic } from "@/lib/game/utils";
import { cn } from "@/lib/utils";

/** 데모 컨트롤 노출 여부 — 개발 환경에서만 표시(역할 노출 방지, 프로덕션 빌드에서는 제거) */
const SHOW_DEMO_CONTROLS = process.env.NODE_ENV === "development";

export default function GamePlayPage() {
  // ─────────────────────────────────────────────────────────────
  // 데모 전용 상태 — 실제 게임 로직이 아니다.
  // Phase 3에서 useGameSession/useGameChat 등 Supabase Realtime 기반 훅으로 대체 예정.
  // ─────────────────────────────────────────────────────────────
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(DUMMY_PLAYERS[0].id);
  const [status, setStatus] = useState<GameStatus>("day");
  const [winner, setWinner] = useState<Winner | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [nightActionTargetId, setNightActionTargetId] = useState<string | null>(null);

  const currentPlayer =
    DUMMY_PLAYERS.find((player) => player.id === currentPlayerId) ?? DUMMY_PLAYERS[0];

  // 비밀 채널 소속 계산 — 이단 팀 / 당회(목사님·장로님) / 소속 없음
  const membership = isHeretic(currentPlayer.role)
    ? "heretic"
    : isCouncil(currentPlayer.role)
      ? "council"
      : "none";

  // 생존자 목록(자신 제외) — 낮 투표/밤 행동 공통 대상
  const aliveOthers = DUMMY_PLAYERS.filter(
    (player) => player.isAlive && player.id !== currentPlayerId,
  );

  // 밤 행동 가능 여부 — 외형은 절대 분기하지 않고, 오직 canAct(boolean)로만 활성화 여부 결정.
  // 탈락자는 어떤 역할이든 행동 불가(canPerformNightAction이 isAlive까지 검사).
  const canAct = canPerformNightAction(currentPlayer.role, currentPlayer.isAlive);

  // 팀별 생존 집계 — 개별 역할이 아닌 "팀 인원수"만 공개하므로 무차별 UI 원칙과 충돌하지 않는다.
  // Phase 3에서는 서버가 개별 역할을 노출하지 않고 팀 집계만 내려주도록 해야 한다.
  const alivePlayers = DUMMY_PLAYERS.filter((player) => player.isAlive);
  const aliveHereticCount = alivePlayers.filter((player) => isHeretic(player.role)).length;
  const aliveCommunityCount = alivePlayers.length - aliveHereticCount;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4" data-route="game-play">
      <div className="text-center">
        <h1 className="text-2xl font-bold">게임 플레이</h1>
        <p className="text-muted-foreground">
          역할 카드 · 페이즈 · 채팅(전체/비밀/1:1) · 투표 · 밤 행동 (F005~F011, F014~F017)
        </p>
      </div>

      {/* 데모 컨트롤 — 개발 환경에서만 노출(역할이 보이므로 프로덕션에는 렌더링 금지).
          실제 게임 로직 아님. Phase 3에서 useGameSession/useGameChat 등으로 대체 예정 */}
      {SHOW_DEMO_CONTROLS && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            ⚠️ 개발용 데모 컨트롤 (참가자에게는 보이지 않음 · 프로덕션 빌드에서 자동 제거)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">보기 시점(데모):</span>
            {DUMMY_PLAYERS.map((player) => (
              <Button
                key={player.id}
                type="button"
                size="sm"
                variant={player.id === currentPlayerId ? "default" : "outline"}
                onClick={() => setCurrentPlayerId(player.id)}
              >
                {player.nickname} ({ROLE_LABELS[player.role ?? "saint"]})
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">페이즈(데모):</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setStatus((prev) => (prev === "day" ? "night" : "day"))}
            >
              낮/밤 전환 (현재: {status === "day" ? "낮" : "밤"})
            </Button>

            <span className="ml-4 text-sm font-medium text-muted-foreground">종료(데모):</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setWinner("saints")}>
              선 팀 승리 처리
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setWinner("heretics")}
            >
              이단 팀 승리 처리
            </Button>
          </div>
        </div>
      )}

      {/* 내 역할 보기 — 버튼 문구는 역할과 무관하게 항상 동일 */}
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="secondary">
            내 역할 보기
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 역할</DialogTitle>
          </DialogHeader>
          {currentPlayer.role && <RoleCard role={currentPlayer.role} />}
        </DialogContent>
      </Dialog>

      {/* 페이즈 배너 */}
      <PhaseBanner status={status} phaseNumber={1} />

      {/* 생존 현황 — 팀별 인원 집계(개별 역할 비노출) + 콤팩트 참가자 칩 */}
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" /> 생존 현황
          </h2>
          <span className="text-sm font-medium">
            공동체 {aliveCommunityCount}명 · 이단 {aliveHereticCount}명 생존
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DUMMY_PLAYERS.map((player) => (
            <span
              key={player.id}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                player.isAlive
                  ? "bg-background"
                  : "text-muted-foreground line-through opacity-60",
              )}
            >
              {player.nickname}
            </span>
          ))}
        </div>
      </div>

      {/* 채팅 — 전체 / 비밀 채널 / 1:1, 트리거 라벨은 역할과 무관하게 항상 동일 */}
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <MessageSquare className="h-4 w-4" aria-hidden="true" /> 채팅
        </h2>
        <Tabs defaultValue="public">
          <TabsList>
            <TabsTrigger value="public">전체</TabsTrigger>
            <TabsTrigger value="secret">비밀 채널</TabsTrigger>
            <TabsTrigger value="dm">1:1</TabsTrigger>
          </TabsList>

          <TabsContent value="public">
            <ChatPanel
              messages={DUMMY_MESSAGES.filter((message) => message.channel === "public")}
              currentPlayerId={currentPlayerId}
              disabled={status === "night"}
            />
          </TabsContent>

          <TabsContent value="secret">
            <SecretChannelTab
              membership={membership}
              messages={DUMMY_MESSAGES.filter((message) => message.channel === membership)}
              currentPlayerId={currentPlayerId}
            />
          </TabsContent>

          <TabsContent value="dm">
            <DirectMessageTab
              players={DUMMY_PLAYERS}
              currentPlayerId={currentPlayerId}
              messages={DUMMY_MESSAGES.filter((message) => message.channel === "dm")}
              disabled={status === "night" || !currentPlayer.isAlive}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 하단 행동 패널 — 페이즈로만 분기, 역할에 따른 외형 분기 절대 금지 */}
      {status === "day" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Vote className="h-4 w-4" aria-hidden="true" /> 투표
            </CardTitle>
            <CardDescription>
              이단으로 의심되는 사람을 지목하세요. 낮 동안 언제든 바꿀 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {aliveOthers.map((target) => (
              <VoteButton
                key={target.id}
                target={target}
                isSelected={selectedTargetId === target.id}
                onVote={setSelectedTargetId}
                disabled={!currentPlayer.isAlive}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <ActionPanel
            targets={aliveOthers}
            canAct={canAct}
            actionLabel="밤 행동"
            onAction={setNightActionTargetId}
          />
          {nightActionTargetId && (
            <p className="text-center text-sm text-muted-foreground">
              선택됨:{" "}
              {DUMMY_PLAYERS.find((player) => player.id === nightActionTargetId)?.nickname}
            </p>
          )}
        </>
      )}

      {/* 게임 종료 오버레이 — 승리 팀 발표 + 전원 역할 공개 */}
      {winner && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-background/95 p-6">
          <h2 className="text-3xl font-bold">
            {winner === "saints" ? "선 팀 승리!" : "이단 팀 승리!"}
          </h2>

          <div className="grid w-full max-w-md grid-cols-2 gap-2">
            {DUMMY_PLAYERS.map((player) => (
              <div key={player.id} className="rounded-md border p-2 text-center text-sm">
                <p className="font-medium">{player.nickname}</p>
                <p className="text-muted-foreground">
                  {player.role ? ROLE_LABELS[player.role] : "-"}
                </p>
              </div>
            ))}
          </div>

          <Button type="button" onClick={() => setWinner(null)}>
            닫기
          </Button>
        </div>
      )}
    </section>
  );
}
