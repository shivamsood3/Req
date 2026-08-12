import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.includes("://")) return "/";
  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();

  if (!tokenHash || !type || !supabase) {
    return NextResponse.redirect(new URL("/auth/error", requestUrl.origin));
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) return NextResponse.redirect(new URL("/auth/error", requestUrl.origin));

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
