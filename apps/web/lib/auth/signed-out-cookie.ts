import { cookies } from "next/headers";

export const AUTH_SIGNED_OUT_COOKIE = "ssota_auth_signed_out";

export async function isAuthSignedOut(): Promise<boolean> {
  const store = await cookies();
  return store.get(AUTH_SIGNED_OUT_COOKIE)?.value === "1";
}

export async function setAuthSignedOut(): Promise<void> {
  const store = await cookies();
  store.set(AUTH_SIGNED_OUT_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearAuthSignedOut(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_SIGNED_OUT_COOKIE);
}
