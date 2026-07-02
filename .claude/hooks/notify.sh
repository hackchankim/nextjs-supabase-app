#!/usr/bin/env bash
# 자율 개발 에이전트 팀 — Claude Code 훅 알림 어댑터
#
# Claude Code 의 Stop / Notification 훅이 이 스크립트를 호출한다.
# stdin 으로 들어오는 훅 JSON 을 파싱해 이벤트별 한국어 메시지를 만들고,
# D001 의 카카오 발송 채널(scripts/kakao/send.mjs)로 전달한다.
#
# 원칙:
#  - 알림 훅은 세션을 절대 블로킹하면 안 된다 → 어떤 실패에도 항상 exit 0.
#  - Stop 은 매 턴 발생하므로(대화형 스팸 방지) CLAUDE_AUTODEV=1 일 때만 발송한다.
#    (무인 개발 루프 D005 가 이 환경변수를 설정한다.)
#  - Notification 은 사람 주의가 필요한 신호(permission_prompt/idle_prompt)만 발송한다.
#  - jq 등 미보장 도구에 의존하지 않고 node 로 JSON 을 파싱한다.
#  - 시크릿/발송은 send.mjs 에 위임하며 이 스크립트는 토큰을 직접 다루지 않는다.
#
# 디버그: NOTIFY_DEBUG=1 이면 구성한 메시지를 stderr 로 출력한다(발송은 그대로 수행).

INPUT="$(cat)"
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# stdin JSON 에서 hook_event_name / notification_type / message 를 한 줄에 하나씩 추출.
# message 의 개행은 공백으로 치환해 3줄 구조를 보장한다(셸 간 read 안정성).
PARSED="$(
  printf '%s' "$INPUT" | node -e '
    let s = "";
    process.stdin.on("data", (c) => (s += c));
    process.stdin.on("end", () => {
      let j = {};
      try { j = JSON.parse(s); } catch {}
      const msg = String(j.message || "").replace(/[\r\n]+/g, " ");
      process.stdout.write([j.hook_event_name || "", j.notification_type || "", msg].join("\n"));
    });
  ' 2>/dev/null
)"

# 개행 구분 3줄을 각각 읽는다(트레일링 빈 줄이 잘려도 빈 값으로 처리됨).
{ read -r EVENT; read -r NTYPE; read -r NMSG; } <<EOF
$PARSED
EOF

PROJECT="$(basename "$ROOT")"
MSG=""

case "$EVENT" in
  Stop)
    # 스팸 방지: 무인 개발 루프에서만 완료 알림을 보낸다.
    [ "${CLAUDE_AUTODEV:-}" = "1" ] || exit 0
    MSG="[완료] ${PROJECT} 자율 개발 작업 완료"
    ;;
  Notification)
    case "$NTYPE" in
      permission_prompt) MSG="[승인 필요] ${PROJECT}: ${NMSG}" ;;
      idle_prompt)       MSG="[입력 대기] ${PROJECT}: ${NMSG}" ;;
      *) exit 0 ;;
    esac
    ;;
  *)
    exit 0
    ;;
esac

[ -n "${NOTIFY_DEBUG:-}" ] && printf 'MSG=%s\n' "$MSG" >&2

# 발송은 send.mjs 에 위임. 어떤 실패(토큰 없음/네트워크/드라이런)에도 세션을 막지 않는다.
node "$ROOT/scripts/kakao/send.mjs" "$MSG" >/dev/null 2>&1 || true
exit 0
