import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { RATING_SOURCE_LABELS, formatScore } from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteRating } from "./actions";

type Search = { ok?: string; erreur?: string; brick?: string };

const FEEDBACKS: Record<string, string> = {
  created: "Note créée.",
  updated: "Note mise à jour.",
  deleted: "Note supprimée.",
};

const EUR_PRECISE = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", maximumFractionDigits: 6,
});

export default async function RatingsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { ok, erreur, brick: brickFilter } = await searchParams;
  const supabase = createAdminClient();

  const [ratingsRes, bricksRes] = await Promise.all([
    brickFilter !== undefined && brickFilter !== ""
      ? supabase.from("brick_quality_ratings").select("*").eq("brick_id", brickFilter).order("use_case")
      : supabase.from("brick_quality_ratings").select("*").order("brick_id").order("use_case"),
    supabase.from("components").select("id, name, vendor_id").order("name"),
  ]);
  if (ratingsRes.error !== null) throw ratingsRes.error;
  if (bricksRes.error !== null) throw bricksRes.error;

  const bricksById = new Map(bricksRes.data.map((b) => [b.id, b.name]));

  // Groupement par brique
  const byBrick = new Map<string, typeof ratingsRes.data>();
  for (const r of ratingsRes.data) {
    const arr = byBrick.get(r.brick_id) ?? [];
    arr.push(r);
    byBrick.set(r.brick_id, arr);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Notation qualité</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Ratings ({ratingsRes.data.length})
          </h1>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Score 1-5 + coût par opération, par brique × cas d&apos;usage. Le carburant des recommandations.
          </p>
        </div>
        <Link href="/admin/ratings/new"><Button>+ Nouvelle note</Button></Link>
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

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-body-sm">
            <span className="text-on-surface-variant">Filtrer par brique</span>
            <select
              name="brick"
              defaultValue={brickFilter ?? ""}
              className="rounded-input border border-on-surface/20 bg-surface px-3 py-1.5 text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Toutes</option>
              {bricksRes.data.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm">Filtrer</Button>
          {brickFilter !== undefined && brickFilter !== "" ? (
            <Link href="/admin/ratings"><Button type="button" variant="ghost" size="sm">Réinitialiser</Button></Link>
          ) : null}
        </form>
      </Card>

      <div className="space-y-4">
        {Array.from(byBrick.entries()).map(([brickId, ratings]) => (
          <section key={brickId} className="space-y-2">
            <h2 className="font-display text-headline-sm text-on-surface">
              {bricksById.get(brickId) ?? "(brique inconnue)"}
              <span className="ml-2 font-mono text-body-sm text-on-surface-variant">({ratings.length})</span>
            </h2>
            <ul className="grid gap-2">
              {ratings.map((r) => (
                <li key={r.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/ratings/${r.id}/edit`}
                            className="font-display text-body-md text-on-surface hover:text-primary"
                          >
                            {r.use_case}
                          </Link>
                          <span className="font-mono text-primary">{formatScore(r.score)}</span>
                          <Chip tone="neutral">{RATING_SOURCE_LABELS[r.source]}</Chip>
                          {r.cost_per_op_eur !== null && r.cost_unit !== null ? (
                            <Chip tone="secondary">
                              {EUR_PRECISE.format(r.cost_per_op_eur)}/{r.cost_unit}
                            </Chip>
                          ) : null}
                        </div>
                        {r.notes !== null ? (
                          <p className="text-body-sm text-on-surface-variant">{r.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/admin/ratings/${r.id}/edit`}>
                          <Button variant="ghost" size="sm">Éditer</Button>
                        </Link>
                        <form action={deleteRating}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" variant="ghost" size="sm">Supprimer</Button>
                        </form>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
