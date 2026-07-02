// 자율 개발 에이전트 팀 — 카카오 초기 토큰 발급(부트스트랩, 무의존성 ESM)
//
// 카카오 로그인 동의(talk_message) 후 받은 authorization_code 를 access_token /
// refresh_token 으로 교환하고 .env.autodev.local 에 기록한다. 최초 1회만 필요하며,
// 이후 만료된 access_token 은 refresh.mjs 가 자동 갱신한다.
//
// 사용법(값이 시크릿이므로 세션에서 `! ...` 로 직접 실행 권장):
//   node scripts/kakao/issue-token.mjs \
//     --key <REST_API_KEY> --redirect <REDIRECT_URI> --code <AUTHORIZATION_CODE> [--secret <CLIENT_SECRET>]
//
// 검증된 API(developers.kakao.com):
//   POST https://kauth.kakao.com/oauth/token
//   form: grant_type=authorization_code & client_id={REST_API_KEY}
//         & redirect_uri={REDIRECT_URI} & code={AUTHORIZATION_CODE} [& client_secret={...}]

import { loadEnv, saveEnv } from "./_env.mjs";

const TOKEN_URL = "https://kauth.kakao.com/oauth/token";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--key") out.key = argv[++i];
    else if (argv[i] === "--redirect") out.redirect = argv[++i];
    else if (argv[i] === "--code") out.code = argv[++i];
    else if (argv[i] === "--secret") out.secret = argv[++i];
  }
  return out;
}

function mask(t) {
  if (!t) return "";
  return t.length <= 8 ? "****" : `${t.slice(0, 4)}…${t.slice(-4)}`;
}

const a = parseArgs(process.argv.slice(2));

// 시크릿을 명령줄에 노출하지 않도록, key/secret/redirect 는 .env.autodev.local 에서
// 읽는 것을 우선 폴백으로 지원한다(명령엔 1회용 --code 만 넘기면 됨).
const env = loadEnv();
a.key = a.key || env.KAKAO_REST_API_KEY;
a.redirect = a.redirect || env.KAKAO_REDIRECT_URI;
a.secret = a.secret || env.KAKAO_CLIENT_SECRET;

if (!a.key || !a.redirect || !a.code) {
  console.error(
    "사용법: node scripts/kakao/issue-token.mjs --code <CODE> [--key <REST_API_KEY>] [--redirect <REDIRECT_URI>] [--secret <CLIENT_SECRET>]",
  );
  console.error("  · --key/--redirect/--secret 미지정 시 .env.autodev.local 의");
  console.error("    KAKAO_REST_API_KEY / KAKAO_REDIRECT_URI / KAKAO_CLIENT_SECRET 를 사용합니다.");
  console.error("  · CODE: 인가 URL 로그인·동의 후 리다이렉트된 주소의 ?code= 값 (1회용, ~10분)");
  if (!a.key) console.error("  ! KAKAO_REST_API_KEY 없음");
  if (!a.redirect) console.error("  ! KAKAO_REDIRECT_URI 없음");
  if (!a.code) console.error("  ! --code 없음");
  process.exit(1);
}

const body = new URLSearchParams({
  grant_type: "authorization_code",
  client_id: a.key,
  redirect_uri: a.redirect,
  code: a.code,
});
if (a.secret) body.set("client_secret", a.secret);

let res;
try {
  res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
} catch (e) {
  console.error(`[카카오 토큰 발급] 네트워크 요청 실패: ${e.message}`);
  process.exit(1);
}

const data = await res.json().catch(() => ({}));

if (res.ok && data.access_token) {
  const patch = {
    KAKAO_REST_API_KEY: a.key,
    KAKAO_ACCESS_TOKEN: data.access_token,
  };
  if (data.refresh_token) patch.KAKAO_REFRESH_TOKEN = data.refresh_token;
  if (a.secret) patch.KAKAO_CLIENT_SECRET = a.secret;
  saveEnv(patch);
  console.log("[카카오 토큰 발급] 완료 → .env.autodev.local 에 기록했습니다.");
  console.log(`  · access_token:  ${mask(data.access_token)}`);
  console.log(`  · refresh_token: ${mask(data.refresh_token)}${data.refresh_token ? "" : " (응답에 없음)"}`);
  console.log('  · 다음: node scripts/kakao/send.mjs "테스트" 로 실발송 확인');
  process.exit(0);
}

const code = data.error_code || data.error || `HTTP ${res.status}`;
const desc = data.error_description || "";
let hint = "";
if (String(code) === "KOE320" || String(data.error) === "invalid_grant") {
  hint = " → 인가 코드가 만료/재사용/무효입니다. 인가 URL로 새 code를 받아 다시 시도하세요.";
} else if (String(code) === "KOE010") {
  hint = " → 앱에 Client Secret이 활성화되어 있습니다. --secret 을 추가하세요.";
} else if (/redirect/i.test(desc)) {
  hint = " → redirect_uri가 카카오 로그인에 등록한 값과 정확히 일치해야 합니다.";
}
console.error(`[카카오 토큰 발급] 실패 (${code}) ${desc}${hint}`);
process.exit(1);
