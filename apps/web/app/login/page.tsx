import { signInAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <form action={signInAction} className="space-y-4">
        <input
          type="email"
          name="email"
          defaultValue="smoke@loopos.test"
          className="w-full rounded border px-3 py-2"
          placeholder="email"
          required
        />
        <input
          type="password"
          name="password"
          defaultValue="smoke-test-password-123"
          className="w-full rounded border px-3 py-2"
          placeholder="password"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-neutral-900 px-4 py-2 text-white"
        >
          로그인
        </button>
      </form>
    </div>
  );
}
