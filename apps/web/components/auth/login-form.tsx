"use client";

import { useState } from "react";
import { signInAction, signUpAction } from "@/app/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Separator } from "@ssota/ui/components/ui/separator";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  error?: string;
  initialMode?: "signin" | "signup";
  googleAuthEnabled?: boolean;
};

export function LoginForm({
  error,
  initialMode = "signin",
  googleAuthEnabled = false,
}: LoginFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="space-y-4">
        <CardTitle>{mode === "signin" ? "로그인" : "회원가입"}</CardTitle>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "signin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setMode("signin")}
          >
            로그인
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "signup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <form
          action={mode === "signin" ? signInAction : signUpAction}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="password"
              required
              minLength={8}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            {mode === "signin" ? "로그인" : "계정 만들기"}
          </Button>
        </form>
        {googleAuthEnabled && mode === "signin" ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">또는</span>
              <Separator className="flex-1" />
            </div>
            <GoogleSignInButton />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
