import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "교회 마피아 게임",
  description: "교회 청년부를 위한 실시간 마피아 게임 — Next.js와 Supabase로 만들었습니다.",
  // iOS는 manifest의 icons를 홈 화면 아이콘으로 쓰지 않고 apple-touch-icon 링크 태그를
  // 별도로 찾으므로, 홈 화면에 추가했을 때도 같은 아이콘이 보이도록 명시한다.
  icons: {
    apple: "/icons/icon-192.png",
  },
};

// 모바일 UX(Task 015) — themeColor는 매니페스트와 동일한 값으로 상단 바 색을 맞추고,
// interactiveWidget: "resizes-content"는 모바일 키보드가 올라올 때 뷰포트를 실제로
// 줄여줘(오버레이 대신) 채팅 입력창이 키보드에 가리지 않고 레이아웃이 자연스럽게 밀리게 한다.
export const viewport: Viewport = {
  themeColor: "#4338ca",
  interactiveWidget: "resizes-content",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
