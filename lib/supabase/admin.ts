import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database.types";

/**
 * service_role 키를 사용하는 관리자 클라이언트.
 *
 * - RLS를 우회하므로 반드시 신뢰할 수 있는 서버 전용 코드(Server Action 등)에서만 호출한다.
 * - 클라이언트 컴포넌트/훅에서 직접 import 하지 말 것. 반드시 "use server" 액션을 경유한다.
 * - `server-only` 임포트로 클라이언트 번들에 포함되면 빌드 타임에 에러가 발생한다.
 * - Fluid compute 환경을 위해 모듈 전역에 저장하지 않고, 호출마다 새로 생성한다.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
