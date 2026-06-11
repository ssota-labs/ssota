import Link from "next/link";

type OnboardingShellProps = {
  title: string;
  description: string;
  form: React.ReactNode;
  preview: React.ReactNode;
};

export function OnboardingShell({
  title,
  description,
  form,
  preview,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          LoopOS
        </Link>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-3">
        <section className="flex flex-col justify-center px-6 py-10 lg:col-span-1 lg:px-12 xl:px-16">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {form}
          </div>
        </section>

        <section className="relative hidden items-center lg:col-span-2 lg:flex">
          <div className="w-[128%] min-w-[44rem] origin-left scale-[1.06] pr-0 shadow-2xl">
            {preview}
          </div>
        </section>
      </div>
    </div>
  );
}
