"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastToRoom, broadcastToTopic } from "@/lib/game/broadcast";
import { computeInboxToken } from "@/lib/game/inbox";
import {
  GAME_EVENTS,
  inboxChannel,
  type ChatMessagePayload,
  type GameEndedPayload,
  type NightActionUpdatePayload,
  type VoteUpdatePayload,
} from "@/lib/game/realtime";
import {
  canPerformNightAction,
  checkWinner,
  getRoleDistribution,
  distributionToRoleList,
  isCouncil,
  isHeretic,
} from "@/lib/game/utils";
import { MIN_PLAYERS, MAX_PLAYERS, NIGHT_ACTION_ROLES } from "@/lib/game/constants";
import type { ActionType, ChatChannel, GameStatus, PlayerRole, Winner } from "@/lib/game/types";
import type { GameRoomRow } from "@/lib/types/database.types";

/** 채팅 메시지 최대 길이 */
const MESSAGE_MAX_LENGTH = 500;

/**
 * UUID v4 형식 검증용 정규식.
 * recipientId를 PostgREST raw 필터(.or 문자열)에 넣기 전 반드시 이 검증을 통과시켜야 한다 —
 * 미검증 문자열을 .or()에 삽입하면 필터 경계(쉼표·괄호)를 깨고 제3자 DM을 열람하는
 * 인젝션이 가능하다(supabase-js는 .or 인자를 이스케이프하지 않음).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 낮에만 활성화되는 채널 (밤에는 비활성) */
const DAY_ONLY_CHANNELS: readonly ChatChannel[] = ["public", "dm"];
/** 밤에만 활성화되는 비밀 채널 (낮에는 비활성) */
const NIGHT_ONLY_CHANNELS: readonly ChatChannel[] = ["heretic", "council"];

/** 닉네임 최소/최대 길이 */
const NICKNAME_MIN_LENGTH = 1;
const NICKNAME_MAX_LENGTH = 20;

/** 진행자 PIN 자릿수 */
const ADMIN_PIN_LENGTH = 4;

/** 0000~9999 범위의 4자리 PIN 문자열을 생성한다. */
function generateAdminPin(): string {
  const max = 10 ** ADMIN_PIN_LENGTH;
  return Math.floor(Math.random() * max)
    .toString()
    .padStart(ADMIN_PIN_LENGTH, "0");
}

/**
 * 진행 중(대기/낮/밤)인 게임 방을 조회하고, 없으면 새로 생성한다.
 * game_players/game_rooms 쓰기는 anon 정책이 없으므로 반드시 service_role로 수행한다.
 */
async function getOrCreateActiveRoom(): Promise<GameRoomRow> {
  const supabase = createAdminClient();

  const { data: existingRoom, error: selectError } = await supabase
    .from("game_rooms")
    .select("*")
    .neq("status", "ended")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(`게임 방 조회 실패: ${selectError.message}`);
  }

  if (existingRoom) {
    return existingRoom;
  }

  const { data: newRoom, error: insertError } = await supabase
    .from("game_rooms")
    .insert({ admin_pin: generateAdminPin(), status: "waiting" })
    .select("*")
    .single();

  if (insertError || !newRoom) {
    throw new Error(`게임 방 생성 실패: ${insertError?.message ?? "알 수 없는 오류"}`);
  }

  return newRoom;
}

type JoinGameResult =
  | { ok: true; sessionToken: string; playerId: string; roomId: string }
  | { ok: false; error: string };

