// 대기실 (F003 실시간 목록 · F004 역할 배분 · F019 강퇴 · F020 접속 상태) — 빈 페이지 골격
export default function GameWaitingPage() {
  return (
    <section className="flex flex-col gap-2 text-center" data-route="game-waiting">
      <h1 className="text-2xl font-bold">대기실</h1>
      <p className="text-muted-foreground">
        참가자 실시간 목록(F003) · 역할 배분(F004) · 강퇴(F019) · 접속 상태(F020)
      </p>
    </section>
  );
}
