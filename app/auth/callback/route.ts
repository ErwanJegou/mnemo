// Callback OAuth/magic link Supabase. Échange le `code` reçu contre une
// session côté serveur (les cookies httpOnly sont posés par @supabase/ssr).
// En cas d'erreur, on renvoie vers /connexion avec un message lisible.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/espace";

  if (code === null) {
    return NextResponse.redirect(
      `${origin}/connexion?erreur=${encodeURIComponent("Lien invalide ou expiré.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    return NextResponse.redirect(
      `${origin}/connexion?erreur=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
