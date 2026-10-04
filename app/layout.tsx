import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_KR({
  variable: "--font-plex",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false, // 한글 subset 은 preload 지정이 안 돼서 끄고, CSS unicode-range 로 필요한 조각만 받는다
});

export const metadata: Metadata = {
  title: "퀵마트 실험실",
  description: "사례별 A/B 테스트 조별 실습 플랫폼",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${plex.variable} font-sans`}>{children}</body>
    </html>
  );
}
