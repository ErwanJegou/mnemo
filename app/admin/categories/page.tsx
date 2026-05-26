import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { BRICK_RANK_LABELS, RANK_ORDER } from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCategory } from "./actions";

type Search = { ok?: string; erreur?: string };

const FEEDBACKS: Record<string, string> = {
  created: "Catégorie créée.",
  updated: "Catégorie mise à jour.",
  deleted: "Catégorie supprimée.",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { ok, erreur } = await searchParams;
  const supabase = createAdminClient();

  const [catsRes, usageRes] = await Promise.all([
    supabase.from("brick_categories").select("*").order("rank").order("position"),
    supabase.from("components").select("category_id"),
  ]);
  if (catsRes.error !== null) throw catsRes.error;
  if (usageRes.error !== null) throw usageRes.error;

  const counts = new Map<string, number>();
  for (const c of usageRes.data) {
    if (c.category_id !== null) counts.set(c.category_id, (counts.get(c.category_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Taxonomie</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Catégories de briques ({catsRes.data.length})
          </h1>
        </div>
        <Link href="/admin/categories/new"><Button>+ Nouvelle catégorie</Button></Link>
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

      <div className="space-y-6">
        {RANK_ORDER.map((rank) => {
          const cats = catsRes.data.filter((c) => c.rank === rank);
          if (cats.length === 0) return null;
          return (
            <section key={rank} className="space-y-2">
              <h2 className="font-display text-headline-sm text-on-surface">{BRICK_RANK_LABELS[rank]}</h2>
              <ul className="grid gap-2">
                {cats.map((c) => {
                  const usage = counts.get(c.id) ?? 0;
                  return (
                    <li key={c.id}>
                      <Card>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/admin/categories/${c.id}/edit`}
                                className="font-display text-body-lg text-on-surface hover:text-primary"
                              >
                                {c.name}
                              </Link>
                              <Chip tone="neutral">position {c.position}</Chip>
                              <Chip tone="secondary">{usage} brique{usage > 1 ? "s" : ""}</Chip>
                            </div>
                            <p className="font-mono text-xs text-on-surface-variant">
                              slug : <code>{c.slug}</code>
                            </p>
                            {c.description !== null ? (
                              <p className="text-body-sm text-on-surface-variant">{c.description}</p>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/admin/categories/${c.id}/edit`}>
                              <Button variant="ghost" size="sm">Éditer</Button>
                            </Link>
                            <form action={deleteCategory}>
                              <input type="hidden" name="id" value={c.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                disabled={usage > 0}
                                title={usage > 0 ? `${usage} brique(s) référence(nt) cette catégorie.` : "Supprimer."}
                              >
                                Supprimer
                              </Button>
                            </form>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
