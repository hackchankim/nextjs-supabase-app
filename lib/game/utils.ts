// 교회 마피아 게임 — 순수 함수 유틸 (역할 배분·그룹 판별·승리 조건)
import type { GamePlayer, PlayerRole, RoleDistribution, Winner } from "./types";
import { COUNCIL_ROLES, HERETIC_ROLES, MAX_PLAYERS, MIN_PLAYERS } from "./constants";

/**
 * 인원수 기반 역할 배분 계산 (10~20명).
 * 대표점(10/15/20)과 일치: heretic=floor(n/5), 이단대장·목사님·권사님 각 1,
 * 장로님 n<13 ? 1 : 2, 나머지는 성도.
 */
export function getRoleDistribution(playerCount: number): RoleDistribution {
  const n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, playerCount));
  const heretic = Math.floor(n / 5);
  const heretic_leader = 1;
  const pastor = 1;
  const deaconess = 1;
  const elder = n < 13 ? 1 : 2;
  const saint = n - (heretic + heretic_leader + pastor + deaconess + elder);
  return { heretic, heretic_leader, pastor, elder, deaconess, saint };
}

/** 배분표를 역할 배열로 펼친다 (예: heretic 2개 → ['heretic','heretic']) */
export function distributionToRoleList(dist: RoleDistribution): PlayerRole[] {
  const roles: PlayerRole[] = [];
  (Object.keys(dist) as PlayerRole[]).forEach((role) => {
    for (let i = 0; i < dist[role]; i++) roles.push(role);
  });
  return roles;
}

/** 이단(악) 팀 여부 */
export function isHeretic(role: PlayerRole | null): boolean {
  return role !== null && HERETIC_ROLES.includes(role);
}

/** 당회(목사님·장로님) 여부 */
export function isCouncil(role: PlayerRole | null): boolean {
  return role !== null && COUNCIL_ROLES.includes(role);
}

/** 선 팀 여부 (이단 팀이 아니면 선 팀) */
export function isSaintTeam(role: PlayerRole | null): boolean {
  return role !== null && !isHeretic(role);
}

/**
 * 승리 조건 판정 (진행 중이면 null).
 * - 선 팀 승리: 이단 팀 전원 사망.
 * - 악 팀 승리: 생존 이단 수 ≥ 생존 성도(선 팀) 수.
 */
export function checkWinner(players: Pick<GamePlayer, "role" | "isAlive">[]): Winner | null {
  const alive = players.filter((p) => p.isAlive);
  const aliveHeretics = alive.filter((p) => isHeretic(p.role)).length;
  const aliveSaints = alive.filter((p) => isSaintTeam(p.role)).length;

  if (aliveHeretics === 0) return "saints";
  if (aliveHeretics >= aliveSaints) return "heretics";
  return null;
}
