import type { Metadata } from "next";
import { TooltipProvider } from "@ssota/ui/components/ui/tooltip";
import { ThemeProvider } from "@ssota/ui/components/theme-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getTranslations } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/supabase/server";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { VercelAnalytics } from "@/components/analytics/vercel-analytics";
import { VercelSpeedInsights } from "@/components/analytics/vercel-speed-insights";
import { AppToaster } from "@/components/app-toaster";
import { RootAppChrome } from "@/components/root-app-chrome";

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
    <html
      lang={locale}
      className={cn("style-ssota font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <LocaleProvider locale={locale} messages={messages}>
            <TooltipProvider>
              <RootAppChrome user={Boolean(user)} signInLabel={t("common.signIn")}>
                {children}
              </RootAppChrome>
            </TooltipProvider>
            <AppToaster />
          </LocaleProvider>
        </ThemeProvider>
        <VercelAnalytics />
        <VercelSpeedInsights />
      </body>
    </html>
  );
}
