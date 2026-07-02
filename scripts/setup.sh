#!/usr/bin/env bash
# 자율 개발 에이전트 팀 — 원클릭 온보딩
#
# 저장소를 pull 받은 사람이 빠르게 세팅하도록:
#  1) *.example → 실제 env 파일을 (없을 때만) 복사
#  2) 커밋 시크릿 가드를 네이티브 git pre-commit 훅으로 설치(사람 커밋 보조 방어)
#  3) gh 인증 상태 점검
#  4) 필수 카카오 env 체크리스트 출력
#
# 정보성 스크립트이므로 항상 exit 0 이되, 남은 할 일을 명확히 표시한다.
# 기존 .env*.local 은 절대 덮어쓰지 않는다.

set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 0

echo "=== 자율 개발 에이전트 팀 온보딩 (scripts/setup.sh) ==="
TODO=()

# 1) env 파일 복사 (target 이 없을 때만)
copy_if_absent() {
  local example="$1" target="$2"
  if [ ! -f "$example" ]; then
    echo "  - 건너뜀: $example 템플릿이 없습니다."
    return
  fi
  if [ -f "$target" ]; then
    echo "  - 유지: $target 이미 존재(덮어쓰지 않음)"
  else
    cp "$example" "$target"
    echo "  - 생성: $target ← $example  → 값을 채우세요"
    TODO+=("$target 의 값을 채우기")
  fi
}
echo "[1/4] 환경변수 파일 준비"
copy_if_absent ".env.autodev.example" ".env.autodev.local"
copy_if_absent ".env.example" ".env.local"

# 2) 네이티브 git pre-commit 훅 설치(가드 재사용)
echo "[2/4] 커밋 시크릿 가드(git pre-commit) 설치"
GUARD="$ROOT/.claude/hooks/pre-commit-guard.sh"
HOOK_DIR="$(git rev-parse --git-path hooks 2>/dev/null)"
if [ -n "$HOOK_DIR" ] && [ -f "$GUARD" ]; then
  mkdir -p "$HOOK_DIR"
  HK="$HOOK_DIR/pre-commit"
  if [ -f "$HK" ] && ! grep -q "pre-commit-guard.sh" "$HK" 2>/dev/null; then
    cp "$HK" "$HK.bak"
    echo "  - 기존 pre-commit 훅을 $HK.bak 로 백업"
  fi
  printf '#!/usr/bin/env bash\nexec "$(git rev-parse --show-toplevel)/.claude/hooks/pre-commit-guard.sh"\n' > "$HK"
  chmod +x "$HK"
  echo "  - 설치 완료: $HK"
else
  echo "  - 건너뜀: git 저장소가 아니거나 가드 스크립트가 없습니다."
fi

# 3) gh 인증 상태
echo "[3/4] GitHub CLI 인증 상태"
if command -v gh >/dev/null 2>&1; then
  gh auth status 2>&1 | head -1 || true
else
  echo "  - gh 미설치(선택): GitHub Actions/PR 자동화 사용 시 gh auth login 권장"
  TODO+=("(선택) gh 설치 후 gh auth login")
fi

# 4) 필수 카카오 env 체크리스트
echo "[4/4] 필수 카카오 환경변수 점검"
if node "$ROOT/scripts/check-env.mjs"; then
  :
else
  TODO+=("카카오 토큰 발급 후 .env.autodev.local 채우기 (.env.autodev.example 참고)")
fi

echo
echo "=== 남은 할 일 ==="
if [ "${#TODO[@]}" -eq 0 ]; then
  echo "  없음 — 세팅 완료!"
else
  for t in "${TODO[@]}"; do echo "  [ ] $t"; done
fi
exit 0
