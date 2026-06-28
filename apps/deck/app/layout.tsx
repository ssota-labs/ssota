import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

/** 한글: Geist에 글리프 없음 → 폴백으로 적용. 영문은 Geist 우선. */
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SSOTA — Investor Deck",
  description: "The AI CPO for your Agent Team",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`style-ssota font-sans ${geist.variable} ${geistMono.variable} ${pretendard.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
