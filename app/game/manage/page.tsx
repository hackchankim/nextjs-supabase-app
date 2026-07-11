"use client";

// 관리자 패널 (Task 019) — 진행자 4자리 PIN과 완전히 분리된 운영자 전용 도구.
// ADMIN_SECRET(서버 전용 환경변수)로 인증하며, sessionStorage에 시크릿을 보관해
// 이후 각 액션 호출마다 함께 넘긴다(app/game/admin/page.tsx의 진행자 인증 컨텍스트
// 가드 패턴과 동일 — 없으면 /game으로 되돌린다).
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeAdminPin,
  getAdminOverview,
  hardResetAllData,
  purgeEndedRooms,
  softResetActiveGame,
  type AdminOverview,
} from "@/lib/game/actions";

const ADMIN_SECRET_KEY = "game_admin_secret";
/** 전체 데이터 완전 삭제를 실제로 실행하기 위해 입력해야 하는 확인 문구. */
const HARD_RESET_CONFIRM_TEXT = "삭제";

export default function GameManagePage() {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [ctxChecked, setCtxChecked] = useState(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [isSoftResetting, setIsSoftResetting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const [hardResetOpen, setHardResetOpen] = useState(false);
  const [hardResetConfirmText, setHardResetConfirmText] = useState("");
  const [isHardResetting, setIsHardResetting] = useState(false);

  // sessionStorage에서 관리자 시크릿 복원 — 없으면 입장 화면으로 되돌린다.
  useEffect(() => {
    const stored = window.sessionStorage.getItem(ADMIN_SECRET_KEY);
    setSecret(stored);
    setCtxChecked(true);
  }, []);

  useEffect(() => {
    if (ctxChecked && !secret) {
      router.replace("/game");
    }
  }, [ctxChecked, secret, router]);

  const loadOverview = useCallback(async (currentSecret: string) => {
    setIsLoadingOverview(true);
    try {
      const result = await getAdminOverview(currentSecret);
      if (result.ok) {
        setOverview(result.overview);
        setOverviewError(null);
      } else {
        setOverviewError(result.error);
      }
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    if (secret) {
      void loadOverview(secret);
    }
  }, [secret, loadOverview]);

  const handleChangePin = useCallback(async () => {
    if (!secret) return;
    setPinError(null);
    setIsChangingPin(true);
    try {
      const result = await changeAdminPin(secret, newPin);
      if (result.ok) {
        toast.success("진행자 PIN이 변경되었습니다");
        setNewPin("");
        void loadOverview(secret);
      } else {
        setPinError(result.error);
        toast.error(result.error);
      }
    } finally {
      setIsChangingPin(false);
    }
  }, [secret, newPin, loadOverview]);

  const handleSoftReset = useCallback(() => {
    if (!secret) return;
    if (
      !window.confirm(
        "현재 게임만 초기화하시겠습니까? 투표·채팅·역할 등 진행 기록이 삭제되고 참가자는 유지됩니다.",
      )
    ) {
      return;
    }
    setIsSoftResetting(true);
    softResetActiveGame(secret)
      .then((result) => {
        if (result.ok) {
          toast.success("현재 게임이 초기화되었습니다");
          void loadOverview(secret);
        } else {
          toast.error(result.error);
        }
      })
      .finally(() => setIsSoftResetting(false));
  }, [secret, loadOverview]);

  const handlePurgeEnded = useCallback(() => {
    if (!secret) return;
    setIsPurging(true);
    purgeEndedRooms(secret)
      .then((result) => {
        if (result.ok) {
          toast.success(`종료된 방 ${result.deletedCount}개를 정리했습니다`);
          void loadOverview(secret);
        } else {
          toast.error(result.error);
        }
      })
      .finally(() => setIsPurging(false));
  }, [secret, loadOverview]);

  const handleHardReset = useCallback(() => {
    if (!secret) return;
    setIsHardResetting(true);
    hardResetAllData(secret)
      .then((result) => {
        if (result.ok) {
          toast.success(`전체 데이터가 삭제되었습니다. 새 진행자 PIN: ${result.newPin}`, {
            duration: 15000,
          });
          setHardResetOpen(false);
          setHardResetConfirmText("");
          void loadOverview(secret);
        } else {
          toast.error(result.error);
        }
      })
      .finally(() => setIsHardResetting(false));
  }, [secret, loadOverview]);

  if (!ctxChecked || !secret) {
    return null;
  }

  return (
    <section
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
      data-route="game-manage"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">관리자 패널</h1>
        <p className="text-muted-foreground">
          진행자 PIN 관리와 데이터 초기화를 담당합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>데이터 현황</CardTitle>
          <CardDescription>
            활성 방 및 전체 누적 데이터 현황입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {overviewError && (
            <p className="text-destructive text-sm">{overviewError}</p>
          )}
          {overview ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">활성 방 상태</span>
                <Badge variant="secondary">{overview.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">참가자 수</span>{" "}
                {overview.playerCount}명
              </div>
              <div>
                <span className="text-muted-foreground">전체 방</span>{" "}
                {overview.totalRooms}개
              </div>
              <div>
                <span className="text-muted-foreground">종료된 방</span>{" "}
                {overview.endedRooms}개
              </div>
              <div>
                <span className="text-muted-foreground">누적 참가자</span>{" "}
                {overview.players}건
              </div>
              <div>
                <span className="text-muted-foreground">누적 메시지</span>{" "}
                {overview.messages}건
              </div>
              <div>
                <span className="text-muted-foreground">누적 투표</span>{" "}
                {overview.votes}건
              </div>
              <div>
                <span className="text-muted-foreground">누적 밤 행동</span>{" "}
                {overview.nightActions}건
              </div>
            </div>
          ) : (
            !overviewError && (
              <p className="text-muted-foreground">현황을 불러오는 중입니다...</p>
            )
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => void loadOverview(secret)}
            disabled={isLoadingOverview}
          >
            새로고침
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>진행자 PIN</CardTitle>
          <CardDescription>
            {overview
              ? `현재 진행자 PIN: ${overview.adminPin}`
              : "현재 PIN을 불러오는 중입니다..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="new-admin-pin">새 PIN (4자리 숫자)</Label>
          <Input
            id="new-admin-pin"
            inputMode="numeric"
            maxLength={4}
            placeholder="예: 1234"
            value={newPin}
            onChange={(event) => setNewPin(event.target.value)}
          />
          {pinError && <p className="text-destructive text-sm">{pinError}</p>}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => void handleChangePin()}
            disabled={isChangingPin}
          >
            PIN 변경
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>현재 게임만 초기화</CardTitle>
          <CardDescription>
            투표·채팅·역할 등 진행 기록만 삭제하고 참가자는 유지합니다.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            onClick={handleSoftReset}
            disabled={isSoftResetting}
          >
            현재 게임 초기화
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>종료된 방 정리</CardTitle>
          <CardDescription>
            종료(ended)된 방과 관련 기록을 삭제해 누적 데이터를 정리합니다.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={handlePurgeEnded}
            disabled={isPurging}
          >
            종료된 방 정리
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">전체 데이터 완전 삭제</CardTitle>
          <CardDescription>
            모든 방·참가자·채팅·투표·밤 행동 기록이 영구적으로 삭제됩니다. 되돌릴 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            onClick={() => setHardResetOpen(true)}
          >
            전체 데이터 완전 삭제
          </Button>
        </CardFooter>
      </Card>

      <Dialog
        open={hardResetOpen}
        onOpenChange={(open) => {
          setHardResetOpen(open);
          if (!open) setHardResetConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정말로 전체 데이터를 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 계속하려면 아래 입력란에 &quot;
              {HARD_RESET_CONFIRM_TEXT}&quot;를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hard-reset-confirm">확인 문구</Label>
            <Input
              id="hard-reset-confirm"
              value={hardResetConfirmText}
              onChange={(event) => setHardResetConfirmText(event.target.value)}
              placeholder={HARD_RESET_CONFIRM_TEXT}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 w-full"
              onClick={() => void handleHardReset()}
              disabled={
                isHardResetting || hardResetConfirmText !== HARD_RESET_CONFIRM_TEXT
              }
            >
              완전 삭제 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
