"use client";

import { useState, useTransition, type ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { saveConfiguration } from "@/app/resultats/actions";

type Props = {
  userPresent: boolean;
  profile: unknown;
  recommendation: unknown;
};

/** Bloc de sauvegarde côté /resultats. Si pas connecté, propose la connexion. */
export function SaveConfigButton({ userPresent, profile, recommendation }: Props): ReactElement {
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  if (!userPresent) {
    return (
      <Card>
        <h2 className="font-display text-headline-md text-on-surface">Sauvegarder dans mon espace</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Connectez-vous pour conserver cette configuration dans votre cercle Mnémo et la retrouver
          plus tard (consentement réseau F9 disponible dans l’espace).
        </p>
        <Link
          href="/connexion"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container"
        >
          Se connecter par lien magique
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-headline-md text-on-surface">Sauvegarder dans mon espace</h2>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Cette configuration sera enregistrée dans votre cercle personnel. RLS Postgres garantit que
        seuls les membres du cercle y ont accès.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="label" className="text-label-caps uppercase text-on-surface-variant">
            Libellé (optionnel)
          </label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. Stack pour cabinet régulé"
            maxLength={120}
            disabled={pending}
            className="mt-1"
          />
        </div>
        <Button
          type="button"
          size="md"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await saveConfiguration({ label, profile, recommendation });
            });
          }}
        >
          {pending ? "Enregistrement…" : "Sauvegarder"}
        </Button>
      </div>
    </Card>
  );
}
