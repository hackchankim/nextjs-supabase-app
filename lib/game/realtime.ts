// 교회 마피아 게임 — Realtime Broadcast 채널/이벤트 정의 (클라·서버 공용, secret 없음)
//
// Postgres Changes는 컬럼 권한을 무시하고 anon에게 role/session_token을 포함한 전체 행을
// 전송함이 실측으로 확인되어 사용하지 않는다(game_players/game_rooms는 realtime publication에
// 절대 추가하지 않는다). 대신 서버가 정제된 페이로드만 Broadcast로 송출한다.

import type { ChatChannel, Winner } from "@/lib/game/types";

/** 방별 공개 Broadcast 채널명 (인증 불필요, 누구나 구독 가능) */
export const roomChannel = (roomId: string) => `room:${roomId}`;

/**
 * 방별 Presence 채널명 — 참가자의 온라인/오프라인 접속 상태(F020) 전용.
 * Broadcast 채널과 분리해 접속 상태 관심사를 격리한다. Presence 페이로드에는
 * playerId(이미 공개 정보)만 담고 role/session_token 등 비밀은 절대 싣지 않는다.
 */
export const presenceChannel = (roomId: string) => `presence:${roomId}`;

/**
 * 참가자별 개인 인박스 Broadcast 채널명 — 비밀 채널(이단/당회)·1:1 귓속말 배달용.
 * inboxToken은 서버(lib/game/inbox.ts의 computeInboxToken)가 계산한 HMAC 값으로,
 * 시크릿 없이는 역산이 불가능하므로 채널명 자체가 노출되어도 다른 참가자가 추측해
 * 구독할 수 없다.
 */
export const inboxChannel = (roomId: string, inboxToken: string) =>
  `room:${roomId}:inbox:${inboxToken}`;

/**
 * 방별 진행자 전용 관리 Broadcast 채널명(Task 022) — 모든 채널의 메시지 사본이 이 토픽으로
 * 1부씩 추가 송출되어, 진행자가 [제어] 탭에서 전체 대화 로그를 실시간으로 열람한다.
 * token은 서버(lib/game/inbox.ts의 computeAdminInboxToken)가 계산한 HMAC 값으로, 시크릿 없이는
 * 역산이 불가능하므로 채널명이 노출되어도 참가자가 추측해 구독할 수 없다(PIN 게이트로만 토픽명 획득).
 */
export const adminChannel = (roomId: string, token: string) =>
  `room:${roomId}:admin:${token}`;

/** Broadcast 이벤트 이름 */
export const GAME_EVENTS = {
  /** 새 참가자가 입장했을 때 */
  PLAYER_JOINED: "player_joined",
  /** 진행자가 게임을 시작했을 때 (역할 배분 완료) */
  GAME_STARTED: "game_started",
  /** 채팅 메시지가 도착했을 때 (공개 채널 또는 개인 인박스 채널) */
  CHAT_MESSAGE: "chat_message",
  /** 낮 투표 집계가 갱신되었을 때 (투표/투표 변경 시마다) */
  VOTE_UPDATE: "vote_update",
  /** 참가자가 탈락(투표/밤 행동)했을 때 */
  PLAYER_ELIMINATED: "player_eliminated",
  /** 게임이 종료(승리 팀 확정)되었을 때 */
  GAME_ENDED: "game_ended",
  /** 밤 행동 완료 집계가 갱신되었을 때 (밤 권한자가 행동을 제출할 때마다) */
  NIGHT_ACTION_UPDATE: "night_action_update",
  /** 진행자가 페이즈 전환을 예약했을 때 (10초 카운트다운 시작) */
  PHASE_TRANSITION_SCHEDULED: "phase_transition_scheduled",
  /** 진행자가 예약된 페이즈 전환을 취소했을 때 */
  PHASE_TRANSITION_CANCELLED: "phase_transition_cancelled",
  /** 페이즈 전환이 확정되었을 때 (낮⇄밤) */
  PHASE_CHANGED: "phase_changed",
  /** 진행자가 게임을 초기화(리셋)했을 때 */
  GAME_RESET: "game_reset",
  /** 참가자가 대기실에서 나갔을 때 (자발적 퇴장 또는 진행자 강퇴 — game_players 레코드 삭제) */
  PLAYER_LEFT: "player_left",
} as const;

