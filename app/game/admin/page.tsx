"use client";

// 진행자 대시보드 (F004, F006, F009, F011~F014, F017~F020)
//
// 참가자 화면(입장/대기실/게임플레이)과 달리 이 페이지는 진행자 전용이므로
// 무차별 UI 원칙이 적용되지 않는다.
// - [스크린] 탭: 참가자도 함께 볼 수 있는 공개 화면(빔프로젝터)이다.
//   PlayerCard를 그대로 재사용하면 role을 props로 받지 않으므로 역할 노출 없이 안전하다.
// - [제어] 탭: 진행자만 보는 화면이므로 역할을 표로 노출하는 것이 스펙상 정상 동작이다.
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhaseBanner } from "@/components/game/PhaseBanner";
import { PlayerCard } from "@/components/game/PlayerCard";
import { ROLE_LABELS } from "@/lib/game/constants";
import { DUMMY_PLAYERS, DUMMY_VOTES } from "@/lib/game/dummy";
import type { GamePlayer, GameStatus, PlayerRole } from "@/lib/game/types";

/** 밤 행동 권한 보유 역할 (이단 대장 · 목사님 · 권사님) */
const NIGHT_ACTION_ROLES: readonly PlayerRole[] = ["heretic_leader", "pastor", "deaconess"];

