// 교회 마피아 게임 — Realtime Broadcast 채널/이벤트 정의 (클라·서버 공용, secret 없음)
//
// Postgres Changes는 컬럼 권한을 무시하고 anon에게 role/session_token을 포함한 전체 행을
// 전송함이 실측으로 확인되어 사용하지 않는다(game_players/game_rooms는 realtime publication에
// 절대 추가하지 않는다). 대신 서버가 정제된 페이로드만 Broadcast로 송출한다.

import type { ChatChannel } from "@/lib/game/types";

/** 방별 공개 Broadcast 채널명 (인증 불필요, 누구나 구독 가능) */
export const roomChannel = (roomId: string) => `room:${roomId}`;

/**
 * 참가자별 개인 인박스 Broadcast 채널명 — 비밀 채널(이단/당회)·1:1 귓속말 배달용.
 * inboxToken은 서버(lib/game/inbox.ts의 computeInboxToken)가 계산한 HMAC 값으로,
 * 시크릿 없이는 역산이 불가능하므로 채널명 자체가 노출되어도 다른 참가자가 추측해
 * 구독할 수 없다.
 */
export const inboxChannel = (roomId: string, inboxToken: string) =>
  `room:${roomId}:inbox:${inboxToken}`;

/** Broadcast 이벤트 이름 */
export const GAME_EVENTS = {
  /** 새 참가자가 입장했을 때 */
  PLAYER_JOINED: "player_joined",
  /** 진행자가 게임을 시작했을 때 (역할 배분 완료) */
  GAME_STARTED: "game_started",
  /** 채팅 메시지가 도착했을 때 (공개 채널 또는 개인 인박스 채널) */
  CHAT_MESSAGE: "chat_message",
} as const;

/** PLAYER_JOINED 이벤트 페이로드 — role/session_token 제외 */
export interface PlayerJoinedPayload {
  id: string;
  nickname: string;
  isAlive: boolean;
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
