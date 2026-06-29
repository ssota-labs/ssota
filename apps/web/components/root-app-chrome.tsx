"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";

/** Routes that render without guest header / padded main (e.g. bare embeds). */
const BARE_ROUTES = ["/", "/home"];
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
  const isBare =
    (pathname ? BARE_ROUTES.includes(pathname) : false) ||
    BARE_ROUTE_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <>
      {!user ? (
        <header className="border-b bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <Link
              href="/home"
              className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md"
                aria-hidden
              >
                <Image
                  src="/landing/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  priority
                  className="size-7 object-contain mix-blend-screen"
                />
              </span>
              SSOTA
            </Link>
            {pathname !== "/login" ? (
              <Button
                render={<Link href="/login" />}
                variant="ghost"
                size="sm"
                nativeButton={false}
              >
                {signInLabel}
              </Button>
            ) : null}
          </div>
        </header>
      ) : null}
      {user ? children : <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>}
    </>
  );
}
