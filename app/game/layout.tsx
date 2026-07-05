import type { ReactNode } from "react";

// 게임 영역 공통 레이아웃 — 모든 /game 하위 페이지를 감싼다.
// 역할 무차별 UI 원칙에 따라 중립 테마·동일 레이아웃을 기본값으로 둔다.
export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <main className="w-full max-w-md">{children}</main>
    </div>
  );
}
