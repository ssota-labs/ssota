"use client";

import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ssota/ui/components/ui/dialog";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

type SubmitState = "idle" | "loading" | "success" | "error";

export function LandingBetaSignup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setSubmitState("error");
        setMessage(data.error ?? "신청에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      setSubmitState("success");
      setMessage(data.message ?? "베타 알림 신청이 완료되었습니다.");
      setEmail("");
    } catch {
      setSubmitState("error");
      setMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSubmitState("idle");
      setMessage(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="lg" className="h-11 px-6 text-sm" />
        }
      >
        베타 알림 받기
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>베타 오픈 알림 받기</DialogTitle>
          <DialogDescription>
            7월 중 SSOTA 베타가 오픈되면 이메일로 가장 먼저 알려드립니다.
          </DialogDescription>
        </DialogHeader>

        {submitState === "success" ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="beta-email">이메일</Label>
              <Input
                id="beta-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitState === "loading"}
              />
            </div>
            {submitState === "error" && message ? (
              <p className="text-sm text-destructive">{message}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={submitState === "loading" || email.trim().length === 0}
              >
                {submitState === "loading" ? "신청 중…" : "알림 신청"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