export default function GameAdminPage() {
  // ─────────────────────────────────────────────────────────────
  // 데모 상태 — 실제 게임 로직이 아니다.
  // Phase 3에서 실제 Server Action/Realtime으로 대체 예정.
  // ─────────────────────────────────────────────────────────────
  const [players, setPlayers] = useState<GamePlayer[]>(DUMMY_PLAYERS);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(
    () => new Set(DUMMY_PLAYERS.map((player) => player.id)),
  );
  const [status, setStatus] = useState<GameStatus>("day");
  const [transitionTo, setTransitionTo] = useState<GameStatus | null>(null);
  const [transitionAt, setTransitionAt] = useState<string | null>(null);
  const [systemMessage, setSystemMessage] = useState("");
  const [nightChecklist, setNightChecklist] = useState<Record<string, boolean>>({});

  const aliveCount = players.filter((player) => player.isAlive).length;
  const voteCount = new Set(DUMMY_VOTES.map((vote) => vote.voterId)).size;
  const voteProgress = aliveCount > 0 ? (voteCount / aliveCount) * 100 : 0;

  // 밤 행동 권한 보유 역할만 체크리스트에 나열
  const nightActors = players.filter(
    (player) => player.role && NIGHT_ACTION_ROLES.includes(player.role),
  );

  // 탈락 처리 — 생존 여부 토글 (데모, 실제로는 Phase 3에서 Server Action으로 대체)
  function handleToggleAlive(playerId: string) {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, isAlive: !player.isAlive } : player,
      ),
    );
  }

  // 강퇴 — 탈락 처리 + 접속 상태 오프라인 처리 (데모)
  function handleKick(playerId: string) {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, isAlive: false } : player,
      ),
    );
    setOnlineIds((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
  }

  // 페이즈 전환 요청 — 반대 상태로 전환 예약만 하고 실제 전환은 하지 않는다.
  // 초 단위 카운트다운/자동 전환 로직은 Phase 3에서 구현 예정.
  function handleRequestTransition() {
    const next: GameStatus = status === "day" ? "night" : "day";
    setTransitionTo(next);
    setTransitionAt(new Date().toISOString());
  }

  function handleCancelTransition() {
    setTransitionTo(null);
    setTransitionAt(null);
  }

  function handleToggleNightAction(playerId: string) {
    setNightChecklist((prev) => ({ ...prev, [playerId]: !prev[playerId] }));
  }

  function handleReset() {
    setPlayers(DUMMY_PLAYERS);
    setOnlineIds(new Set(DUMMY_PLAYERS.map((player) => player.id)));
    setStatus("day");
    setTransitionTo(null);
    setTransitionAt(null);
    setSystemMessage("");
    setNightChecklist({});
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4" data-route="game-admin">
      <div className="text-center">
        <h1 className="text-2xl font-bold">진행자 대시보드</h1>
        <p className="text-muted-foreground">
          스크린 화면은 참가자에게 공유하고, 제어판으로 게임을 진행하세요.
        </p>
      </div>

      <Tabs defaultValue="screen">
        <TabsList>
          <TabsTrigger value="screen">스크린</TabsTrigger>
          <TabsTrigger value="control">제어</TabsTrigger>
        </TabsList>

        {/* 스크린 탭 — 참가자도 함께 보는 공개 화면(빔프로젝터). 역할 노출 금지 */}
        <TabsContent value="screen" className="flex flex-col gap-4">
          <PhaseBanner
            status={status}
            phaseNumber={1}
            transitionTo={transitionTo}
            transitionAt={transitionAt}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">투표 현황</span>
            <Progress value={voteProgress} />
            <span className="text-sm text-muted-foreground">
              {voteCount}/{aliveCount}명 투표 완료
            </span>
          </div>
        </TabsContent>

        {/* 제어 탭 — 진행자 전용 화면. 역할을 표로 노출하는 것이 스펙상 정상 동작 */}
        <TabsContent value="control" className="flex flex-col gap-6">
          {/* 참가자 관리 표 (닉네임 / 역할 / 생존 여부 / 접속 상태 + 탈락 처리/강퇴) */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-medium" scope="col">닉네임</th>
                  <th className="p-2 font-medium" scope="col">역할</th>
                  <th className="p-2 font-medium" scope="col">생존</th>
                  <th className="p-2 font-medium" scope="col">접속</th>
                  <th className="p-2 font-medium text-right" scope="col">관리</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-t">
                    <td className="p-2">{player.nickname}</td>
                    <td className="p-2">{player.role ? ROLE_LABELS[player.role] : "-"}</td>
                    <td className="p-2">
                      <Badge variant={player.isAlive ? "secondary" : "outline"}>
                        {player.isAlive ? "생존" : "탈락"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                          aria-hidden="true"
                        />
                        {onlineIds.has(player.id) ? "온라인" : "오프라인"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAlive(player.id)}
                        >
                          {player.isAlive ? "탈락 처리" : "부활 처리"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleKick(player.id)}
                        >
                          강퇴
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이즈 전환 제어 */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">페이즈 전환</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleRequestTransition} disabled={!!transitionTo}>
                {status === "day" ? "밤으로 전환" : "낮으로 전환"}
              </Button>
              {transitionTo && (
                <>
                  <span className="text-sm text-muted-foreground">전환 대기 중...</span>
                  <Button type="button" variant="outline" onClick={handleCancelTransition}>
                    전환 취소
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 투표 마감 제어 */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">투표 진행률</span>
            <Progress value={voteProgress} />
            <span className="text-sm text-muted-foreground">
              {voteCount}/{aliveCount}명 투표 완료
            </span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled title="Phase 3에서 Server Action으로 구현 예정">
                투표 마감
              </Button>
              <Button type="button" variant="outline" disabled={voteCount !== aliveCount}>
                투표 조기 종료
              </Button>
            </div>
          </div>

          {/* 밤 행동 완료 체크리스트 (이단 대장 · 목사님 · 권사님) */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">
              밤 행동 완료 체크리스트
            </span>
            {nightActors.map((actor) => (
              <label key={actor.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!nightChecklist[actor.id]}
                  onCheckedChange={() => handleToggleNightAction(actor.id)}
                />
                {actor.nickname} ({actor.role ? ROLE_LABELS[actor.role] : "-"})
              </label>
            ))}
          </div>

          {/* 시스템 메시지 발송 (데모, 실제 발송 로직 없음) */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">시스템 메시지</span>
            <div className="flex gap-2">
              <Input
                value={systemMessage}
                onChange={(event) => setSystemMessage(event.target.value)}
                placeholder="전체 참가자에게 보낼 메시지를 입력하세요"
              />
              <Button type="button" disabled title="Phase 3에서 Server Action으로 구현 예정">
                전송
              </Button>
            </div>
          </div>

          {/* 게임 종료 / 리셋 (데모) */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled
              title="Phase 3에서 Server Action으로 구현 예정"
            >
              게임 종료
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              리셋
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
