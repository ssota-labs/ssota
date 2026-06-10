import type { Metadata } from "next";
import Link from "next/link";
import { TooltipProvider } from "@loopos/ui/components/ui/tooltip";
import { getCurrentUser } from "@/lib/supabase/server";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@loopos/ui/components/ui/button";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "LoopOS Console",
  description: "Context Graph · Human Gate · Action Log",
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
          {!user ? (
            <header className="border-b bg-card">
              <div className="flex items-center justify-between px-6 py-4">
                <Link href="/" className="text-lg font-semibold">
                  LoopOS
                </Link>
                <Button
                  render={<Link href="/login" />}
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                >
                  로그인
                </Button>
              </div>
            </header>
          ) : null}
          <main className={user ? "" : "mx-auto max-w-6xl px-6 py-8"}>
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
