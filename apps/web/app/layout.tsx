import type { Metadata } from "next";
import Link from "next/link";
import { TooltipProvider } from "@ssota/ui/components/ui/tooltip";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getTranslations } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/supabase/server";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@ssota/ui/components/ui/button";
import { VercelAnalytics } from "@/components/analytics/vercel-analytics";
import { VercelSpeedInsights } from "@/components/analytics/vercel-speed-insights";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SSOTA Console",
  description: "Context Graph · Reviews · Runs",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const { locale, messages, t } = await getTranslations();

  return (
    <html lang={locale} className={cn("style-ssota font-sans", geist.variable)}>
      <body className="min-h-screen bg-background text-foreground">
        <LocaleProvider locale={locale} messages={messages}>
          <TooltipProvider>
            {!user ? (
              <header className="border-b bg-card">
                <div className="flex items-center justify-between px-6 py-4">
                  <Link href="/" className="text-lg font-semibold">
                    SSOTA
                  </Link>
                  <Button
                    render={<Link href="/login" />}
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                  >
                    {t("common.signIn")}
                  </Button>
                </div>
              </header>
            ) : null}
            {user ? (
              children
            ) : (
              <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
            )}
          </TooltipProvider>
        </LocaleProvider>
        <VercelAnalytics />
        <VercelSpeedInsights />
      </body>
    </html>
  );
}
