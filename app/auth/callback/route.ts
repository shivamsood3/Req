import { NextResponse } from "next/server";
import { resolvePostAuthRoute } from "@/lib/auth-policy";
import { createClient } from "@/lib/supabase/server";
import type { BrokerProfile } from "@/lib/types";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("://")) return null;
  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/auth/error", requestUrl.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/error", requestUrl.origin));

  if (next) return NextResponse.redirect(new URL(next, requestUrl.origin));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  return NextResponse.redirect(
    new URL(resolvePostAuthRoute(profile as BrokerProfile | null), requestUrl.origin),
  );
}
