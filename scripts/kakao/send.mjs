// 자율 개발 에이전트 팀 — 카카오톡 "나에게 보내기" 발송 CLI (무의존성 ESM)
//
// 사용법:
//   node scripts/kakao/send.mjs "메시지"                    # 텍스트 발송
//   node scripts/kakao/send.mjs "메시지" --link <url>       # 링크 첨부
//   node scripts/kakao/send.mjs "메시지" --title <버튼라벨>  # 버튼 라벨
//   echo "메시지" | node scripts/kakao/send.mjs             # stdin 입력
//
// 이 호출 인터페이스가 후속 Task D002(notify.sh)의 계약이 된다.
//
// 검증된 API(출처: developers.kakao.com):
//   POST https://kapi.kakao.com/v2/api/talk/memo/default/send
//   headers: Authorization: Bearer {ACCESS_TOKEN}, Content-Type: application/x-www-form-urlencoded
//   body: template_object={JSON}  (text 타입: object_type/text(<=200자)/link/button_title?)

import { loadEnv } from "./_env.mjs";
import { refreshAccessToken } from "./refresh.mjs";
import { pathToFileURL } from "node:url";

const SEND_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send";
const TEXT_MAX = 200; // 카카오 text 템플릿 최대 길이

/** process.argv 에서 메시지(비옵션 인자)와 --link/--title 옵션을 파싱한다. */
function parseArgs(argv) {
  const parts = [];
  let link = "";
  let title = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--link") link = argv[++i] || "";
    else if (argv[i] === "--title") title = argv[++i] || "";
    else parts.push(argv[i]);
  }
  return { message: parts.join(" ").trim(), link, title };
}

/** TTY 가 아니면 stdin 을 읽어 메시지로 사용한다(파이프 입력 지원). */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", () => resolve(""));
  });
}

/** 카카오 text 기본 템플릿 객체를 구성한다(200자 초과 시 절단). */
function buildTemplateObject(message, { link, title }) {
  const obj = {
    object_type: "text",
    text: message.slice(0, TEXT_MAX),
    link: link ? { web_url: link, mobile_web_url: link } : {},
  };
  if (title) obj.button_title = title;
  return obj;
}

/** 주어진 액세스 토큰으로 memo 발송 요청을 보낸다. */
function post(accessToken, templateObject) {
  return fetch(SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });
}

/**
 * 메시지를 발송한다. 401(토큰 만료) 시 refreshAccessToken() 으로 갱신 후 1회 재시도.
 * 토큰 미보유 시 실제 발송 대신 드라이런(페이로드 출력)으로 처리하고 false 를 반환한다.
 */
export async function sendMessage(message, opts = {}) {
  if (!message) throw new Error("발송할 메시지가 비어 있습니다.");

  const templateObject = buildTemplateObject(message, {
    link: opts.link || "",
    title: opts.title || "",
  });

  let accessToken = loadEnv().KAKAO_ACCESS_TOKEN;

  // 토큰 미발급: 드라이런으로 페이로드만 출력하고 발급 절차를 안내한다.
  if (!accessToken) {
    console.log("[카카오 발송] (드라이런) 액세스 토큰이 없어 실제 발송을 건너뜁니다.");
    console.log("template_object=" + JSON.stringify(templateObject, null, 2));
    console.log(
      "토큰 미발급 상태입니다. .env.autodev.example 의 발급 절차에 따라 " +
        "KAKAO_REST_API_KEY / KAKAO_REFRESH_TOKEN / KAKAO_ACCESS_TOKEN 을 .env.autodev.local 에 설정하세요.",
    );
    return false;
  }

  let res = await post(accessToken, templateObject);

  // 액세스 토큰 만료(401) → 갱신 후 1회 재시도
  if (res.status === 401) {
    console.error("[카카오 발송] 액세스 토큰 만료(401) 감지 → 토큰 갱신 후 재시도합니다.");
    accessToken = await refreshAccessToken();
    res = await post(accessToken, templateObject);
  }

  const data = await res.json().catch(() => ({}));

  if (res.ok && (data.result_code === 0 || data.result_code === undefined)) {
    console.log("[카카오 발송] 완료: 카카오톡 '나에게 보내기'로 전송되었습니다.");
    return true;
  }

  // 실패: 원인 후보(동의항목/스코프) 안내
  const code = data.code ?? data.error_code ?? `HTTP ${res.status}`;
  const msg = data.msg || data.error_description || "";
  let hint = "";
  if (res.status === 403 || String(code) === "-402") {
    hint =
      " → 앱 [동의항목]에서 '카카오톡 메시지 전송(talk_message)' 사용 설정과 사용자 동의가 필요합니다.";
  }
  throw new Error(`[카카오 발송] 실패 (${code}) ${msg}${hint}`);
}

// 직접 실행(`node scripts/kakao/send.mjs ...`) 시에만 동작한다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    const { message: argMessage, link, title } = parseArgs(process.argv.slice(2));
    const message = argMessage || (await readStdin());
    if (!message) {
      console.error(
        '사용법: node scripts/kakao/send.mjs "<메시지>" [--link <url>] [--title <버튼라벨>]',
      );
      process.exit(1);
    }
    try {
      const sent = await sendMessage(message, { link, title });
      // 드라이런(토큰 미보유)은 발송 실패로 간주하여 non-zero 로 종료한다.
      process.exit(sent ? 0 : 1);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  })();
}
