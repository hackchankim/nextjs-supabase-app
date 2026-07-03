// 게임 플레이 (F005~F011, F014~F017) — 역할 무차별 UI, 빈 페이지 골격
export default function GamePlayPage() {
  return (
    <section className="flex flex-col gap-2 text-center" data-route="game-play">
      <h1 className="text-2xl font-bold">게임 플레이</h1>
      <p className="text-muted-foreground">
        역할 카드 · 페이즈 · 채팅(전체/비밀/1:1) · 투표 · 밤 행동 (F005~F011, F014~F017)
      </p>
    </section>
  );
}
