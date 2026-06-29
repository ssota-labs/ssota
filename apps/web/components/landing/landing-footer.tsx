import Image from "next/image";
import Link from "next/link";
import { GitHubDark } from "@ridemountainpig/svgl-react";
import { Button } from "@ssota/ui/components/ui/button";
import { getLandingTranslations } from "@/lib/i18n/server";
import { LandingBetaSignup } from "@/components/landing/landing-beta-signup";

const GITHUB_REPO_URL = "https://github.com/ssota-labs/loopos";
const CONTACT_EMAIL = "contact@ssota.ai";

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function LandingFooter() {
  const { t } = await getLandingTranslations();

  const productLinks = [
    { label: t("landing.nav.problem"), href: "#problem" },
    { label: t("landing.nav.solution"), href: "#solution" },
    { label: t("landing.nav.pricing"), href: "#pricing" },
    { label: t("landing.nav.faq"), href: "#faq" },
  ] as const;

  const resourceLinks = [
    { label: "GitHub", href: GITHUB_REPO_URL, external: true },
    { label: t("landing.footer.linkEmail"), href: `mailto:${CONTACT_EMAIL}` },
  ] as const;

  const companyLinks = [
    { label: t("landing.footer.linkOpenSource"), href: GITHUB_REPO_URL, external: true },
  ] as const;

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-16 md:pb-14 md:pt-20">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
          <div className="space-y-5">
            <Link href="/home" className="inline-flex items-center gap-2.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md"
                aria-hidden
              >
                <Image
                  src="/landing/logo.png"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 object-contain mix-blend-screen"
                />
              </span>
              <span className="text-lg font-semibold tracking-tight">SSOTA</span>
            </Link>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              {t("landing.footer.tagline")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-card/40 text-foreground transition-colors hover:bg-muted/40"
                aria-label="GitHub"
              >
                <GitHubDark className="size-4" aria-hidden />
              </Link>
              <LandingBetaSignup
                triggerVariant="outline"
                triggerSize="sm"
                triggerClassName="h-9 rounded-full px-4"
              />
              <Button
                render={<Link href="/login" />}
                size="sm"
                nativeButton={false}
                className="h-9 rounded-full px-4"
              >
                {t("landing.footer.getStarted")}
              </Button>
            </div>
          </div>

          <FooterLinkColumn title={t("landing.footer.colProduct")} links={productLinks} />
          <FooterLinkColumn title={t("landing.footer.colResources")} links={resourceLinks} />
          <FooterLinkColumn title={t("landing.footer.colCompany")} links={companyLinks} />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/40 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t("landing.footer.rights", { year: new Date().getFullYear() })}
          </p>
          <Link
            href={`mailto:${CONTACT_EMAIL}`}
            className="transition-colors hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </Link>
        </div>

        <div
          className="pointer-events-none mt-10 flex select-none items-end gap-[0.12em] overflow-hidden text-[clamp(4.5rem,16vw,11rem)] leading-none md:mt-14"
          aria-hidden
        >
          <Image
            src="/landing/logo.png"
            alt=""
            width={176}
            height={176}
            className="mb-[0.04em] h-[0.88em] w-[0.88em] shrink-0 object-contain mix-blend-screen"
          />
          <span className="font-semibold tracking-tight text-foreground/90">
            SSOTA
          </span>
        </div>
      </div>
    </footer>
  );
}
