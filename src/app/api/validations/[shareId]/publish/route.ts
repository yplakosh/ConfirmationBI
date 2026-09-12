import { z } from "zod";
import { cookies } from "next/headers";
import { creatorCookieName, creatorCookiePath, creatorTokenHash, canPublishReport } from "@/lib/report-ownership";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { publishingEnabled } from "@/lib/generation-controls";

interface PublishRouteContext {
  params: Promise<{ shareId: string }>;
}

export async function POST(request: Request, context: PublishRouteContext) {
  if (!publishingEnabled()) {
    return Response.json({ error: "Public publishing is temporarily paused." }, { status: 503 });
  }
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const { shareId } = await context.params;
  if (!z.string().uuid().safeParse(shareId).success) {
    return Response.json({ error: "Validation not found." }, { status: 404 });
  }

  const authClient = await createSupabaseAuthServerClient();
  const { data: authData, error: authError } =
    (await authClient?.auth.getUser()) ?? { data: { user: null }, error: null };
  if (authError || !authData.user) {
    return Response.json({ error: "Sign in before publishing." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: "Publishing is not configured." }, { status: 503 });
  }

  const existing = await admin
    .from("validations")
    .select("owner_id, creator_token_hash, visibility")
    .eq("share_id", shareId)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return Response.json({ error: "Validation not found." }, { status: 404 });
  }
  const cookieStore = await cookies();
  const tokenHash = creatorTokenHash(cookieStore.get(creatorCookieName(shareId))?.value);
  if (!canPublishReport(existing.data, authData.user.id, tokenHash)) {
    return Response.json(
      { error: "Only the creator can publish this report. For an anonymous report, use the browser where it was generated." },
      { status: 403 },
    );
  }
  if (existing.data.visibility === "public") {
    return Response.json({ visibility: "public" });
  }

  let query = admin
    .from("validations")
    .update({
      owner_id: authData.user.id,
      creator_token_hash: null,
      visibility: "public",
      published_at: new Date().toISOString(),
    })
    .eq("share_id", shareId);

  // Repeat the ownership condition in the write to prevent concurrent claims.
  query = existing.data.owner_id
    ? query.eq("owner_id", authData.user.id)
    : query.is("owner_id", null).eq("creator_token_hash", tokenHash!);

  const update = await query
    .select("visibility")
    .maybeSingle();

  if (update.error || !update.data) {
    return Response.json(
      { error: "The validation could not be published." },
      { status: 409 },
    );
  }

  cookieStore.set(creatorCookieName(shareId), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: creatorCookiePath(shareId),
    maxAge: 0,
  });
  return Response.json({ visibility: "public" });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
