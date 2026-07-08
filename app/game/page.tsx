"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinGame, verifyAdminPin } from "@/lib/game/actions";
import { useGameSession } from "@/lib/game/hooks/useGameSession";

// 입장 허브 (F001 닉네임 입장 · F002 진행자 PIN 입장)
export default function GameEntryPage() {
  const router = useRouter();
  const { player, loading, setSession } = useGameSession();
  const [isPending, startTransition] = useTransition();

  // 재접속 게이트 — 이미 유효한 참가자 세션이 있으면 닉네임을 다시 묻지 않고
  // 현재 게임 상태에 맞는 화면으로 자동 이동한다(이탈 후 복귀 시 막다른 길 제거).
  useEffect(() => {
    if (loading || !player) return;
    router.replace(player.roomStatus === "waiting" ? "/game/waiting" : "/game/play");
  }, [loading, player, router]);

  // 닉네임 입장(F001)용 입력 상태
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // 진행자 PIN 입장(F002)용 입력 상태
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const handleJoin = () => {
    setNicknameError(null);
    startTransition(async () => {
      const result = await joinGame(nickname);
      if (result.ok) {
        setSession(result.sessionToken);
        router.push("/game/waiting");
      } else {
        setNicknameError(result.error);
      }
    });
  };

  const handleVerifyPin = () => {
    setPinError(null);
    startTransition(async () => {
      const result = await verifyAdminPin(pin);
      if (result.ok) {
        // 진행자 대시보드는 세션 토큰이 아닌 방 ID + PIN 조합으로 인증한다.
        window.sessionStorage.setItem(
          "game_admin_ctx",
          JSON.stringify({ roomId: result.roomId, pin }),
        );
        router.push("/game/admin");
      } else {
        setPinError(result.error);
      }
    });
  };

  // 세션 복원 중이거나 이미 세션이 있으면(위 게이트가 이동 처리) 입장 폼을 노출하지 않는다.
  if (loading || player) {
    return null;
  }

  return (
    <section
      className="flex flex-col items-center gap-6 text-center"
      data-route="game-entry"
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            교회 마피아 게임
          </CardTitle>
          <CardDescription>
            닉네임을 입력하고 게임에 입장하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-left">
          <Label htmlFor="nickname">닉네임</Label>
          <Input
            id="nickname"
            placeholder="닉네임을 입력하세요"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
          {nicknameError && (
            <p className="text-destructive text-sm">{nicknameError}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button className="min-h-11 w-full" onClick={handleJoin} disabled={isPending}>
            입장하기
          </Button>
        </CardFooter>
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="min-h-11">
            진행자로 입장
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>진행자 PIN 입장</DialogTitle>
            <DialogDescription>
              진행자에게 전달받은 PIN 번호를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-left">
            <Label htmlFor="host-pin">PIN 번호</Label>
            <Input
              id="host-pin"
              placeholder="PIN 번호를 입력하세요"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
            {pinError && <p className="text-destructive text-sm">{pinError}</p>}
          </div>
          <DialogFooter>
            <Button className="min-h-11 w-full" onClick={handleVerifyPin} disabled={isPending}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
