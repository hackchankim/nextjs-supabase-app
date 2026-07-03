// 역할 카드 — 모든 역할이 완전히 동일한 레이아웃/스타일을 사용 (무차별 UI 원칙)
// role 값에 따른 조건부 색상/className 분기를 절대 추가하지 말 것.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/game/constants";
import type { PlayerRole } from "@/lib/game/types";

interface RoleCardProps {
  role: PlayerRole;
}

export function RoleCard({ role }: RoleCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center gap-1 text-center">
        <CardDescription>나의 역할</CardDescription>
        <CardTitle className="text-2xl">{ROLE_LABELS[role]}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">
          {ROLE_DESCRIPTIONS[role]}
        </p>
      </CardContent>
    </Card>
  );
}
