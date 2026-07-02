#!/usr/bin/env bash
# 자율 개발 에이전트 팀 — 커밋 시크릿 스캔 가드
#
# 스테이징된 변경(git diff --cached)에서 시크릿을 탐지하면 커밋을 차단한다.
# 무인 에이전트가 실수로 시크릿을 커밋에 쓸어담는 것을 막는 마지막 방어선이다.
#
# 두 곳에서 동일하게 쓰인다(exit 2 로 통일):
#  - Claude Code PreToolUse 훅: git commit 도구 호출을 차단(stderr 를 사용자에게 표시).
#  - 네이티브 git pre-commit 훅: exit 이 0 이 아니면 커밋을 중단.
# stdin(훅 JSON)은 읽지 않고, 오직 git 스테이징 상태만 신뢰한다.
#
# 종료 코드: 0 = 통과(클린), 2 = 시크릿 감지로 커밋 차단.

set -uo pipefail

# git 저장소가 아니거나 스테이징이 없으면 통과
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

FILES="$(git diff --cached --name-only 2>/dev/null)"
[ -z "$FILES" ] && exit 0

# 추가된 라인만 추출(+로 시작, 단 +++ 헤더 제외).
# 가드 자신은 시크릿 패턴 문자열을 담고 있으므로 내용 스캔에서 제외(자기 차단 방지).
ADDED="$(git diff --cached --unified=0 -- ':(top,exclude).claude/hooks/pre-commit-guard.sh' 2>/dev/null | grep -E '^\+' | grep -vE '^\+\+\+')"

block() {
  {
    echo "[시크릿 가드] 커밋을 차단했습니다: $1"
    echo "  - 시크릿은 커밋 대상이 아닙니다. .env.autodev.local / .env.local 에만 두세요."
    echo "  - 오탐이면 해당 값을 제거하거나 스테이징에서 빼고 다시 커밋하세요."
  } >&2
  exit 2
}

# (1) 파일명 기반 차단(최우선, 오탐 위험 가장 낮음): .env*.local 또는 정확히 .env
if echo "$FILES" | grep -Eq '(^|/)\.env(\..*)?\.local$|(^|/)\.env$'; then
  OFFENDER="$(echo "$FILES" | grep -E '(^|/)\.env(\..*)?\.local$|(^|/)\.env$' | head -1)"
  block "환경 시크릿 파일 스테이징됨 ($OFFENDER)"
fi

# (2) 내용 기반 차단: 추가 라인에서 토큰/키 패턴 탐지(빈 플레이스홀더는 매칭되지 않음)
if [ -n "$ADDED" ]; then
  if echo "$ADDED" | grep -Eq 'KAKAO_(ACCESS|REFRESH)_TOKEN=[^[:space:]"'\'']+'; then
    block "카카오 토큰 값 감지(KAKAO_ACCESS_TOKEN/KAKAO_REFRESH_TOKEN)"
  fi
  if echo "$ADDED" | grep -Eq 'gh[posru]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}'; then
    block "GitHub 토큰 감지(ghp_/gho_/ghs_/ghr_/github_pat_)"
  fi
  if echo "$ADDED" | grep -Eq 'SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[^[:space:]]'; then
    block "Supabase service_role 키 값 감지"
  fi
  if echo "$ADDED" | grep -Eq 'eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}'; then
    block "JWT 토큰 감지(eyJ...) — Supabase 키 등은 .env 에만 두세요"
  fi
fi

exit 0
