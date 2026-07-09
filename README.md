<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Proxy
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
  ```
  > [!NOTE]
  > This example uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
  > Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be used in this example.
  > See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

  Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)

## 교회 마피아 게임 — 행사 진행 가이드

이 프로젝트에는 교회 소모임/행사에서 진행하는 마피아(스파이 색출) 게임이 함께 포함되어 있습니다(`/game` 이하 라우트). 행사 당일 진행자가 참고할 수 있도록 아래에 운영 절차를 정리합니다.

### 1. 참가자 초대 (URL / QR코드)

- 참가자는 `/game` 페이지에서 닉네임만 입력하면 즉시 대기실에 입장합니다(회원가입 불필요).
- 진행자 대시보드(`/game/admin`)의 **제어** 탭에서는 대기실 상태(게임 시작 전)일 때 참가 QR코드와 URL 텍스트가 함께 표시됩니다. 빔프로젝터 화면이나 진행자 휴대폰 화면을 참가자에게 보여주어 QR코드를 스캔하게 하거나, 표시된 URL을 구두로 불러주면 됩니다.
- QR코드는 외부 서버 호출 없이 브라우저에서 즉시 생성되므로 인터넷 연결이 불안정한 현장에서도 안전하게 동작합니다.

### 2. 인원 안내

- 최소 **5명**, 최대 **20명**까지 참가할 수 있습니다.
- 최소 인원(5명) 미만이면 진행자 대시보드에서 "게임 시작" 버튼이 비활성화되어 노출되지 않습니다.
- 인원이 최소 인원을 충족하면 시작 버튼 위에 예상 역할 배분(이단/이단 대장/목사님/장로님/권사님/성도 인원수)이 미리 표시됩니다.

### 3. 진행자 PIN

- 게임 방이 생성되면 4자리 진행자 PIN이 함께 발급됩니다. 이 PIN은 **진행자만 알아야 하며 참가자에게 공유하면 안 됩니다** — PIN을 아는 사람은 게임 시작/강퇴/페이즈 전환/게임 리셋 등 모든 진행자 권한을 행사할 수 있습니다.
- PIN은 진행자 대시보드 진입 시 1회 입력하면 됩니다(브라우저 세션에 저장되어 새로고침해도 유지됩니다).

### 4. 세션 자동 리셋 (24시간)

- 방이 **대기실 상태로 24시간 넘게 방치**되면, 다음 행사에서 누군가 다시 `/game`에 입장(또는 진행자가 PIN을 입력)하는 시점에 남아있던 참가자 목록이 자동으로 정리됩니다. **진행자 PIN은 재발급되지 않고 그대로 유지**되니 이전 PIN을 계속 쓰면 됩니다.
- 즉, 지난 행사에서 아무도 대기실을 정리하지 않고 그냥 종료했더라도, 다음 행사 때 참가자가 처음 입장하는 순간 자동으로 깨끗한 대기실로 시작됩니다.
- 이 정리는 "다른 날의 새 세션"을 위한 것이라 참가자 레코드 자체를 삭제합니다 — 이전 행사 참가자는 다음 행사에서 닉네임을 다시 입력해 새로 입장해야 합니다. (반면 진행자가 직접 누르는 "게임 리셋" 버튼은 같은 행사 중 재시작이 목적이므로 참가자 레코드를 유지한 채 역할만 초기화합니다.)
- **이미 낮/밤으로 게임이 진행 중인 방은 24시간이 지나도 자동 정리되지 않습니다** — 진행 중인 게임 데이터를 실수로 지우지 않기 위한 안전장치입니다.

### 5. 대기실 → 게임 흐름 요약

1. 참가자가 `/game`에서 닉네임을 입력해 대기실에 입장합니다.
2. 진행자가 대시보드에서 최소 인원 충족을 확인하고 "게임 시작"을 누르면 역할이 배정되고 낮 페이즈가 시작됩니다.
3. 낮(토론·투표)과 밤(이단 대장의 제거, 목사님의 조사, 권사님의 보호) 페이즈가 진행자의 페이즈 전환 조작에 따라 반복됩니다.
4. 선 팀 또는 이단 팀의 승리 조건이 충족되면 게임이 자동 종료되고 전원의 역할이 공개됩니다.
5. 같은 행사에서 다시 플레이하려면 진행자가 "게임 리셋"을 눌러 대기실로 되돌아갑니다.
