import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function OAuthLoginPage() {
  return (
    <Suspense fallback={<main className="p-8">로딩 중…</main>}>
      <LoginForm />
    </Suspense>
  );
}
