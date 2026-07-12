import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) return null;

  adminClient = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });

  return adminClient;
}
