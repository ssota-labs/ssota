"use client";

import { createClient } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
);

export function ConsentForm() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!authorizationId) {
        setError("authorization_id가 필요합니다.");
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = `/oauth/login?authorization_id=${authorizationId}`;
        return;
      }

      const { data, error: detailsError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      setDetails(data as Record<string, unknown>);
    }
    void load();
  }, [authorizationId]);

  async function handleApprove() {
    if (!authorizationId) return;
    const { data, error: approveError } =
      await supabase.auth.oauth.approveAuthorization(authorizationId);
    if (approveError) {
      setError(approveError.message);
      return;
    }
    if (data?.redirect_url) {
      window.location.href = data.redirect_url;
    }
  }

  async function handleDeny() {
    if (!authorizationId) return;
    const { data, error: denyError } =
      await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (denyError) {
      setError(denyError.message);
      return;
    }
    if (data?.redirect_url) {
      window.location.href = data.redirect_url;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">OAuth 동의</h1>
      <p className="text-sm text-neutral-600">
        MCP 클라이언트가 LoopOS에 접근하려 합니다.
      </p>
      {error && <p className="text-red-600">{error}</p>}
      {details && (
        <pre className="overflow-auto rounded bg-neutral-100 p-4 text-xs">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void handleApprove()}
          className="rounded bg-black px-4 py-2 text-white"
        >
          승인
        </button>
        <button
          type="button"
          onClick={() => void handleDeny()}
          className="rounded border px-4 py-2"
        >
          거부
        </button>
      </div>
    </main>
  );
}
