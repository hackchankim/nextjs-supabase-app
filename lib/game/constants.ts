// 교회 마피아 게임 — 상수 (역할 표시명·팀 분류·인원별 배분표)
import type { PlayerRole, RoleDistribution } from "./types";

/** 역할 한글 표시명 */
export const ROLE_LABELS: Record<PlayerRole, string> = {
  saint: "성도",
  heretic: "이단",
  heretic_leader: "이단 대장",
  pastor: "목사님",
  elder: "장로님",
  deaconess: "권사님",
};

/** 이단(악) 팀 역할 */
export const HERETIC_ROLES: readonly PlayerRole[] = ["heretic", "heretic_leader"];

/** 선 팀 역할 (성도 + 목사님 + 장로님 + 권사님) */
export const SAINT_ROLES: readonly PlayerRole[] = [
  "saint",
  "pastor",
  "elder",
  "deaconess",
];

/** 당회 그룹 (목사님 + 장로님) — 당회 비밀 채팅 열람 대상 */
export const COUNCIL_ROLES: readonly PlayerRole[] = ["pastor", "elder"];

/** 지원 인원 범위 (10~20명) */
export const MIN_PLAYERS = 10;
export const MAX_PLAYERS = 20;

/** 인원별 역할 배분표 (대표 인원수) — 그 외 인원은 getRoleDistribution()이 계산 */
export const ROLE_DISTRIBUTION_TABLE: Record<number, RoleDistribution> = {
  10: { heretic: 2, heretic_leader: 1, pastor: 1, elder: 1, deaconess: 1, saint: 4 },
  15: { heretic: 3, heretic_leader: 1, pastor: 1, elder: 2, deaconess: 1, saint: 7 },
  20: { heretic: 4, heretic_leader: 1, pastor: 1, elder: 2, deaconess: 1, saint: 11 },
};
