import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOutAction } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoopOS Console",
  description: "Human Gate · Action Log · Catalog",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold">
                LoopOS
              </Link>
              {user && (
                <nav className="flex gap-4 text-sm">
                  <Link href="/gates">Human Gate</Link>
                  <Link href="/log">Action Log</Link>
                  <Link href="/catalog">Catalog</Link>
                </nav>
              )}
            </div>
            {user ? (
              <form action={signOutAction}>
                <button type="submit" className="text-sm text-neutral-600">
                  {user.email} · 로그아웃
                </button>
              </form>
            ) : (
              <Link href="/login" className="text-sm">
                로그인
              </Link>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
