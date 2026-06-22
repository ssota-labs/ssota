import { NextResponse } from "next/server";
import {
  ApiAccountScopeError,
  isAccountAccessError,
  isApiAccountScopeError,
} from "@/lib/api/resolve-api-account-scope";

export function apiScopeErrorResponse(error: unknown): NextResponse | null {
  if (isApiAccountScopeError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (isAccountAccessError(error)) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}
