import type { ReactElement } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Header global rendu côté serveur : appelle `getUser()` à chaque requête
// pour décider du libellé (Connexion vs. Mon espace). Le middleware s'occupe
// de rafraîchir le token avant que ce composant ne tourne.
export async function SiteHeader(): Promise<ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-container-margin py-3">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="font-display text-body-lg font-semibold text-on-surface">Mnémo</span>
        </Link>
        <nav className="flex items-center gap-4 text-body-sm">
          <Link
            href="/fiduciaire"
            className="text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Charte fiduciaire
          </Link>
          {user === null ? (
            <Link
              href="/connexion"
              className="rounded-full bg-primary px-4 py-1.5 font-medium text-on-primary transition-colors hover:bg-primary-container"
            >
              Connexion
            </Link>
          ) : (
            <Link
              href="/espace"
              className="rounded-full border border-outline-variant px-4 py-1.5 font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              Mon espace
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
