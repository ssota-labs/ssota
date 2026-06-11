"use client";

import { createClient } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
);

export function LoginForm() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const [email, setEmail] = useState("smoke@ssota.test");
  const [password, setPassword] = useState("smoke-test-password-123");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    window.location.href = `/oauth/consent?authorization_id=${authorizationId}`;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <Card>
        <CardHeader>
          <CardTitle>MCP OAuth 로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleLogin(e)} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="mcp-email">Email</Label>
              <Input
                id="mcp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-password">Password</Label>
              <Input
                id="mcp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
