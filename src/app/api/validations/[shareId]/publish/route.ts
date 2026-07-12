import { z } from "zod";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface PublishRouteContext {
  params: Promise<{ shareId: string }>;
}

export async function POST(request: Request, context: PublishRouteContext) {
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
    .select("owner_id, visibility")
    .eq("share_id", shareId)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return Response.json({ error: "Validation not found." }, { status: 404 });
  }
  if (existing.data.owner_id && existing.data.owner_id !== authData.user.id) {
    return Response.json(
      { error: "This validation belongs to another account." },
      { status: 403 },
    );
  }
  if (existing.data.visibility === "public") {
    return Response.json({ visibility: "public" });
  }

  const update = await admin
    .from("validations")
    .update({
      owner_id: authData.user.id,
      visibility: "public",
      published_at: new Date().toISOString(),
    })
    .eq("share_id", shareId)
    .or(`owner_id.is.null,owner_id.eq.${authData.user.id}`)
    .select("visibility")
    .maybeSingle();

  if (update.error || !update.data) {
    return Response.json(
      { error: "The validation could not be published." },
      { status: 409 },
    );
  }

  return Response.json({ visibility: "public" });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
