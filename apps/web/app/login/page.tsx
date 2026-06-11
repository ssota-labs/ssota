import { LoginForm } from "@/components/auth/login-form";

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
    />
  );
}
