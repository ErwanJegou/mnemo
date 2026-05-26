// Client Supabase serveur avec la clé SECRÈTE (service role).
// ⚠️ À n'utiliser QUE dans la zone /admin (server components et server actions
// protégés par le layout admin) ou dans des routes serveur déjà gardées.
// Bypass RLS — la garde isAdmin() côté layout est donc la seule barrière.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createAdminClient(): ReturnType<typeof createSupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Config Supabase admin manquante : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
