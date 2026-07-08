import type { MetadataRoute } from "next";

// PWA 매니페스트(Task 015) — 참가자가 모바일 홈 화면에 추가해 앱처럼 실행할 수 있게 한다.
// start_url을 "/game"으로 지정해 홈 화면 아이콘 실행 시 곧바로 입장 화면으로 이동한다.
// theme_color/background_color는 app/globals.css의 라이트 테마 기본값(흰 배경)과
// 아이콘 배경색(인디고 계열)에 맞춰 정한다 — 역할별로 달라지지 않는 중립 값이다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "교회 마피아 게임",
    short_name: "교회 마피아",
    description: "교회 청년부를 위한 실시간 마피아 게임",
    start_url: "/game",
    display: "standalone",
    lang: "ko",
    theme_color: "#4338ca",
    background_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
