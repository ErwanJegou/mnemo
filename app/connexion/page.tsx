import type { Metadata } from "next";
import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";
import { requestMagicLink } from "./actions";

export const metadata: Metadata = {
  title: "Connexion — Mnémo",
  description: "Connectez-vous par lien magique pour accéder à votre espace Mnémo.",
};

type Search = { envoye?: string; erreur?: string };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user !== null) {
    redirect("/espace");
  }

  const { envoye, erreur } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-container-margin py-section-padding">
      <Card>
        <header className="mb-4">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Connexion</span>
          <h1 className="mt-2 font-display text-headline-md text-on-surface">Lien magique</h1>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            Renseignez votre e-mail. Vous recevrez un lien à usage unique qui crée — ou rouvre — votre
            espace Mnémo et son cercle personnel.
          </p>
        </header>

        {envoye !== undefined ? (
          <p className="rounded-input border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary">
            E-mail envoyé à <strong>{envoye}</strong>. Vérifiez votre boîte (et les spams).
          </p>
        ) : null}

        {erreur !== undefined ? (
          <p className="rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        ) : null}

        <form action={requestMagicLink} className="mt-4 space-y-3">
          <label htmlFor="email" className="text-label-caps uppercase text-on-surface-variant">
            Adresse e-mail
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
          />
          <Button type="submit" size="md" className="w-full">
            Recevoir le lien
          </Button>
        </form>

        <p className="mt-4 text-body-sm text-on-surface-variant">
          Aucune installation requise. Votre cercle personnel (multi-tenant) est créé à votre première
          connexion. Vous pouvez activer ou désactiver le partage anonymisé des coûts (F9) à tout
          moment depuis votre espace.
        </p>
      </Card>
    </main>
  );
}
