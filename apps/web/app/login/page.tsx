import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/auth/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <LoginForm error={error} googleAuthEnabled={isGoogleAuthEnabled()} />
  );
}
