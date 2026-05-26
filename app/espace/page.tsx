import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { createClient } from "@/lib/supabase/server";
import {
  deleteConfiguration,
  signOut,
  toggleNetworkConsent,
} from "./actions";

export const metadata: Metadata = {
  title: "Mon espace — Mnémo",
  description: "Votre cercle Mnémo, vos configurations sauvegardées et votre consentement réseau.",
};

type Search = { erreur?: string; saved?: string };

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string | null): string {
  if (iso === null) return "—";
  return DATE_FMT.format(new Date(iso));
}

export default async function EspacePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    redirect("/connexion");
  }

  const { erreur, saved } = await searchParams;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("circle_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const membership = memberships?.[0];
  if (membership === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-container-margin py-section-padding">
        <Card>
          <p className="text-body-md text-on-surface">
            Aucun cercle n’est encore associé à votre compte. Reconnectez-vous pour déclencher la
            création automatique (trigger Postgres <code>handle_new_user</code>).
          </p>
        </Card>
      </main>
    );
  }

  const circleId = membership.circle_id;

  const [{ data: circles }, { data: consentRows }, { data: configurations }] = await Promise.all([
    supabase.from("circles").select("id, name").eq("id", circleId).limit(1),
    supabase
      .from("network_consents")
      .select("consented, consented_at, revoked_at")
      .eq("circle_id", circleId)
      .eq("user_id", user.id)
      .eq("scope", "cost_network")
      .limit(1),
    supabase
      .from("configurations")
      .select("id, label, created_at, profile, recommendation")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: false }),
  ]);

  const circleName = circles?.[0]?.name ?? "Mon cercle";
  const consent = consentRows?.[0];
  const consented = consent?.consented === true;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-container-margin py-section-padding">
      <header className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">Mon espace</span>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-headline-lg text-on-surface">{circleName}</h1>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Se déconnecter
            </Button>
          </form>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Connecté en tant que <strong>{user.email ?? user.id}</strong> · rôle {membership.role}
        </p>
        {erreur !== undefined ? (
          <p className="rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        ) : null}
        {saved === "1" ? (
          <p className="rounded-input border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary">
            Configuration enregistrée dans votre cercle.
          </p>
        ) : null}
      </header>

      {/* Consentement réseau — F9, opt-in horodaté */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-headline-md text-on-surface">Réseau d’intelligence (F9)</h2>
              <Chip tone={consented ? "primary" : "neutral"}>
                {consented ? "Activé" : "Inactif"}
              </Chip>
            </div>
            <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">
              Partagez votre coût réel anonymisé (vendor, montant, période — jamais d’identifiant
              client) pour recalibrer le moteur au bénéfice de toute la communauté. Vous pouvez
              révoquer à tout moment.
            </p>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              {consented
                ? `Activé le ${formatDate(consent?.consented_at ?? null)}`
                : consent !== undefined && consent.revoked_at !== null
                  ? `Révoqué le ${formatDate(consent.revoked_at)}`
                  : "Pas encore de consentement enregistré"}
            </p>
          </div>
          <form action={toggleNetworkConsent}>
            <input type="hidden" name="circle_id" value={circleId} />
            {consented ? null : <input type="hidden" name="consent" value="on" />}
            <Button type="submit" variant={consented ? "secondary" : "primary"} size="sm">
              {consented ? "Désactiver" : "Activer"}
            </Button>
          </form>
        </div>
      </Card>

      {/* Configurations sauvegardées */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-headline-md text-on-surface">Mes configurations</h2>
          <Link
            href="/configurateur"
            className="text-body-sm text-primary underline decoration-dotted hover:no-underline"
          >
            Lancer un nouveau profilage
          </Link>
        </div>

        {configurations === null || configurations.length === 0 ? (
          <Card>
            <p className="text-body-sm text-on-surface-variant">
              Aucune configuration sauvegardée. Passez par le configurateur puis cliquez sur{" "}
              <strong>Sauvegarder dans mon espace</strong> en bas de la page de recommandation.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {configurations.map((cfg) => {
              const reco = (cfg.recommendation ?? {}) as {
                preset?: string;
                totalCost?: number;
                scoreAvg?: number;
              };
              return (
                <li key={cfg.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-body-lg text-on-surface">
                          {cfg.label ?? "Sans titre"}
                        </p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          Enregistrée le {formatDate(cfg.created_at)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {reco.preset !== undefined ? (
                            <Chip tone="primary">Preset {reco.preset}</Chip>
                          ) : null}
                          {reco.scoreAvg !== undefined ? (
                            <Chip tone="neutral">Score {reco.scoreAvg}/10</Chip>
                          ) : null}
                          {reco.totalCost !== undefined ? (
                            <span className="font-mono text-body-sm text-on-surface-variant">
                              ≈ {reco.totalCost} €/mois
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <form action={deleteConfiguration}>
                        <input type="hidden" name="id" value={cfg.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Supprimer
                        </Button>
                      </form>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
