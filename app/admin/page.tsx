import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  BRICK_RANK_DESCRIPTIONS,
  BRICK_RANK_LABELS,
  COMPLEXITY_LABELS,
  COMPLEXITY_TONE,
  RANK_ORDER,
  STATUS_LABELS,
} from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BrickRank } from "@/lib/supabase/types";

/**
 * Dashboard admin — vue d'ensemble du système.
 * KPI compteurs + briques par rang + solutions actives + alertes.
 * La liste détaillée des briques est sur /admin/components.
 */
export default async function AdminDashboardPage(): Promise<ReactElement> {
  const supabase = createAdminClient();

  const [
    solutionsRes,
    stepsRes,
    componentsRes,
    categoriesRes,
    vendorsRes,
    infraRes,
    hardwareRes,
    portsRes,
    ratingsRes,
  ] = await Promise.all([
    supabase.from("solutions").select("*").order("position"),
    supabase.from("solution_steps").select("solution_id"),
    supabase.from("components").select("id, status, category_id, vendor_id"),
    supabase.from("brick_categories").select("*").order("rank").order("position"),
    supabase.from("vendors").select("id"),
    supabase.from("infra_targets").select("id, infra_kind"),
    supabase.from("hardware_recipes").select("id"),
    supabase.from("port_types").select("id"),
    supabase.from("brick_quality_ratings").select("brick_id"),
  ]);

  if (solutionsRes.error !== null) throw solutionsRes.error;
  if (stepsRes.error !== null) throw stepsRes.error;
  if (componentsRes.error !== null) throw componentsRes.error;
  if (categoriesRes.error !== null) throw categoriesRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (infraRes.error !== null) throw infraRes.error;
  if (hardwareRes.error !== null) throw hardwareRes.error;
  if (portsRes.error !== null) throw portsRes.error;
  if (ratingsRes.error !== null) throw ratingsRes.error;

  // KPIs
  const solutions = solutionsRes.data;
  const components = componentsRes.data;
  const categories = categoriesRes.data;

  const solutionsValidated = solutions.filter((s) => s.status === "validated").length;
  const componentsValidated = components.filter((c) => c.status === "validated").length;
  const componentsDraft = components.filter((c) => c.status === "draft").length;
  const componentsWithoutCategory = components.filter((c) => c.category_id === null).length;

  // Briques par catégorie
  const componentsByCategory = new Map<string, number>();
  for (const c of components) {
    if (c.category_id !== null)
      componentsByCategory.set(c.category_id, (componentsByCategory.get(c.category_id) ?? 0) + 1);
  }

  // Briques par rang
  const componentsByRank = new Map<BrickRank, number>();
  const categoriesByRank = new Map<BrickRank, number>();
  for (const cat of categories) {
    categoriesByRank.set(cat.rank, (categoriesByRank.get(cat.rank) ?? 0) + 1);
    const inCat = componentsByCategory.get(cat.id) ?? 0;
    componentsByRank.set(cat.rank, (componentsByRank.get(cat.rank) ?? 0) + inCat);
  }

  // Étapes par solution
  const stepsBySolution = new Map<string, number>();
  for (const s of stepsRes.data)
    stepsBySolution.set(s.solution_id, (stepsBySolution.get(s.solution_id) ?? 0) + 1);

  // Briques notées vs non notées
  const ratedBricks = new Set(ratingsRes.data.map((r) => r.brick_id));
  const ratedCount = ratedBricks.size;
  const unratedCount = components.length - ratedCount;

  // Vendors / Infra
  const vendorsCount = vendorsRes.data.length;
  const infraCount = infraRes.data.length;
  const hardwareCount = hardwareRes.data.length;
  const portsCount = portsRes.data.length;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Tableau de bord
        </span>
        <h1 className="font-display text-headline-lg text-on-surface">Vue d&apos;ensemble</h1>
        <p className="max-w-3xl text-body-sm text-on-surface-variant">
          État de la base mémorielle Mnémo. Solutions exposées au public, briques disponibles,
          taxonomie, ratings qualité.
        </p>
      </header>

      {/* KPIs principaux */}
      <section>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Solutions publiées", value: solutionsValidated, total: solutions.length, href: "/admin/solutions", color: "primary" },
            { label: "Briques validées", value: componentsValidated, total: components.length, href: "/admin/components", color: "primary" },
            { label: "Catégories", value: categories.length, total: null, href: "/admin/categories", color: "secondary" },
            { label: "Vendors", value: vendorsCount, total: null, href: "/admin/vendors", color: "secondary" },
            { label: "Cibles infra", value: infraCount, total: null, href: "/admin/infra", color: "tertiary" },
            { label: "Packs hardware", value: hardwareCount, total: null, href: "/admin/hardware", color: "tertiary" },
            { label: "Types de ports", value: portsCount, total: null, href: "/admin/ports", color: "neutral" },
            { label: "Notes qualité", value: ratingsRes.data.length, total: null, href: "/admin/ratings", color: "neutral" },
          ].map((k) => (
            <li key={k.label}>
              <Link href={k.href} className="block transition-transform hover:-translate-y-0.5">
                <Card>
                  <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                    {k.label}
                  </p>
                  <p className="mt-2 font-display text-5xl font-bold text-on-surface">
                    {k.value}
                    {k.total !== null && k.total !== k.value ? (
                      <span className="text-headline-sm text-on-surface-variant"> / {k.total}</span>
                    ) : null}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Alertes — données à compléter */}
      {(componentsDraft > 0 || componentsWithoutCategory > 0 || unratedCount > 0) ? (
        <section>
          <h2 className="mb-3 font-display text-headline-sm text-on-surface">À compléter</h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {componentsDraft > 0 ? (
              <li>
                <Link href="/admin/components?status=draft" className="block">
                  <Card>
                    <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                      Briques en brouillon
                    </p>
                    <p className="mt-1 font-display text-headline-md text-tertiary">
                      {componentsDraft}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">À valider ou compléter.</p>
                  </Card>
                </Link>
              </li>
            ) : null}
            {componentsWithoutCategory > 0 ? (
              <li>
                <Link href="/admin/components" className="block">
                  <Card>
                    <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                      Briques sans catégorie
                    </p>
                    <p className="mt-1 font-display text-headline-md text-error">
                      {componentsWithoutCategory}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      À rattacher à une catégorie générique.
                    </p>
                  </Card>
                </Link>
              </li>
            ) : null}
            {unratedCount > 0 ? (
              <li>
                <Link href="/admin/ratings/new" className="block">
                  <Card>
                    <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                      Briques sans note
                    </p>
                    <p className="mt-1 font-display text-headline-md text-on-surface">
                      {unratedCount}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      Aucun rating qualité/prix.
                    </p>
                  </Card>
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* Briques par rang */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-headline-sm text-on-surface">Briques par rang</h2>
          <Link href="/admin/components">
            <Button variant="ghost" size="sm">Voir toutes les briques →</Button>
          </Link>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {RANK_ORDER.map((rank) => {
            const briqueCount = componentsByRank.get(rank) ?? 0;
            const catCount = categoriesByRank.get(rank) ?? 0;
            return (
              <li key={rank}>
                <Link
                  href={`/admin/components?rank=${rank}`}
                  className="block h-full transition-transform hover:-translate-y-0.5"
                >
                  <Card>
                    <p className="font-display text-body-lg text-on-surface">
                      {BRICK_RANK_LABELS[rank]}
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {BRICK_RANK_DESCRIPTIONS[rank]}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Chip tone="primary">{briqueCount} brique{briqueCount > 1 ? "s" : ""}</Chip>
                      <Chip tone="neutral">{catCount} catégorie{catCount > 1 ? "s" : ""}</Chip>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Solutions */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-headline-sm text-on-surface">
            Solutions ({solutions.length})
          </h2>
          <Link href="/admin/solutions/new">
            <Button size="sm">+ Nouvelle solution</Button>
          </Link>
        </div>
        {solutions.length === 0 ? (
          <Card>
            <p className="text-body-sm text-on-surface-variant">
              Aucune solution. Créez la première recette orientée problème.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {solutions.map((s) => {
              const steps = stepsBySolution.get(s.id) ?? 0;
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/solutions/${s.id}/edit`}
                    className="block transition-transform hover:-translate-y-0.5"
                  >
                    <Card>
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 text-3xl" aria-hidden="true">
                          {s.hero_emoji ?? "🧩"}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-body-lg text-on-surface">
                              {s.title}
                            </span>
                            <Chip tone={COMPLEXITY_TONE[s.complexity]}>
                              {COMPLEXITY_LABELS[s.complexity]}
                            </Chip>
                            <Chip tone={s.status === "validated" ? "primary" : "neutral"}>
                              {STATUS_LABELS[s.status]}
                            </Chip>
                            <Chip tone="neutral">{steps} étape{steps > 1 ? "s" : ""}</Chip>
                          </div>
                          <p className="text-body-sm text-on-surface-variant">
                            {s.problem_statement}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Catégories par rang (vue dense) */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-headline-sm text-on-surface">
            Catégories ({categories.length})
          </h2>
          <Link href="/admin/categories">
            <Button variant="ghost" size="sm">Gérer →</Button>
          </Link>
        </div>
        <Card>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {RANK_ORDER.map((rank) => {
              const cats = categories.filter((c) => c.rank === rank);
              if (cats.length === 0) return null;
              return (
                <div key={rank} className="space-y-1">
                  <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                    {BRICK_RANK_LABELS[rank]}
                  </p>
                  <ul className="space-y-0.5">
                    {cats.map((c) => {
                      const count = componentsByCategory.get(c.id) ?? 0;
                      return (
                        <li key={c.id} className="text-body-sm text-on-surface">
                          <Link
                            href={`/admin/components?category=${c.id}`}
                            className="hover:text-primary"
                          >
                            {c.name}
                          </Link>
                          <span className="ml-1 font-mono text-xs text-on-surface-variant">
                            ({count})
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Raccourcis vers les autres sections */}
      <section>
        <h2 className="mb-3 font-display text-headline-sm text-on-surface">Autres entités</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/admin/vendors" className="block">
            <Card>
              <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">Vendors</p>
              <p className="mt-1 font-display text-headline-sm text-on-surface">{vendorsCount}</p>
              <p className="text-body-sm text-on-surface-variant">
                Éditeurs logiciels rattachés aux briques (utilisés pour la demande de prix).
              </p>
            </Card>
          </Link>
          <Link href="/admin/infra" className="block">
            <Card>
              <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">Infra</p>
              <p className="mt-1 font-display text-headline-sm text-on-surface">{infraCount}</p>
              <p className="text-body-sm text-on-surface-variant">
                VPS, bare metal, GPU loué, on-prem, SaaS — où peuvent tourner les briques.
              </p>
            </Card>
          </Link>
          <Link href="/admin/hardware" className="block">
            <Card>
              <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">Hardware</p>
              <p className="mt-1 font-display text-headline-sm text-on-surface">{hardwareCount}</p>
              <p className="text-body-sm text-on-surface-variant">
                Packs machine on-prem (BOM, prix, où acheter, qui installe).
              </p>
            </Card>
          </Link>
          <Link href="/admin/ports" className="block">
            <Card>
              <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">Ports</p>
              <p className="mt-1 font-display text-headline-sm text-on-surface">{portsCount}</p>
              <p className="text-body-sm text-on-surface-variant">
                Types de données circulant entre briques (fondation du futur drag&drop).
              </p>
            </Card>
          </Link>
          <Link href="/admin/ratings" className="block">
            <Card>
              <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">Ratings</p>
              <p className="mt-1 font-display text-headline-sm text-on-surface">{ratingsRes.data.length}</p>
              <p className="text-body-sm text-on-surface-variant">
                Notes qualité/prix par brique × cas d&apos;usage ({ratedCount}/{components.length} briques notées).
              </p>
            </Card>
          </Link>
          <Link href="/" className="block">
            <Card>
              <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">Vue publique</p>
              <p className="mt-1 font-display text-headline-sm text-primary">Voir le site ↗</p>
              <p className="text-body-sm text-on-surface-variant">
                Page d&apos;accueil orientée problème, telle que la voient les visiteurs.
              </p>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
