import { NextResponse } from "next/server";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseAuthServerClient();
    const result = await supabase?.auth.exchangeCodeForSession(code);
    if (result && !result.error) {
      return NextResponse.redirect(new URL(next, publicOrigin(request)));
    }
  }

  const errorUrl = new URL(next, publicOrigin(request));
  errorUrl.searchParams.set("authError", "1");
  return NextResponse.redirect(errorUrl);
}

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function publicOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;
}
