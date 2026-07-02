// 자율 개발 에이전트 팀 — 카카오 액세스 토큰 갱신 (무의존성 ESM)
//
// 카카오 액세스 토큰은 수명이 ~12h 이므로, 무인 루프에서 만료로 조용히 실패하지
// 않도록 refresh_token 으로 새 access_token 을 발급받아 .env.autodev.local 에 재기록한다.
// send.mjs 가 발송 중 401 을 만나면 refreshAccessToken() 을 호출해 재시도한다.
//
// 검증된 API(출처: developers.kakao.com):
//   POST https://kauth.kakao.com/oauth/token
//   form: grant_type=refresh_token & client_id={REST_API_KEY} & refresh_token={...}
//         (앱에 Client Secret 이 활성화된 경우 client_secret 필수, 없으면 KOE010)

import { loadEnv, saveEnv } from "./_env.mjs";
import { pathToFileURL } from "node:url";

const TOKEN_URL = "https://kauth.kakao.com/oauth/token";

/**
 * refresh_token 으로 새 access_token 을 발급받아 .env.autodev.local 을 갱신하고
 * 새 access_token 문자열을 반환한다. 실패 시 한국어 사유와 함께 throw 한다.
 */
export async function refreshAccessToken() {
  const env = loadEnv();
  const restApiKey = env.KAKAO_REST_API_KEY;
  const refreshToken = env.KAKAO_REFRESH_TOKEN;
  const clientSecret = env.KAKAO_CLIENT_SECRET;

  if (!restApiKey || !refreshToken) {
    throw new Error(
      "[카카오 토큰 갱신] 필수 값이 없습니다. .env.autodev.local 에 KAKAO_REST_API_KEY 와 " +
        "KAKAO_REFRESH_TOKEN 을 설정하세요. (.env.autodev.example 의 발급 절차 참고)",
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: restApiKey,
    refresh_token: refreshToken,
  });
  if (clientSecret) body.set("client_secret", clientSecret);

  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (e) {
    throw new Error(`[카카오 토큰 갱신] 네트워크 요청 실패: ${e.message}`);
  }

  const data = await res.json().catch(() => ({}));

  if (res.ok && data.access_token) {
    const patch = { KAKAO_ACCESS_TOKEN: data.access_token };
    // 카카오는 리프레시 토큰 잔여 수명이 1개월 미만일 때만 새 refresh_token 을 함께 준다.
    if (data.refresh_token) patch.KAKAO_REFRESH_TOKEN = data.refresh_token;
    saveEnv(patch);
    return data.access_token;
  }

  // 실패: 카카오 에러코드에 따른 원인 후보를 덧붙인다.
  const code = data.error_code || data.error || `HTTP ${res.status}`;
  const desc = data.error_description || "";
  let hint = "";
  if (String(code) === "KOE010") {
    hint = " → 앱에 Client Secret 이 활성화되어 있습니다. .env.autodev.local 에 KAKAO_CLIENT_SECRET 을 설정하세요.";
  } else if (String(data.error) === "invalid_grant") {
    hint = " → refresh_token 이 만료/무효입니다. 카카오 로그인 재동의로 토큰을 다시 발급하세요.";
  }
  throw new Error(`[카카오 토큰 갱신] 실패 (${code}) ${desc}${hint}`);
}

// 직접 실행(`node scripts/kakao/refresh.mjs`) 시에만 동작한다.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  refreshAccessToken()
    .then(() => {
      console.log("[카카오 토큰 갱신] 완료: KAKAO_ACCESS_TOKEN 이 갱신되었습니다.");
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
