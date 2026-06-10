import type { Metadata } from "next";
import Link from "next/link";
import { TooltipProvider } from "@loopos/ui/components/ui/tooltip";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOutAction } from "./actions";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@loopos/ui/components/ui/button";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="ko" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background text-foreground">
        <TooltipProvider>
          <header className="border-b bg-card">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold">
                  LoopOS
                </Link>
                {user && (
                  <nav className="flex gap-4 text-sm">
                    <Link href="/gates" className="text-muted-foreground hover:text-foreground">
                      Human Gate
                    </Link>
                    <Link href="/log" className="text-muted-foreground hover:text-foreground">
                      Action Log
                    </Link>
                    <Link href="/catalog" className="text-muted-foreground hover:text-foreground">
                      Catalog
                    </Link>
                  </nav>
                )}
              </div>
              {user ? (
                <form action={signOutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    {user.email} · 로그아웃
                  </Button>
                </form>
              ) : (
                <Button render={<Link href="/login" />} variant="ghost" size="sm" nativeButton={false}>
                  로그인
                </Button>
              )}
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
