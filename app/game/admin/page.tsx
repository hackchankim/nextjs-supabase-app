// 진행자 대시보드 (F004, F006, F009, F011~F014, F017~F020) — 빈 페이지 골격
export default function GameAdminPage() {
  return (
    <section className="flex flex-col gap-2 text-center" data-route="game-admin">
      <h1 className="text-2xl font-bold">진행자 대시보드</h1>
      <p className="text-muted-foreground">
        스크린 현황판 / 제어판 · 페이즈 전환 · 투표 마감 · 강퇴 (F004·F006·F009·F011~F014·F017~F020)
      </p>
    </section>
  );
}
