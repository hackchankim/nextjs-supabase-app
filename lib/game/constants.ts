// 교회 마피아 게임 — 상수 (역할 표시명·팀 분류·인원별 배분표)
import type { PlayerRole, RoleDistribution, Winner } from "./types";

/** 역할 한글 표시명 */
export const ROLE_LABELS: Record<PlayerRole, string> = {
  saint: "성도",
  heretic: "이단",
  heretic_leader: "이단 대장",
  pastor: "목사님",
  elder: "장로님",
  deaconess: "권사님",
};

/** 역할별 한글 설명 (역할 카드에 표시되는 안내 문구) */
export const ROLE_DESCRIPTIONS: Record<PlayerRole, string> = {
  saint: "평범한 성도입니다. 특별한 능력은 없지만 지혜로운 토론으로 이단을 찾아내세요.",
  heretic: "이단입니다. 성도인 척하며 이단 대장을 도와 공동체를 무너뜨리세요.",
  heretic_leader: "이단 대장입니다. 밤마다 한 명을 제거할 수 있습니다.",
  pastor: "목사님입니다. 밤마다 한 명을 조사해 이단 여부를 알 수 있습니다.",
  elder: "장로님입니다. 특별한 능력은 없지만 당회(목사님)와 비밀 대화가 가능합니다.",
  deaconess: "권사님입니다. 밤마다 한 명을 보호해 제거로부터 지킬 수 있습니다.",
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

/** 밤 행동 권한 보유 역할 (제거/조사/보호) */
export const NIGHT_ACTION_ROLES: readonly PlayerRole[] = ["heretic_leader", "pastor", "deaconess"];

/** 승리 팀 한글 표시명 — 게임 종료 오버레이/배너에 사용 (전원 역할 공개 그리드는 getGameResult + play 페이지 오버레이) */
export const WINNER_LABELS: Record<Winner, string> = {
  saints: "선 팀 승리!",
  heretics: "이단 팀 승리!",
};

/** 지원 인원 범위 (5~20명) */
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 20;

/** 인원별 역할 배분표 (대표 인원수) — 그 외 인원은 getRoleDistribution()이 계산 */
export const ROLE_DISTRIBUTION_TABLE: Record<number, RoleDistribution> = {
  5: { heretic: 1, heretic_leader: 1, pastor: 1, elder: 1, deaconess: 1, saint: 0 },
  10: { heretic: 2, heretic_leader: 1, pastor: 1, elder: 1, deaconess: 1, saint: 4 },
  15: { heretic: 3, heretic_leader: 1, pastor: 1, elder: 2, deaconess: 1, saint: 7 },
  20: { heretic: 4, heretic_leader: 1, pastor: 1, elder: 2, deaconess: 1, saint: 11 },
};
