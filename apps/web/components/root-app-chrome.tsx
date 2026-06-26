"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";

/** Routes that render without guest header / padded main (e.g. bare embeds). */
const BARE_ROUTE_PREFIXES: string[] = [];

type RootAppChromeProps = {
  children: React.ReactNode;
  user: boolean;
  signInLabel: string;
};

export function RootAppChrome({
  children,
  user,
  signInLabel,
}: RootAppChromeProps) {
  const pathname = usePathname();
  const isBare = BARE_ROUTE_PREFIXES.some((prefix) =>
    pathname?.startsWith(prefix),
  );

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <>
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
              {signInLabel}
            </Button>
          </div>
        </header>
      ) : null}
      {user ? children : <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>}
    </>
  );
}
