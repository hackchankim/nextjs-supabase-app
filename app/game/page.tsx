// 입장 허브 (F001 닉네임 입장 · F002 진행자 PIN 입장) — 빈 페이지 골격
export default function GameEntryPage() {
  return (
    <section className="flex flex-col gap-2 text-center" data-route="game-entry">
      <h1 className="text-2xl font-bold">교회 마피아 게임</h1>
      <p className="text-muted-foreground">
        입장 허브 · 닉네임 입장(F001) / 진행자 PIN 입장(F002)
      </p>
    </section>
  );
}
