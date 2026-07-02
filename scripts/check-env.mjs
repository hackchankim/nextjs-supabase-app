// 자율 개발 에이전트 팀 — 필수 환경변수 검증 (무의존성 ESM)
//
// 무인 개발 루프(D006 autodev.sh)가 시작 전에 호출한다. 카카오 알림에 필요한
// 필수 env 가 없으면 루프가 반쯤 돌다 인증 에러로 조용히 죽는 대신, 여기서
// 즉시 중단(exit 1)하고 무엇을/어디서 받아야 하는지 안내한다.

import { loadEnv } from "./kakao/_env.mjs";
import { pathToFileURL } from "node:url";

// 필수 키 → 발급처 안내
const REQUIRED = {
  KAKAO_REST_API_KEY: "카카오 디벨로퍼스 앱 → [앱 키] → REST API 키",
  KAKAO_REFRESH_TOKEN: "카카오 로그인 talk_message 동의 후 토큰 발급으로 획득",
  KAKAO_ACCESS_TOKEN: "카카오 로그인 토큰 발급으로 획득(만료 시 refresh.mjs 가 자동 갱신)",
};

/** 필수 env 를 검증한다. 누락 키 배열을 반환한다(빈 배열=정상). */
export function checkEnv() {
  const env = loadEnv();
  return Object.keys(REQUIRED).filter((k) => !env[k]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const missing = checkEnv();
  if (missing.length === 0) {
    console.log("[env 점검] 필수 환경변수 OK (KAKAO_REST_API_KEY / KAKAO_REFRESH_TOKEN / KAKAO_ACCESS_TOKEN)");
    process.exit(0);
  }
  console.error("[env 점검] 필수 환경변수가 없습니다. .env.autodev.local 에 아래 값을 설정하세요:");
  for (const key of missing) {
    console.error(`  - ${key}: ${REQUIRED[key]}`);
  }
  console.error("  (템플릿: .env.autodev.example / 자동 세팅: scripts/setup.sh)");
  process.exit(1);
}
