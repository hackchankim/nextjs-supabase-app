import "server-only";

import { roomChannel } from "@/lib/game/realtime";

// 교회 마피아 게임 — 서버 전용 Realtime Broadcast 송출.
//
// game_players/game_rooms는 anon에게 완전 차단되어 있고 Postgres Changes는 컬럼 권한을
// 무시하는 것이 실측으로 확인되었으므로, 클라이언트에는 이 함수가 정제한 페이로드만 전달한다.
// Supabase Realtime Broadcast REST API를 service_role 키로 직접 호출한다(실측 검증된 패턴).

/**
 * 임의 topic으로 Broadcast 이벤트를 송출한다 — 공개 room 채널뿐 아니라
 * 개인 인박스 채널(room:{roomId}:inbox:{token}) 등 모든 topic에 사용할 수 있다.
 *
 * 실패하더라도 throw하지 않는다 — 실시간 알림은 부가 기능이며, 실패해도
 * 참가자 입장/게임 시작/채팅 전송 같은 핵심 흐름(DB 반영)을 막아서는 안 된다.
 * 클라이언트가 이 파일을 import하면 안 된다("server-only"로 빌드 타임에 강제됨).
 */
export async function broadcastToTopic(
  topic: string,
  event: string,
  payload: unknown,
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("broadcastToTopic: 환경 변수 누락으로 송출을 건너뜁니다");
      return;
    }

    const response = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic, event, payload }],
      }),
    });

    if (!response.ok) {
      console.error(
        `broadcastToTopic: 송출 실패 (status=${response.status}, topic=${topic}, event=${event})`,
      );
    }
  } catch (error) {
    console.error("broadcastToTopic: 송출 중 오류", error);
  }
}

/**
 * 지정한 방의 공개 채널로 Broadcast 이벤트를 송출한다 (roomChannel(roomId)로 위임).
 */
export async function broadcastToRoom(
  roomId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  await broadcastToTopic(roomChannel(roomId), event, payload);
}
