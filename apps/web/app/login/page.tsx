import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { isGoogleAuthEnabled } from "@/lib/auth/config";
import { signInAction } from "../actions";
import { Button } from "@loopos/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";
import { Input } from "@loopos/ui/components/ui/input";
import { Label } from "@loopos/ui/components/ui/label";
import { Separator } from "@loopos/ui/components/ui/separator";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const googleAuthEnabled = isGoogleAuthEnabled();

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={signInAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              defaultValue="smoke@loopos.test"
              placeholder="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              defaultValue="smoke-test-password-123"
              placeholder="password"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            로그인
          </Button>
        </form>
        {googleAuthEnabled && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">또는</span>
              <Separator className="flex-1" />
            </div>
            <GoogleSignInButton />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