/** PLAYER_JOINED 이벤트 페이로드 — role/session_token 제외 */
export interface PlayerJoinedPayload {
  id: string;
  nickname: string;
  isAlive: boolean;
}

/** PLAYER_LEFT 이벤트 페이로드 — 목록에서 제거할 대상 id만(role/session_token 미포함) */
export interface PlayerLeftPayload {
  playerId: string;
}

/** GAME_STARTED 이벤트 페이로드 — 개인별 역할은 포함하지 않는다(무차별 UI 원칙) */
export interface GameStartedPayload {
  status: "day";
  phaseNumber: number;
}

/**
 * CHAT_MESSAGE 이벤트 페이로드 — role/session_token은 절대 포함하지 않는다.
 * 공개 채널(public/system)은 roomChannel로, 비밀 채널(heretic/council)·dm은
 * 수신 자격이 있는 참가자의 inboxChannel로만 송출된다(서버가 자격을 검증).
 */
export interface ChatMessagePayload {
  id: string;
  channel: ChatChannel;
  /** 발신자 (null = 시스템 메시지) */
  senderId: string | null;
  senderNickname: string;
  text: string;
  /** 1:1 채팅 수신자 (channel === 'dm'일 때만) */
  recipientId: string | null;
  createdAt: string;
}

/**
 * VOTE_UPDATE 이벤트 페이로드 — 대상별 득표 집계와 참여 현황을 담는다.
 * 낮 투표는 공개 — 대상별 투표자 id 목록을 함께 Broadcast한다. 닉네임이 아닌 id만 실어
 * 경량화하며, 클라이언트가 보유한 players 목록으로 id→닉네임을 매핑한다.
 */
export interface VoteUpdatePayload {
  /** 대상 참가자 id → 득표 수 */
  tally: Record<string, number>;
  /** 대상 참가자 id → 투표자 id 배열 */
  voters: Record<string, string[]>;
  /** 이번 페이즈에 투표를 마친 고유 투표자 수 */
  voterCount: number;
  /** 현재 생존자 수 */
  aliveCount: number;
}

/** PLAYER_ELIMINATED 이벤트 페이로드 — 탈락 사유·역할은 포함하지 않는다 */
export interface PlayerEliminatedPayload {
  playerId: string;
}

/** GAME_ENDED 이벤트 페이로드 — 승리 팀만 공개한다 */
export interface GameEndedPayload {
  winner: Winner;
}

/**
 * NIGHT_ACTION_UPDATE 이벤트 페이로드 — 순수 완료 집계만 담는다.
 * 누가 어떤 역할로 누구에게 어떤 행동을 했는지는 절대 포함하지 않는다(무차별 UI 원칙).
 */
export interface NightActionUpdatePayload {
  /** 이번 phase에 밤 행동을 마친 권한자 수 */
  completedCount: number;
  /** 이번 phase의 생존 밤 권한자(이단 대장·목사님·권사님) 총원 */
  total: number;
}

/**
 * PHASE_TRANSITION_SCHEDULED 이벤트 페이로드 — 전환 예정 상태와 완료 예정 시각만 담는다.
 * 모든 클라이언트는 transitionAt(ISO)을 기준으로 동일하게 카운트다운을 표시한다.
 */
export interface PhaseTransitionScheduledPayload {
  transitionTo: "day" | "night";
  transitionAt: string;
}

/** PHASE_CHANGED 이벤트 페이로드 — 개인별 역할은 포함하지 않는다(무차별 UI 원칙) */
export interface PhaseChangedPayload {
  status: "day" | "night";
  phaseNumber: number;
}
