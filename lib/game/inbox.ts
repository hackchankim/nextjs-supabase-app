import "server-only";
import { createHmac } from "crypto";

// 교회 마피아 게임 — 참가자별 개인 인박스 토큰 계산 (서버 전용)
//
// 비밀 채널(이단/당회)·1:1 귓속말은 Postgres Changes 대신 Broadcast의 "개인 채널"로
// 배달한다. 채널명에 playerId를 그대로 쓰면 누구나 다른 참가자의 인박스를 추측해
// 구독할 수 있으므로, 서버 시크릿으로 HMAC 서명한 토큰을 채널명에 사용한다.
// playerId는 공개 정보지만 이 토큰은 시크릿 없이는 역산이 불가능하다.

/** 참가자별 추측 불가능한 개인 인박스 토큰 — 서버 시크릿으로 HMAC. */
export function computeInboxToken(playerId: string): string {
  const secret = process.env.BROADCAST_INBOX_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("인박스 토큰 시크릿 미설정");
  return createHmac("sha256", secret).update(playerId).digest("hex");
}
