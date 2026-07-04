"use server";

import { createAdminClient } from "@/lib/supabase/admin";
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
    const supabase = createAdminClient();

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
}

/**
 * 세션 토큰으로 참가자를 조회한다 (세션 복원용).
 * 무차별 대입으로 인한 역할 유출을 막기 위해 role은 반환하지 않는다.
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

    return {
      id: player.id,
      nickname: player.nickname,
      roomId: player.room_id,
      isAlive: player.is_alive,
    };
  } catch {
    return null;
  }
}
