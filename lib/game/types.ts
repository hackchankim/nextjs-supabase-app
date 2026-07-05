// 교회 마피아 게임 — 핵심 타입 정의 (앱 계층, camelCase)
// DB 스키마(snake_case)는 lib/types/database.types.ts, 매핑은 데이터 접근 계층에서 처리.

/** 플레이어 역할 (DB enum 값과 동일 문자열) */
export type PlayerRole =
  | "saint" // 성도
  | "heretic" // 이단
  | "heretic_leader" // 이단 대장 (제거 권한 보유)
  | "pastor" // 목사님
  | "elder" // 장로님
  | "deaconess"; // 권사님

/** 게임 진행 상태 */
export type GameStatus = "waiting" | "day" | "night" | "ended";

/** 채팅 채널 */
export type ChatChannel = "public" | "heretic" | "council" | "dm" | "system";

/** 밤 행동 종류 */
export type ActionType = "kill" | "investigate" | "protect";

/** 승리 팀 */
export type Winner = "saints" | "heretics";

/** 게임 방 */
export interface GameRoom {
  id: string;
  status: GameStatus;
  /** 현재 라운드 번호 (1부터) */
  phaseNumber: number;
  /** 진행자 PIN */
  adminPin: string;
  /** 승리 팀 (진행 중이면 null) */
  winner: Winner | null;
  /** 전환 예정 상태 (카운트다운 중에만 값 존재) */
  transitionTo: Exclude<GameStatus, "waiting" | "ended"> | null;
  /** 전환 완료 예정 시각 (카운트다운 동기화 기준, ISO 문자열) */
  transitionAt: string | null;
}

/** 참가자 */
export interface GamePlayer {
  id: string;
  roomId: string;
  nickname: string;
  role: PlayerRole | null; // 게임 시작 전에는 null
  /** 생존 여부 (게임 중 강퇴 시 false) */
  isAlive: boolean;
  /** 접속 하트비트 (Realtime Presence 미러, 온라인/오프라인 판정용, ISO 문자열) */
  lastSeenAt: string | null;
  /** 신원 확인 토큰 (localStorage 저장) */
  sessionToken: string;
}

/** 채팅 메시지 */
export interface GameMessage {
  id: string;
  roomId: string;
  /** 발송자 (null = 시스템 메시지) */
  playerId: string | null;
  /** 1:1 채팅 수신자 (channel === 'dm'일 때만) */
  recipientId: string | null;
  content: string;
  channel: ChatChannel;
  createdAt: string;
}

/** 낮 투표 */
export interface GameVote {
  id: string;
  roomId: string;
  phaseNumber: number;
  voterId: string;
  targetId: string;
}

/** 밤 행동 */
export interface GameNightAction {
  id: string;
  roomId: string;
  phaseNumber: number;
  actorId: string;
  targetId: string;
  actionType: ActionType;
}

/** Realtime Presence 페이로드 — 참가자별 온라인/오프라인 상태 */
export interface PresenceState {
  playerId: string;
  online: boolean;
  /** 마지막 확인 시각 (ISO 문자열) */
  lastSeenAt: string | null;
}

/** 역할별 인원 배분 */
export type RoleDistribution = Record<PlayerRole, number>;
