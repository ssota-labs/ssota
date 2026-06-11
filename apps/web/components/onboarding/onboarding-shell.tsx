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
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          LoopOS
        </Link>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-0 lg:grid-cols-2">
        <section className="flex flex-col justify-center px-6 py-10 lg:px-10">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {form}
          </div>
        </section>

        <section className="hidden border-l bg-background p-8 lg:flex lg:items-center">
          <div className="w-full">{preview}</div>
        </section>
      </div>
    </div>
  );
}
