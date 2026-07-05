// 교회 마피아 게임 — UI 개발용 더미 데이터 (실제 데이터 접근 로직 없음)
import type { GameMessage, GamePlayer, GameVote } from "./types";

/** 더미 게임방 ID (모든 더미 데이터가 공유) */
const DUMMY_ROOM_ID = "dummy-room-1";

/**
 * 더미 참가자 10명.
 * 역할 분포: saint x4, heretic x2, heretic_leader x1, pastor x1, elder x1, deaconess x1
 * (ROLE_DISTRIBUTION_TABLE[10]과 동일)
 */
export const DUMMY_PLAYERS: GamePlayer[] = [
  {
    id: "player-1",
    roomId: DUMMY_ROOM_ID,
    nickname: "믿음이",
    role: "saint",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:00.000Z",
    sessionToken: "session-token-1",
  },
  {
    id: "player-2",
    roomId: DUMMY_ROOM_ID,
    nickname: "소망이",
    role: "saint",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:05.000Z",
    sessionToken: "session-token-2",
  },
  {
    id: "player-3",
    roomId: DUMMY_ROOM_ID,
    nickname: "사랑이",
    role: "saint",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:10.000Z",
    sessionToken: "session-token-3",
  },
  {
    id: "player-4",
    roomId: DUMMY_ROOM_ID,
    nickname: "은혜",
    role: "saint",
    isAlive: false,
    lastSeenAt: "2026-07-02T08:55:00.000Z",
    sessionToken: "session-token-4",
  },
  {
    id: "player-5",
    roomId: DUMMY_ROOM_ID,
    nickname: "평강",
    role: "heretic",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:15.000Z",
    sessionToken: "session-token-5",
  },
  {
    id: "player-6",
    roomId: DUMMY_ROOM_ID,
    nickname: "진리",
    role: "heretic",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:20.000Z",
    sessionToken: "session-token-6",
  },
  {
    id: "player-7",
    roomId: DUMMY_ROOM_ID,
    nickname: "등불",
    role: "heretic_leader",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:25.000Z",
    sessionToken: "session-token-7",
  },
  {
    id: "player-8",
    roomId: DUMMY_ROOM_ID,
    nickname: "향기",
    role: "pastor",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:30.000Z",
    sessionToken: "session-token-8",
  },
  {
    id: "player-9",
    roomId: DUMMY_ROOM_ID,
    nickname: "샘물",
    role: "elder",
    isAlive: true,
    lastSeenAt: "2026-07-02T09:00:35.000Z",
    sessionToken: "session-token-9",
  },
  {
    id: "player-10",
    roomId: DUMMY_ROOM_ID,
    nickname: "반석",
    role: "deaconess",
    isAlive: false,
    lastSeenAt: "2026-07-02T08:50:00.000Z",
    sessionToken: "session-token-10",
  },
];

/**
 * 더미 채팅 메시지.
 * 채널별 구성: public 3개, heretic 2개, council 2개, dm 2개, system 1개
 */
export const DUMMY_MESSAGES: GameMessage[] = [
  // public — 전체 공개 채널
  {
    id: "message-1",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-1",
    recipientId: null,
    content: "오늘 날씨가 참 좋네요, 다들 잘 지내셨죠?",
    channel: "public",
    createdAt: "2026-07-02T09:01:00.000Z",
  },
  {
    id: "message-2",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-2",
    recipientId: null,
    content: "저는 어제부터 계속 이상한 낌새를 느꼈어요.",
    channel: "public",
    createdAt: "2026-07-02T09:01:30.000Z",
  },
  {
    id: "message-3",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-3",
    recipientId: null,
    content: "우리 다같이 지혜를 모아서 이단을 찾아봐요.",
    channel: "public",
    createdAt: "2026-07-02T09:02:00.000Z",
  },
  // heretic — 이단 팀 전용 비밀 채널
  {
    id: "message-4",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-5",
    recipientId: null,
    content: "오늘 밤은 누구를 노릴까요?",
    channel: "heretic",
    createdAt: "2026-07-02T09:03:00.000Z",
  },
  {
    id: "message-5",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-7",
    recipientId: null,
    content: "제가 지시하는 대로 조용히 움직여주세요.",
    channel: "heretic",
    createdAt: "2026-07-02T09:03:30.000Z",
  },
  // council — 당회(목사님·장로님) 비밀 채널
  {
    id: "message-6",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-8",
    recipientId: null,
    content: "지난밤 조사 결과를 말씀드릴게요.",
    channel: "council",
    createdAt: "2026-07-02T09:04:00.000Z",
  },
  {
    id: "message-7",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-9",
    recipientId: null,
    content: "당회에서 함께 논의할 사항이 있습니다.",
    channel: "council",
    createdAt: "2026-07-02T09:04:30.000Z",
  },
  // dm — 1:1 귓속말
  {
    id: "message-8",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-1",
    recipientId: "player-2",
    content: "우리끼리 잠깐 얘기 좀 할까요?",
    channel: "dm",
    createdAt: "2026-07-02T09:05:00.000Z",
  },
  {
    id: "message-9",
    roomId: DUMMY_ROOM_ID,
    playerId: "player-2",
    recipientId: "player-1",
    content: "네 좋아요, 무슨 일이세요?",
    channel: "dm",
    createdAt: "2026-07-02T09:05:20.000Z",
  },
  // system — 시스템 안내 메시지
  {
    id: "message-10",
    roomId: DUMMY_ROOM_ID,
    playerId: null,
    recipientId: null,
    content: "낮이 시작되었습니다. 토론 후 투표를 진행해주세요.",
    channel: "system",
    createdAt: "2026-07-02T09:00:00.000Z",
  },
];

/** 더미 투표 — 1라운드에 일부 참가자가 투표한 샘플 */
export const DUMMY_VOTES: GameVote[] = [
  {
    id: "vote-1",
    roomId: DUMMY_ROOM_ID,
    phaseNumber: 1,
    voterId: "player-1",
    targetId: "player-5",
  },
  {
    id: "vote-2",
    roomId: DUMMY_ROOM_ID,
    phaseNumber: 1,
    voterId: "player-2",
    targetId: "player-5",
  },
  {
    id: "vote-3",
    roomId: DUMMY_ROOM_ID,
    phaseNumber: 1,
    voterId: "player-3",
    targetId: "player-6",
  },
  {
    id: "vote-4",
    roomId: DUMMY_ROOM_ID,
    phaseNumber: 1,
    voterId: "player-8",
    targetId: "player-5",
  },
];
