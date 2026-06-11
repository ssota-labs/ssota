import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext) ?? undefined;

  return (
    <LoginForm
      error={error}
      googleAuthEnabled={isGoogleAuthEnabled()}
      next={next}
    />
  );
}