/** 닉네임으로 게임에 입장한다. 같은 방 안에서 닉네임은 중복될 수 없다. */
export async function joinGame(nickname: string): Promise<JoinGameResult> {
  try {
    const trimmed = nickname.trim();

    if (trimmed.length < NICKNAME_MIN_LENGTH || trimmed.length > NICKNAME_MAX_LENGTH) {
      return {
        ok: false,
        error: `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요`,
      };
    }

    const room = await getOrCreateActiveRoom();

    // 시작-후-입장 차단 — 이미 진행 중(day/night)인 게임에 새 참가자가 들어오면
    // 역할이 배정되지 않은 채(배분은 시작 시점에 끝남) role=null로 남아 승리 판정을 왜곡시킨다.
    // 명확히 거부한다(다음 게임 대기 안내).
    if (room.status !== "waiting") {
      return { ok: false, error: "게임이 이미 시작되었습니다. 다음 게임을 기다려주세요" };
    }

    const supabase = createAdminClient();

    // 정원 초과 방지 — 초과 인원은 역할 배분표에서 빠져 role이 null로 남고 승리 판정을 왜곡시킨다.
    const { count, error: countError } = await supabase
      .from("game_players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);

    if (countError) {
      throw new Error(`인원 확인 실패: ${countError.message}`);
    }

    if ((count ?? 0) >= MAX_PLAYERS) {
      return { ok: false, error: `정원(${MAX_PLAYERS}명)이 가득 찼습니다` };
    }

    const { data: existingPlayer, error: selectError } = await supabase
      .from("game_players")
      .select("id")
      .eq("room_id", room.id)
      .eq("nickname", trimmed)
      .maybeSingle();

    if (selectError) {
      throw new Error(`닉네임 중복 확인 실패: ${selectError.message}`);
    }

    if (existingPlayer) {
      return { ok: false, error: "이미 사용 중인 닉네임입니다" };
    }

    const sessionToken = crypto.randomUUID();

    const { data: newPlayer, error: insertError } = await supabase
      .from("game_players")
      .insert({
        room_id: room.id,
        nickname: trimmed,
        session_token: sessionToken,
        is_alive: true,
      })
      .select("id")
      .single();

    if (insertError) {
      // unique(room_id, nickname) 위반 — select→insert 사이 레이스로 동시 입장 시 발생.
      // DB 제약이 최종 방어선이며, 내부 스키마명 노출 없이 사용자 친화 메시지로 변환한다.
      if (insertError.code === "23505") {
        return { ok: false, error: "이미 사용 중인 닉네임입니다" };
      }
      throw new Error(`참가자 등록 실패: ${insertError.message}`);
    }

    if (!newPlayer) {
      throw new Error("참가자 등록 실패: 알 수 없는 오류");
    }

    // 대기실에 실시간으로 새 참가자를 알린다(비치명적 — 실패해도 입장 자체는 성공 처리).
    await broadcastToRoom(room.id, GAME_EVENTS.PLAYER_JOINED, {
      id: newPlayer.id,
      nickname: trimmed,
      isAlive: true,
    });

    return { ok: true, sessionToken, playerId: newPlayer.id, roomId: room.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

type VerifyAdminPinResult = { ok: true; roomId: string } | { ok: false; error: string };

/** 진행자 PIN을 검증한다. */
export async function verifyAdminPin(pin: string): Promise<VerifyAdminPinResult> {
  try {
    const room = await getOrCreateActiveRoom();

    if (room.admin_pin !== pin) {
      return { ok: false, error: "PIN이 올바르지 않습니다" };
    }

    return { ok: true, roomId: room.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

export interface SessionPlayer {
  id: string;
  nickname: string;
  roomId: string;
  isAlive: boolean;
  /** 현재 게임 상태 — 재접속 시 알맞은 화면으로 라우팅하기 위한 값(role은 미포함) */
  roomStatus: GameStatus;
}

/**
 * 세션 토큰으로 참가자를 조회한다 (세션 복원용).
 * 무차별 대입으로 인한 역할 유출을 막기 위해 role은 반환하지 않는다.
 * 재접속 라우팅을 위해 방의 현재 status는 함께 반환한다(status는 공개 정보).
 */
export async function getPlayerBySession(token: string): Promise<SessionPlayer | null> {
  try {
    const supabase = createAdminClient();

    const { data: player, error } = await supabase
      .from("game_players")
      .select("id, nickname, room_id, is_alive")
      .eq("session_token", token)
      .maybeSingle();

    if (error || !player) {
      return null;
    }

    const { data: room } = await supabase
      .from("game_rooms")
      .select("status")
      .eq("id", player.room_id)
      .maybeSingle();

    return {
      id: player.id,
      nickname: player.nickname,
      roomId: player.room_id,
      isAlive: player.is_alive,
      roomStatus: (room?.status ?? "waiting") as GameStatus,
    };
  } catch {
    return null;
  }
}

export interface RoomPlayer {
  id: string;
  nickname: string;
  isAlive: boolean;
}

/**
 * 방의 참가자 목록을 조회한다 (대기실/진행자 화면의 초기 목록용).
 * role/session_token은 절대 포함하지 않는다 — 무차별 UI 원칙 및 역할 유출 방지.
 */
export async function getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const supabase = createAdminClient();

  const { data: players, error } = await supabase
    .from("game_players")
    .select("id, nickname, is_alive")
    .eq("room_id", roomId)
    .order("created_at");

  if (error) {
    throw new Error(`참가자 목록 조회 실패: ${error.message}`);
  }

  return (players ?? []).map((player) => ({
    id: player.id,
    nickname: player.nickname,
    isAlive: player.is_alive,
  }));
}

/**
 * Fisher-Yates 셔플 — 배열을 새로 만들어 반환한다(원본 미변경).
 * 역할 배분의 무작위성이 게임 공정성에 직결되므로 로컬로 직접 구현한다.
 */
function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type StartGameResult = { ok: true } | { ok: false; error: string };

/**
 * 진행자가 게임을 시작한다 — PIN 재검증 → 최소 인원 확인 → 역할 무작위 배분 →
 * 방 상태를 낮(day)/1페이즈로 전환 → 참가자에게 Broadcast로 알림.
 */
export async function startGame(roomId: string, pin: string): Promise<StartGameResult> {
  const verifyResult = await verifyAdminPin(pin);
  if (!verifyResult.ok) {
    return verifyResult;
  }
  if (verifyResult.roomId !== roomId) {
    return { ok: false, error: "PIN이 올바르지 않습니다" };
  }

  try {
    const supabase = createAdminClient();

    // 상태 가드 — 이미 시작(day/night)된 게임에서 재호출 시 역할이 통째로 재셔플되는 것을 막는다.
    // (버튼 중복 클릭·새로고침 후 재클릭·관리자 탭 중복 등)
    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("status")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      throw new Error(`게임 방 조회 실패: ${roomError?.message ?? "방을 찾을 수 없습니다"}`);
    }

    if (room.status !== "waiting") {
      return { ok: false, error: "이미 시작된 게임입니다" };
    }

    const players = await getRoomPlayers(roomId);

    if (players.length < MIN_PLAYERS) {
      return { ok: false, error: "게임 시작에는 최소 10명이 필요합니다" };
    }

    const distribution = getRoleDistribution(players.length);
    const roles: PlayerRole[] = fisherYatesShuffle(distributionToRoleList(distribution));

    const updates = players.map((player, index) =>
      supabase
        .from("game_players")
        .update({ role: roles[index] })
        .eq("id", player.id),
    );
    const updateResults = await Promise.all(updates);
    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      throw new Error(`역할 배분 실패: ${updateError.message}`);
    }

    const { error: roomUpdateError } = await supabase
      .from("game_rooms")
      .update({ status: "day", phase_number: 1 })
      .eq("id", roomId);

    if (roomUpdateError) {
      throw new Error(`게임 방 상태 전환 실패: ${roomUpdateError.message}`);
    }

    await broadcastToRoom(roomId, GAME_EVENTS.GAME_STARTED, {
      status: "day",
      phaseNumber: 1,
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 채팅 (Task 010)
// ─────────────────────────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

/** 세션 토큰 검증용 내부 컨텍스트 — role을 포함하므로 이 파일 밖으로 절대 반환하지 않는다. */
interface SenderContext {
  id: string;
  nickname: string;
  roomId: string;
  role: PlayerRole | null;
  isAlive: boolean;
}

/**
 * 세션 토큰으로 발신자 컨텍스트(role 포함)를 내부용으로 조회한다.
 * 이 함수의 반환값은 클라이언트로 그대로 전달하면 안 된다 — role이 포함되어 있다.
 */
async function getSenderContext(
  supabase: AdminClient,
  token: string,
): Promise<SenderContext | null> {
  const { data: player, error } = await supabase
    .from("game_players")
    .select("id, nickname, room_id, role, is_alive")
    .eq("session_token", token)
    .maybeSingle();

  if (error || !player) {
    return null;
  }

  return {
    id: player.id,
    nickname: player.nickname,
    roomId: player.room_id,
    role: player.role as PlayerRole | null,
    isAlive: player.is_alive,
  };
}

/**
 * 세션 토큰으로 본인 role만 조회한다. 남의 역할은 이 함수로 절대 조회할 수 없다
 * (game_players.session_token으로 본인 1건만 조회하는 구조 자체가 격리를 강제한다).
 */
export async function getMyRole(token: string): Promise<{ role: PlayerRole | null } | null> {
  const supabase = createAdminClient();
  const sender = await getSenderContext(supabase, token);
  return sender ? { role: sender.role } : null;
}

/**
 * 세션 토큰으로 본인의 개인 인박스 Broadcast 채널명을 조회한다.
 * inboxToken 자체는 HMAC 결과라 역산이 불가능하므로 이 채널명은 클라이언트에 노출해도 안전하다.
 */
export async function getMyInboxTopic(token: string): Promise<string | null> {
  const supabase = createAdminClient();
  const sender = await getSenderContext(supabase, token);
  if (!sender) return null;
  return inboxChannel(sender.roomId, computeInboxToken(sender.id));
}

/**
 * 채팅 메시지를 수신 자격이 있는 참가자에게만 fan-out한다.
 * - public/system: 공개 room 채널 1회
 * - heretic/council: 같은 방의 해당 역할군 전원의 개인 인박스
 * - dm: 발신자·수신자 두 사람의 개인 인박스
 * 실패해도 throw하지 않는다(broadcastToRoom/broadcastToTopic이 이미 부가 기능으로 처리).
 */
async function fanOutMessage(
  supabase: AdminClient,
  roomId: string,
  channel: ChatChannel,
  payload: ChatMessagePayload,
  senderId: string,
  recipientId: string | undefined,
): Promise<void> {
  if (channel === "public" || channel === "system") {
    await broadcastToRoom(roomId, GAME_EVENTS.CHAT_MESSAGE, payload);
    return;
  }

  if (channel === "heretic" || channel === "council") {
    const { data: players } = await supabase
      .from("game_players")
      .select("id, role")
      .eq("room_id", roomId);

    const memberIds = (players ?? [])
      .filter((p) => {
        const role = p.role as PlayerRole | null;
        return channel === "heretic" ? isHeretic(role) : isCouncil(role);
      })
      .map((p) => p.id);

    await Promise.all(
      memberIds.map((id) =>
        broadcastToTopic(inboxChannel(roomId, computeInboxToken(id)), GAME_EVENTS.CHAT_MESSAGE, payload),
      ),
    );
    return;
  }

  if (channel === "dm" && recipientId) {
    const recipientIds = Array.from(new Set([senderId, recipientId]));
    await Promise.all(
      recipientIds.map((id) =>
        broadcastToTopic(inboxChannel(roomId, computeInboxToken(id)), GAME_EVENTS.CHAT_MESSAGE, payload),
      ),
    );
  }
}

type SendMessageResult = { ok: true } | { ok: false; error: string };

/**
 * 채팅 메시지를 전송한다 — 서버가 페이즈·채널·역할 권한을 최종 검증하는 최후 방어선이다.
 * 무차별 UI(비밀 채널 탭은 전원 노출)는 클라이언트 표현일 뿐, 실제 열람/전송 자격은
 * 항상 이 함수(및 getMessages)가 role/is_alive/room_id 기준으로 강제한다.
 */
export async function sendMessage(
  token: string,
  channel: ChatChannel,
  text: string,
  recipientId?: string,
): Promise<SendMessageResult> {
  try {
    const supabase = createAdminClient();
    const sender = await getSenderContext(supabase, token);

    if (!sender) {
      return { ok: false, error: "세션이 유효하지 않습니다" };
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { ok: false, error: "메시지를 입력해주세요" };
    }
    if (trimmed.length > MESSAGE_MAX_LENGTH) {
      return { ok: false, error: `메시지는 ${MESSAGE_MAX_LENGTH}자 이하로 입력해주세요` };
    }

    // 시스템 메시지는 서버 내부 전용 — 클라이언트가 이 액션으로 보낼 수 없다.
    if (channel === "system") {
      return { ok: false, error: "시스템 채널에는 메시지를 보낼 수 없습니다" };
    }

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("status")
      .eq("id", sender.roomId)
      .maybeSingle();

    if (roomError || !room) {
      return { ok: false, error: "게임 방을 찾을 수 없습니다" };
    }

    // 페이즈 게이팅 — 서버가 최종 권위. public/dm은 낮에만, heretic/council은 밤에만 활성.
    if (DAY_ONLY_CHANNELS.includes(channel) && room.status !== "day") {
      return { ok: false, error: "낮에만 보낼 수 있는 채널입니다" };
    }
    if (NIGHT_ONLY_CHANNELS.includes(channel) && room.status !== "night") {
      return { ok: false, error: "밤에만 보낼 수 있는 채널입니다" };
    }

    if (!sender.isAlive) {
      return { ok: false, error: "탈락한 참가자는 채팅을 보낼 수 없습니다" };
    }

    // 채널 역할 권한 — heretic은 이단 팀만, council은 당회만.
    if (channel === "heretic" && !isHeretic(sender.role)) {
      return { ok: false, error: "권한이 없습니다" };
    }
    if (channel === "council" && !isCouncil(sender.role)) {
      return { ok: false, error: "권한이 없습니다" };
    }

    if (channel === "dm") {
      if (!recipientId || !UUID_RE.test(recipientId) || recipientId === sender.id) {
        return { ok: false, error: "귓속말 대상을 확인해주세요" };
      }

      const { data: recipient, error: recipientError } = await supabase
        .from("game_players")
        .select("id, room_id, is_alive")
        .eq("id", recipientId)
        .maybeSingle();

      if (
        recipientError ||
        !recipient ||
        recipient.room_id !== sender.roomId ||
        !recipient.is_alive
      ) {
        return { ok: false, error: "귓속말 대상을 확인해주세요" };
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("game_messages")
      .insert({
        room_id: sender.roomId,
        player_id: sender.id,
        channel,
        content: trimmed,
        recipient_id: channel === "dm" ? recipientId! : null,
      })
      .select("id, created_at")
      .single();

    if (insertError || !inserted) {
      return {
        ok: false,
        error: `메시지 전송 실패: ${insertError?.message ?? "알 수 없는 오류"}`,
      };
    }

    const payload: ChatMessagePayload = {
      id: inserted.id,
      channel,
      senderId: sender.id,
      senderNickname: sender.nickname,
      text: trimmed,
      recipientId: channel === "dm" ? recipientId! : null,
      createdAt: inserted.created_at,
    };

    // 수신 자격이 있는 참가자에게만 fan-out (발신자 본인도 멤버/수신자로 포함되어 echo를 받는다).
    await fanOutMessage(supabase, sender.roomId, channel, payload, sender.id, recipientId);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

/**
 * 채널의 메시지 목록을 조회한다 — 서버가 자격을 검증한 뒤 자격이 없으면 빈 배열을 반환한다
 * (탭 자체는 전원 노출되지만 실제 데이터는 이 함수가 role/room_id 기준으로 격리한다).
 * role은 절대 반환값에 포함하지 않는다.
 */
export async function getMessages(
  token: string,
  channel: ChatChannel,
  recipientId?: string,
): Promise<ChatMessagePayload[]> {
  const supabase = createAdminClient();
  const sender = await getSenderContext(supabase, token);

  if (!sender) {
    return [];
  }

  // 채널별 자격 검증 — 자격이 없으면 조용히 빈 배열 (탭 유무는 분기하지 않되 데이터는 격리).
  if (channel === "heretic" && !isHeretic(sender.role)) {
    return [];
  }
  if (channel === "council" && !isCouncil(sender.role)) {
    return [];
  }

  let query = supabase
    .from("game_messages")
    .select("id, channel, content, created_at, player_id, recipient_id")
    .eq("room_id", sender.roomId)
    .eq("channel", channel);

  if (channel === "dm") {
    // recipientId는 raw .or() 필터에 삽입되므로 UUID 형식을 강제해 인젝션을 원천 차단한다.
    // (형식이 어긋나면 조용히 빈 배열 — 잘못된/악의적 대상 지정으로 간주)
    if (recipientId && !UUID_RE.test(recipientId)) {
      return [];
    }
    // dm은 발신자==caller 또는 수신자==caller인 행만 — recipientId 지정 시 caller↔recipientId로 한정.
    query = recipientId
      ? query.or(
          `and(player_id.eq.${sender.id},recipient_id.eq.${recipientId}),and(player_id.eq.${recipientId},recipient_id.eq.${sender.id})`,
        )
      : query.or(`player_id.eq.${sender.id},recipient_id.eq.${sender.id}`);
  }

  const { data: rows, error } = await query.order("created_at", { ascending: true });

  if (error || !rows || rows.length === 0) {
    return [];
  }

  const senderIds = Array.from(
    new Set(rows.map((row) => row.player_id).filter((id): id is string => id !== null)),
  );

  const nicknameById = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: senders } = await supabase
      .from("game_players")
      .select("id, nickname")
      .in("id", senderIds);
    (senders ?? []).forEach((s) => nicknameById.set(s.id, s.nickname));
  }

  return rows.map((row) => ({
    id: row.id,
    channel: row.channel as ChatChannel,
    senderId: row.player_id,
    senderNickname: row.player_id ? (nicknameById.get(row.player_id) ?? "알 수 없음") : "시스템",
    text: row.content,
    recipientId: row.recipient_id,
    createdAt: row.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// 낮 투표 (Task 011)
// ─────────────────────────────────────────────────────────────────────────

interface VoteTally {
  /** 대상 참가자 id → 득표 수 */
  tally: Record<string, number>;
  /** 이번 페이즈에 투표를 마친 고유 투표자 수 */
  voterCount: number;
  /** 현재 생존자 수 */
  aliveCount: number;
}

/**
 * 현재 phase의 투표를 집계한다 (대상별 득표 수 + 고유 투표자 수 + 생존자 수).
 * 개별 투표자→대상 매핑은 이 함수 밖으로 반환하지 않는다 — 호출부는 집계 결과만 사용해야 한다.
 */
async function computeTally(
  supabase: AdminClient,
  roomId: string,
  phaseNumber: number,
): Promise<VoteTally> {
  const { data: votes, error: votesError } = await supabase
    .from("game_votes")
    .select("voter_id, target_id")
    .eq("room_id", roomId)
    .eq("phase_number", phaseNumber);

  if (votesError) {
    throw new Error(`투표 집계 실패: ${votesError.message}`);
  }

  const tally: Record<string, number> = {};
  const voterIds = new Set<string>();
  (votes ?? []).forEach((vote) => {
    tally[vote.target_id] = (tally[vote.target_id] ?? 0) + 1;
    voterIds.add(vote.voter_id);
  });

  const { count: aliveCount, error: aliveError } = await supabase
    .from("game_players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_alive", true);

  if (aliveError) {
    throw new Error(`생존자 집계 실패: ${aliveError.message}`);
  }

  return { tally, voterCount: voterIds.size, aliveCount: aliveCount ?? 0 };
}

/**
 * 참가자를 탈락 처리한다(투표/밤 행동 공통) — is_alive를 false로 갱신하고,
 * reason에 따라 문구를 분기한 시스템 메시지를 game_messages에 남긴 뒤 공개 채널로
 * fan-out하고, 탈락 사실을 Broadcast한 다음 승리 조건을 평가한다.
 * export하지 않는다 — 항상 이 파일 안의 검증된 진입점(closeVoting/resolveNight 등)을 통해서만 호출된다.
 */
async function resolveElimination(
  supabase: AdminClient,
  roomId: string,
  targetId: string,
  reason: "vote" | "night",
): Promise<Winner | null> {
  // is_alive=true 조건을 걸어 멱등성을 확보한다 — 이미 탈락한 대상(중복 마감·버튼 재클릭·
  // 관리자 탭 중복)이면 갱신 행이 0건이 되어, 시스템 메시지·PLAYER_ELIMINATED broadcast를
  // 반복하지 않는다.
  const { data: target, error: targetError } = await supabase
    .from("game_players")
    .update({ is_alive: false })
    .eq("id", targetId)
    .eq("is_alive", true)
    .select("id, nickname")
    .maybeSingle();

  if (targetError) {
    throw new Error(`탈락 처리 실패: ${targetError.message}`);
  }

  // 이미 탈락한 대상이면 부작용을 반복하지 않고 승리 상태만 재확인한다.
  if (!target) {
    return evaluateWinner(supabase, roomId);
  }

  // 탈락 사유별 시스템 메시지 문구 분기 — vote(낮 투표 마감)와 night(밤 처리 결과)는
  // 참가자에게 서로 다른 맥락을 전달해야 하므로 문구를 구분한다.
  const content =
    reason === "vote"
      ? `${target.nickname}님이 공동체를 떠났습니다`
      : `밤 사이 ${target.nickname}님이 이단 세력에 의해 제거되었습니다`;

  const { data: message, error: messageError } = await supabase
    .from("game_messages")
    .insert({
      room_id: roomId,
      player_id: null,
      channel: "system",
      content,
    })
    .select("id, created_at")
    .single();

  if (!messageError && message) {
    const payload: ChatMessagePayload = {
      id: message.id,
      channel: "system",
      senderId: null,
      senderNickname: "시스템",
      text: content,
      recipientId: null,
      createdAt: message.created_at,
    };
    await broadcastToRoom(roomId, GAME_EVENTS.CHAT_MESSAGE, payload);
  }

  await broadcastToRoom(roomId, GAME_EVENTS.PLAYER_ELIMINATED, { playerId: targetId });

  return evaluateWinner(supabase, roomId);
}

/**
 * 승리 조건을 평가한다 — 승자가 확정되면 game_rooms를 ended로 갱신하고 Broadcast한다.
 * export하지 않는다(resolveElimination 내부에서만 호출).
 */
async function evaluateWinner(supabase: AdminClient, roomId: string): Promise<Winner | null> {
  const { data: players, error } = await supabase
    .from("game_players")
    .select("role, is_alive")
    .eq("room_id", roomId);

  if (error || !players) {
    return null;
  }

  const winner = checkWinner(
    players.map((p) => ({ role: p.role as PlayerRole | null, isAlive: p.is_alive })),
  );

  if (winner) {
    await supabase.from("game_rooms").update({ status: "ended", winner }).eq("id", roomId);

    const payload: GameEndedPayload = { winner };
    await broadcastToRoom(roomId, GAME_EVENTS.GAME_ENDED, payload);
  }

  return winner;
}

type CastVoteResult = { ok: true } | { ok: false; error: string };

/**
 * 낮 투표를 등록/변경한다 — 1인 1표, 같은 phase 내 재투표 시 대상을 덮어쓴다(UPSERT).
 * 서버가 페이즈(day)·생존 여부·대상 유효성을 최종 검증하는 최후 방어선이다.
 * 개별 투표자→대상 매핑은 Broadcast하지 않는다 — 대상별 집계만 VOTE_UPDATE로 공개한다.
 */
export async function castVote(token: string, targetId: string): Promise<CastVoteResult> {
  try {
    const supabase = createAdminClient();
    const voter = await getSenderContext(supabase, token);

    if (!voter) {
      return { ok: false, error: "세션이 유효하지 않습니다" };
    }

    if (!voter.isAlive) {
      return { ok: false, error: "탈락한 참가자는 투표할 수 없습니다" };
    }

    if (!UUID_RE.test(targetId) || targetId === voter.id) {
      return { ok: false, error: "투표 대상을 확인해주세요" };
    }

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("status, phase_number")
      .eq("id", voter.roomId)
      .maybeSingle();

    if (roomError || !room) {
      return { ok: false, error: "게임 방을 찾을 수 없습니다" };
    }

    if (room.status !== "day") {
      return { ok: false, error: "낮에만 투표할 수 있습니다" };
    }

    const { data: target, error: targetError } = await supabase
      .from("game_players")
      .select("id, room_id, is_alive")
      .eq("id", targetId)
      .maybeSingle();

    if (targetError || !target || target.room_id !== voter.roomId || !target.is_alive) {
      return { ok: false, error: "투표 대상을 확인해주세요" };
    }

    const { error: upsertError } = await supabase.from("game_votes").upsert(
      {
        room_id: voter.roomId,
        phase_number: room.phase_number,
        voter_id: voter.id,
        target_id: targetId,
      },
      { onConflict: "room_id,phase_number,voter_id" },
    );

    if (upsertError) {
      return { ok: false, error: `투표 실패: ${upsertError.message}` };
    }

    const tally = await computeTally(supabase, voter.roomId, room.phase_number);
    const payload: VoteUpdatePayload = tally;
    await broadcastToRoom(voter.roomId, GAME_EVENTS.VOTE_UPDATE, payload);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

export interface VoteState {
  /** 대상 참가자 id → 득표 수 */
  tally: Record<string, number>;
  /** 본인이 이번 페이즈에 투표한 대상 id (미투표면 null) */
  myVote: string | null;
  /** 이번 페이즈에 투표를 마친 고유 투표자 수 */
  voterCount: number;
  /** 현재 생존자 수 */
  aliveCount: number;
}

/**
 * 세션 토큰으로 현재 phase의 투표 스냅샷을 조회한다 (집계 + 본인 투표만).
 * role/다른 참가자의 투표 대상은 절대 포함하지 않는다.
 */
export async function getVoteState(token: string): Promise<VoteState | null> {
  const supabase = createAdminClient();
  const voter = await getSenderContext(supabase, token);

  if (!voter) {
    return null;
  }

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .select("phase_number")
    .eq("id", voter.roomId)
    .maybeSingle();

  if (roomError || !room) {
    return null;
  }

  const { tally, voterCount, aliveCount } = await computeTally(
    supabase,
    voter.roomId,
    room.phase_number,
  );

  const { data: myVoteRow } = await supabase
    .from("game_votes")
    .select("target_id")
    .eq("room_id", voter.roomId)
    .eq("phase_number", room.phase_number)
    .eq("voter_id", voter.id)
    .maybeSingle();

  return {
    tally,
    myVote: myVoteRow?.target_id ?? null,
    voterCount,
    aliveCount,
  };
}

type CloseVotingResult =
  | { ok: true; eliminatedId: string; winner: Winner | null }
  | { ok: false; tie: true; candidates: { id: string; nickname: string; count: number }[] }
  | { ok: false; error: string };

/**
 * 진행자가 투표를 마감한다 — PIN 재검증 후 최다 득표자를 탈락 처리한다.
 * 동률(최다 득표가 2명 이상)이면 탈락 처리를 보류하고 후보 목록만 반환한다
 * (진행자가 resolveVoteElimination으로 수동 확정).
 */
export async function closeVoting(roomId: string, pin: string): Promise<CloseVotingResult> {
  const verifyResult = await verifyAdminPin(pin);
  if (!verifyResult.ok) {
    return verifyResult;
  }
  if (verifyResult.roomId !== roomId) {
    return { ok: false, error: "PIN이 올바르지 않습니다" };
  }

  try {
    const supabase = createAdminClient();

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("status, phase_number")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError || !room) {
      return { ok: false, error: "게임 방을 찾을 수 없습니다" };
    }

    // 낮에만 마감 가능 — 밤/종료 상태에서의 중복·오호출을 서버가 차단한다.
    if (room.status !== "day") {
      return { ok: false, error: "낮에만 투표를 마감할 수 있습니다" };
    }

    const { tally } = await computeTally(supabase, roomId, room.phase_number);

    const entries = Object.entries(tally);
    if (entries.length === 0) {
      return { ok: false, error: "투표가 없습니다" };
    }

    const maxCount = Math.max(...entries.map(([, count]) => count));
    const topTargetIds = entries.filter(([, count]) => count === maxCount).map(([id]) => id);

    if (topTargetIds.length > 1) {
      const { data: candidatePlayers } = await supabase
        .from("game_players")
        .select("id, nickname")
        .in("id", topTargetIds);

      const candidates = topTargetIds.map((id) => ({
        id,
        nickname: candidatePlayers?.find((p) => p.id === id)?.nickname ?? "알 수 없음",
        count: maxCount,
      }));

      return { ok: false, tie: true, candidates };
    }

    const eliminatedId = topTargetIds[0];
    const winner = await resolveElimination(supabase, roomId, eliminatedId, "vote");

    return { ok: true, eliminatedId, winner };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

type ResolveVoteEliminationResult =
  | { ok: true; eliminatedId: string; winner: Winner | null }
  | { ok: false; error: string };

/**
 * 동률 상황에서 진행자가 후보 중 한 명을 선택해 탈락을 확정한다.
 * targetId가 현재 phase의 최다 득표 후보인지 재검증한 뒤 resolveElimination을 호출한다.
 */
export async function resolveVoteElimination(
  roomId: string,
  pin: string,
  targetId: string,
): Promise<ResolveVoteEliminationResult> {
  const verifyResult = await verifyAdminPin(pin);
  if (!verifyResult.ok) {
    return verifyResult;
  }
  if (verifyResult.roomId !== roomId) {
    return { ok: false, error: "PIN이 올바르지 않습니다" };
  }

  try {
    const supabase = createAdminClient();

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("status, phase_number")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError || !room) {
      return { ok: false, error: "게임 방을 찾을 수 없습니다" };
    }

    if (room.status !== "day") {
      return { ok: false, error: "낮에만 투표를 마감할 수 있습니다" };
    }

    const { tally } = await computeTally(supabase, roomId, room.phase_number);

    if (!(targetId in tally) || tally[targetId] <= 0) {
      return { ok: false, error: "유효한 후보가 아닙니다" };
    }

    const maxCount = Math.max(...Object.values(tally));
    if (tally[targetId] !== maxCount) {
      return { ok: false, error: "최다 득표자가 아닙니다" };
    }

    const winner = await resolveElimination(supabase, roomId, targetId, "vote");

    return { ok: true, eliminatedId: targetId, winner };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 밤 행동 (Task 012)
// ─────────────────────────────────────────────────────────────────────────

/** 역할 → action_type 매핑. 밤 행동 권한이 없는 역할은 키 자체가 없다. */
const ROLE_TO_ACTION_TYPE: Partial<Record<PlayerRole, ActionType>> = {
  heretic_leader: "kill",
  pastor: "investigate",
  deaconess: "protect",
};

/**
 * 현재 phase의 밤 행동 완료 집계(완료 수/총원)를 계산한다 — Broadcast(NIGHT_ACTION_UPDATE)와
 * getNightActionStatus가 공유하는 헬퍼. 누가 행동을 완료했는지(개별 매핑)는 반환하지 않는다.
 */
async function computeNightActionProgress(
  supabase: AdminClient,
  roomId: string,
  phaseNumber: number,
): Promise<{ completedCount: number; total: number }> {
  const { data: players, error: playersError } = await supabase
    .from("game_players")
    .select("id, role, is_alive")
    .eq("room_id", roomId);

  if (playersError) {
    throw new Error(`참가자 조회 실패: ${playersError.message}`);
  }

  const eligibleIds = new Set(
    (players ?? [])
      .filter((p) => p.is_alive && NIGHT_ACTION_ROLES.includes(p.role as PlayerRole))
      .map((p) => p.id),
  );

  const { data: actions, error: actionsError } = await supabase
    .from("game_night_actions")
    .select("actor_id")
    .eq("room_id", roomId)
    .eq("phase_number", phaseNumber);

  if (actionsError) {
    throw new Error(`밤 행동 집계 실패: ${actionsError.message}`);
  }

  const completedCount = (actions ?? []).filter((a) => eligibleIds.has(a.actor_id)).length;

  return { completedCount, total: eligibleIds.size };
}

type SubmitNightActionResult =
  | { ok: true; investigation?: "heretic" | "saint" }
  | { ok: false; error: string };

/**
 * 밤 행동을 등록/변경한다(제거/조사/보호 공통, 1인 1행동 UPSERT — action_type은 역할로 서버가
 * 결정하며 클라이언트가 지정하지 않는다). 서버가 페이즈(night)·생존 여부·역할 권한·대상
 * 유효성을 최종 검증하는 최후 방어선이다.
 *
 * 목사님(pastor)의 조사 결과는 이 함수의 반환값에만 담긴다 — game_night_actions(DB)나
 * NIGHT_ACTION_UPDATE(Broadcast)에는 절대 기록/포함하지 않는다. 위장 없이 판정한다
 * (이단 대장도 isHeretic이므로 "heretic"으로 조사된다).
 */
export async function submitNightAction(
  token: string,
  targetId: string,
): Promise<SubmitNightActionResult> {
  try {
    const supabase = createAdminClient();
    const actor = await getSenderContext(supabase, token);

    if (!actor) {
      return { ok: false, error: "세션이 유효하지 않습니다" };
    }

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("status, phase_number")
      .eq("id", actor.roomId)
      .maybeSingle();

    if (roomError || !room) {
      return { ok: false, error: "게임 방을 찾을 수 없습니다" };
    }

    if (room.status !== "night") {
      return { ok: false, error: "밤에만 행동할 수 있습니다" };
    }

    if (!canPerformNightAction(actor.role, actor.isAlive)) {
      return { ok: false, error: "밤에 할 수 있는 행동이 없습니다" };
    }

    if (!UUID_RE.test(targetId) || targetId === actor.id) {
      return { ok: false, error: "행동 대상을 확인해주세요" };
    }

    const { data: target, error: targetError } = await supabase
      .from("game_players")
      .select("id, room_id, role, is_alive")
      .eq("id", targetId)
      .maybeSingle();

    if (targetError || !target || target.room_id !== actor.roomId || !target.is_alive) {
      return { ok: false, error: "행동 대상을 확인해주세요" };
    }

    // canPerformNightAction(actor.role, ...)을 통과했으므로 actor.role은 항상
    // ROLE_TO_ACTION_TYPE에 매핑되지만, 타입 좁히기를 위해 방어적으로 확인한다.
    const actionType = actor.role ? ROLE_TO_ACTION_TYPE[actor.role] : undefined;
    if (!actionType) {
      return { ok: false, error: "밤에 할 수 있는 행동이 없습니다" };
    }

    const { error: upsertError } = await supabase.from("game_night_actions").upsert(
      {
        room_id: actor.roomId,
        phase_number: room.phase_number,
        actor_id: actor.id,
        target_id: targetId,
        action_type: actionType,
      },
      { onConflict: "room_id,phase_number,actor_id" },
    );

    if (upsertError) {
      return { ok: false, error: `밤 행동 등록 실패: ${upsertError.message}` };
    }

    const { completedCount, total } = await computeNightActionProgress(
      supabase,
      actor.roomId,
      room.phase_number,
    );
    const progressPayload: NightActionUpdatePayload = { completedCount, total };
    await broadcastToRoom(actor.roomId, GAME_EVENTS.NIGHT_ACTION_UPDATE, progressPayload);

    if (actionType === "investigate") {
      return {
        ok: true,
        investigation: isHeretic(target.role as PlayerRole | null) ? "heretic" : "saint",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

export interface NightActorStatus {
  id: string;
  nickname: string;
  role: PlayerRole;
  acted: boolean;
}

type GetNightActionStatusResult =
  | { ok: true; actors: NightActorStatus[] }
  | { ok: false; error: string };

/**
 * 진행자가 밤 행동 완료 현황을 조회한다(PIN 게이트) — 방의 생존 밤 권한자(이단 대장·
 * 목사님·권사님) 목록과 각자 현재 phase의 행동 완료 여부를 반환한다.
 * 진행자 제어 탭은 이미 역할을 표로 노출하므로(스펙상 정상) role 포함이 안전하다 —
 * 참가자 화면(무차별 UI)에는 이 함수를 절대 노출하지 않는다.
 */
export async function getNightActionStatus(
  roomId: string,
  pin: string,
): Promise<GetNightActionStatusResult> {
  const verifyResult = await verifyAdminPin(pin);
  if (!verifyResult.ok) {
    return verifyResult;
  }
  if (verifyResult.roomId !== roomId) {
    return { ok: false, error: "PIN이 올바르지 않습니다" };
  }

  try {
    const supabase = createAdminClient();

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("phase_number")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError || !room) {
      return { ok: false, error: "게임 방을 찾을 수 없습니다" };
    }

    const { data: players, error: playersError } = await supabase
      .from("game_players")
      .select("id, nickname, role, is_alive")
      .eq("room_id", roomId);

    if (playersError) {
      return { ok: false, error: `참가자 조회 실패: ${playersError.message}` };
    }

    const eligible = (players ?? []).filter(
      (p) => p.is_alive && NIGHT_ACTION_ROLES.includes(p.role as PlayerRole),
    );

    const { data: actions, error: actionsError } = await supabase
      .from("game_night_actions")
      .select("actor_id")
      .eq("room_id", roomId)
      .eq("phase_number", room.phase_number);

    if (actionsError) {
      return { ok: false, error: `밤 행동 집계 실패: ${actionsError.message}` };
    }

    const actedIds = new Set((actions ?? []).map((a) => a.actor_id));

    const actors: NightActorStatus[] = eligible.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      role: p.role as PlayerRole,
      acted: actedIds.has(p.id),
    }));

    return { ok: true, actors };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}

type ResolveNightResult =
  | { ok: true; eliminatedId: string | null; winner: Winner | null }
  | { ok: false; error: string };

/**
 * 진행자가 밤 행동 결과를 처리한다(PIN 게이트) — 현재 phase의 kill/protect 대상을 산출해
 * 보호로 상쇄되지 않은 kill 대상만 resolveElimination(reason="night")으로 탈락 처리한다.
 * 제거 대상이 없거나 보호로 상쇄된 경우 "아무도 제거되지 않았습니다" 시스템 메시지만 남긴다.
 *
 * 밤→낮 전환(game_rooms.status 변경)은 이 함수의 책임이 아니다(Task 013 소관) —
 * 여기서는 status를 night로 그대로 둔다. 대신 status!=='night'이면 이미 처리된
 * 것으로 보고 거부해 중복·오호출(버튼 재클릭 등)을 막는다.
 */
export async function resolveNight(roomId: string, pin: string): Promise<ResolveNightResult> {
  const verifyResult = await verifyAdminPin(pin);
  if (!verifyResult.ok) {
    return verifyResult;
  }
  if (verifyResult.roomId !== roomId) {
    return { ok: false, error: "PIN이 올바르지 않습니다" };
  }

  try {
    const supabase = createAdminClient();

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("status, phase_number")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError || !room) {
      return { ok: false, error: "게임 방을 찾을 수 없습니다" };
    }

    if (room.status !== "night") {
      return { ok: false, error: "밤에만 처리할 수 있습니다" };
    }

    const { data: actions, error: actionsError } = await supabase
      .from("game_night_actions")
      .select("target_id, action_type")
      .eq("room_id", roomId)
      .eq("phase_number", room.phase_number);

    if (actionsError) {
      return { ok: false, error: `밤 행동 조회 실패: ${actionsError.message}` };
    }

    const killTarget = (actions ?? []).find((a) => a.action_type === "kill")?.target_id ?? null;
    const protectTarget =
      (actions ?? []).find((a) => a.action_type === "protect")?.target_id ?? null;

    if (killTarget && killTarget !== protectTarget) {
      const winner = await resolveElimination(supabase, roomId, killTarget, "night");
      return { ok: true, eliminatedId: killTarget, winner };
    }

    // 제거 대상이 없거나 권사님의 보호로 상쇄된 경우 — 탈락 없이 무효 시스템 메시지만 남긴다.
    const content = "밤 사이 아무도 제거되지 않았습니다";
    const { data: message, error: messageError } = await supabase
      .from("game_messages")
      .insert({ room_id: roomId, player_id: null, channel: "system", content })
      .select("id, created_at")
      .single();

    if (!messageError && message) {
      const payload: ChatMessagePayload = {
        id: message.id,
        channel: "system",
        senderId: null,
        senderNickname: "시스템",
        text: content,
        recipientId: null,
        createdAt: message.created_at,
      };
      await broadcastToRoom(roomId, GAME_EVENTS.CHAT_MESSAGE, payload);
    }

    return { ok: true, eliminatedId: null, winner: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    };
  }
}
