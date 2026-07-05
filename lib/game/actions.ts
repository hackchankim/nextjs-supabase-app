"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastToRoom } from "@/lib/game/broadcast";
import { GAME_EVENTS } from "@/lib/game/realtime";
import { getRoleDistribution, distributionToRoleList } from "@/lib/game/utils";
import { MIN_PLAYERS, MAX_PLAYERS } from "@/lib/game/constants";
import type { GameStatus, PlayerRole } from "@/lib/game/types";
import type { GameRoomRow } from "@/lib/types/database.types";

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
