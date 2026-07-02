// 자율 개발 에이전트 팀 — 카카오 알림 공용 env 유틸 (무의존성 ESM)
//
// 이 모듈은 Next.js 런타임 밖(순수 Node 스크립트)에서 실행되므로 process.env
// 주입에 의존하지 않고, 저장소 루트의 `.env.autodev.local` 파일을 직접 읽고 쓴다.
// refresh.mjs / send.mjs 가 이 유틸을 재사용한다.
//
// 규칙(shrimp-rules.md): 시크릿은 `.env.autodev.local`에서만 로드하며 절대 커밋하지 않는다.

import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// 이 파일 위치: <repo>/scripts/kakao/_env.mjs → 두 단계 상위가 저장소 루트
const HERE = dirname(fileURLToPath(import.meta.url));

/** 저장소 루트 절대 경로를 반환한다. */
export function getRoot() {
  return resolve(HERE, "..", "..");
}

/** 시크릿 파일(`.env.autodev.local`)의 절대 경로. */
export function envPath() {
  return join(getRoot(), ".env.autodev.local");
}

// "KEY=..." 형태의 대입 라인에서 KEY를 추출하는 정규식(주석/빈줄 제외)
const ASSIGN_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

/**
 * `.env.autodev.local`을 읽어 { KEY: value } 객체로 반환한다.
 * - 빈 줄과 `#` 주석은 무시한다.
 * - 값 양끝의 홑/겹따옴표는 제거한다.
 * - 파일이 없으면 빈 객체를 반환한다.
 */
export function loadEnv() {
  const p = envPath();
  if (!existsSync(p)) return {};

  const env = {};
  for (const rawLine of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const m = line.match(ASSIGN_RE);
    if (!m) continue;

    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/**
 * patch의 키/값으로 `.env.autodev.local`을 갱신한다.
 * - 기존 라인·주석·기타 키는 그대로 보존한다.
 * - 이미 존재하는 키는 값만 교체하고, 없는 키는 파일 끝에 추가한다.
 * - 파일 권한은 0600(소유자만 읽기/쓰기)으로 기록한다.
 */
export function saveEnv(patch) {
  if (!patch || typeof patch !== "object") {
    throw new Error("[env] saveEnv에는 { KEY: value } 형태의 객체가 필요합니다.");
  }

  const p = envPath();
  const remaining = new Set(Object.keys(patch));
  const lines = existsSync(p) ? readFileSync(p, "utf8").split(/\r?\n/) : [];

  const nextLines = lines.map((line) => {
    const m = line.match(ASSIGN_RE);
    if (m && remaining.has(m[1])) {
      const key = m[1];
      remaining.delete(key);
      return `${key}=${patch[key]}`;
    }
    return line;
  });

  // 파일 끝 빈 줄 정리 후, 아직 반영되지 않은 신규 키를 추가한다.
  while (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() === "") {
    nextLines.pop();
  }
  for (const key of remaining) {
    nextLines.push(`${key}=${patch[key]}`);
  }

  writeFileSync(p, nextLines.join("\n") + "\n", { mode: 0o600 });
  // writeFileSync의 mode는 신규 생성 시에만 적용되므로, 기존 파일 재기록 시에도
  // 시크릿 파일 권한(0600)을 보장하기 위해 명시적으로 chmod 한다.
  chmodSync(p, 0o600);
}
