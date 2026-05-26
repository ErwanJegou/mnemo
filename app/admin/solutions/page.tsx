import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  COMPLEXITY_LABELS,
  COMPLEXITY_TONE,
  STATUS_LABELS,
} from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteSolution } from "./actions";

type Search = { ok?: string; erreur?: string };

const FEEDBACKS: Record<string, string> = {
  created: "Solution créée.",
  updated: "Solution mise à jour.",
  deleted: "Solution supprimée.",
};

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0,
});

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { ok, erreur } = await searchParams;
  const supabase = createAdminClient();

  const [solRes, stepsRes] = await Promise.all([
    supabase.from("solutions").select("*").order("position").order("created_at"),
    supabase.from("solution_steps").select("solution_id"),
  ]);
  if (solRes.error !== null) throw solRes.error;
  if (stepsRes.error !== null) throw stepsRes.error;

  const counts = new Map<string, number>();
  for (const s of stepsRes.data) counts.set(s.solution_id, (counts.get(s.solution_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Solutions</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Solutions ({solRes.data.length})
          </h1>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Recettes complètes orientées problème, affichées en page d&apos;accueil publique.
          </p>
        </div>
        <Link href="/admin/solutions/new"><Button>+ Nouvelle solution</Button></Link>
      </header>

      {ok !== undefined && FEEDBACKS[ok] !== undefined ? (
        <p className="rounded-input border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary">
          {FEEDBACKS[ok]}
        </p>
      ) : null}
      {erreur !== undefined ? (
        <p className="rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      ) : null}

      <ul className="grid gap-3">
        {solRes.data.map((s) => {
          const stepsCount = counts.get(s.id) ?? 0;
          return (
            <li key={s.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <div className="shrink-0 text-4xl" aria-hidden="true">
                      {s.hero_emoji ?? "🧩"}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/solutions/${s.id}/edit`}
                          className="font-display text-body-lg text-on-surface hover:text-primary"
                        >
                          {s.title}
                        </Link>
                        <Chip tone={COMPLEXITY_TONE[s.complexity]}>{COMPLEXITY_LABELS[s.complexity]}</Chip>
                        <Chip tone={s.status === "validated" ? "primary" : "neutral"}>
                          {STATUS_LABELS[s.status]}
                        </Chip>
                        <Chip tone="neutral">{stepsCount} étape{stepsCount > 1 ? "s" : ""}</Chip>
                      </div>
                      <p className="font-mono text-xs text-on-surface-variant">
                        slug : <code>{s.slug}</code>
                        {s.total_price_estimate_eur !== null
                          ? ` · ${EUR.format(s.total_price_estimate_eur)}/mois`
                          : ""}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">{s.problem_statement}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {s.status === "validated" ? (
                      <Link href={`/solutions/${s.slug}`} target="_blank">
                        <Button variant="ghost" size="sm">Voir public ↗</Button>
                      </Link>
                    ) : null}
                    <Link href={`/admin/solutions/${s.id}/edit`}>
                      <Button variant="ghost" size="sm">Éditer</Button>
                    </Link>
                    <form action={deleteSolution}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" variant="ghost" size="sm">Supprimer</Button>
                    </form>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
