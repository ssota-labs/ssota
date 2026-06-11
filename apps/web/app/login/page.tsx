import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/auth/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { error, mode } = await searchParams;

  return (
    <LoginForm
      error={error}
      initialMode={mode === "signup" ? "signup" : "signin"}
      googleAuthEnabled={isGoogleAuthEnabled()}
    />
  );
}
