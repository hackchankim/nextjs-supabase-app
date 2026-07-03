"use client";

import { useState } from "react";

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

// 입장 허브 (F001 닉네임 입장 · F002 진행자 PIN 입장)
export default function GameEntryPage() {
  // 닉네임 입장(F001)용 입력 상태
  const [nickname, setNickname] = useState("");
  // 진행자 PIN 입장(F002)용 입력 상태
  const [pin, setPin] = useState("");

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
        </CardContent>
        <CardFooter>
          {/* TODO(Phase 3 Task 008): 실제 입장 처리는 Server Action으로 대체 예정 */}
          <Button className="w-full">입장하기</Button>
        </CardFooter>
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">진행자로 입장</Button>
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
          </div>
          <DialogFooter>
            {/* TODO(Phase 3 Task 008): PIN 검증/제출 로직은 Server Action으로 대체 예정 */}
            <Button className="w-full">확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
