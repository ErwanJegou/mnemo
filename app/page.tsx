import type { ReactElement } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  COMPLEXITY_LABELS,
  COMPLEXITY_TONE,
} from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateSolution } from "@/lib/pricing/estimateSolution";

// La page d'accueil est orientée PROBLÈME, pas produit : on demande à
// l'utilisateur ce qu'il veut faire, et on lui propose une solution clé en main
// (workflow validé + alternatives + prix estimé). Le wizard configurateur
// reste accessible en mode "sur mesure".

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function HomePage(): Promise<ReactElement> {
  const supabase = createAdminClient();

  const { data: solutions, error } = await supabase
    .from("solutions")
    .select("*")
    .eq("status", "validated")
    .order("position", { ascending: true });
  if (error !== null) throw error;

  // Pour chaque solution validée on charge ses étapes + briques recommandées
  // + ratings, et on calcule l'estimation par défaut à afficher sur la card.
  const solutionIds = solutions.map((s) => s.id);
  const { data: steps, error: stepsErr } =
    solutionIds.length > 0
      ? await supabase.from("solution_steps").select("*").in("solution_id", solutionIds)
      : { data: [], error: null as null };
  if (stepsErr !== null) throw stepsErr;

  const recommendedBrickIds = Array.from(
    new Set(
      steps
        .map((s) => s.recommended_brick_id)
        .filter((id): id is string => id !== null),
    ),
  );

  const [bricksRes, ratingsRes] = await Promise.all([
    recommendedBrickIds.length > 0
      ? supabase.from("components").select("*").in("id", recommendedBrickIds)
      : Promise.resolve({ data: [], error: null as null }),
    recommendedBrickIds.length > 0
      ? supabase
          .from("brick_quality_ratings")
          .select("*")
          .in("brick_id", recommendedBrickIds)
      : Promise.resolve({ data: [], error: null as null }),
  ]);
  if (bricksRes.error !== null) throw bricksRes.error;
  if (ratingsRes.error !== null) throw ratingsRes.error;

  const stepsBySolution = new Map<string, typeof steps>();
  for (const s of steps) {
    const arr = stepsBySolution.get(s.solution_id) ?? [];
    arr.push(s);
    stepsBySolution.set(s.solution_id, arr);
  }

  return (
    <main className="min-h-screen bg-surface">
      <section className="mx-auto max-w-6xl px-container-margin pt-16 pb-12 text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Infrastructure de base mémorielle souveraine
        </span>
        <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-on-surface md:text-6xl">
          Mnémo
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">
          La base mémorielle qui grandit avec votre organisation — sans migration, sans
          verrouillage, sans coûts cachés.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-container-margin pb-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-headline-lg text-on-surface">
            Quel est votre problème ?
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Choisissez le cas qui vous concerne. On vous montre la recette validée — briques
            recommandées, alternatives, prix estimé.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {solutions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/solutions/${s.slug}`}
                className="block transition-transform hover:-translate-y-0.5"
              >
                <Card>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 text-5xl" aria-hidden="true">
                      {s.hero_emoji ?? "🧩"}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-headline-sm text-on-surface">
                          {s.title}
                        </h3>
                        <Chip tone={COMPLEXITY_TONE[s.complexity]}>
                          {COMPLEXITY_LABELS[s.complexity]}
                        </Chip>
                      </div>
                      <p className="text-body-sm text-on-surface-variant">
                        {s.problem_statement}
                      </p>
                      {(() => {
                        const est = estimateSolution({
                          steps: stepsBySolution.get(s.id) ?? [],
                          bricks: bricksRes.data,
                          ratings: ratingsRes.data,
                          volumes: s.volume_assumptions,
                        });
                        return (
                          <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs text-on-surface-variant">
                            {s.audience !== null ? <span>👥 {s.audience}</span> : null}
                            <span>
                              ≈{" "}
                              {est.totalMonthlyEur === null
                                ? "sur devis"
                                : `${EUR.format(est.totalMonthlyEur)}/mois`}
                            </span>
                            {s.estimated_setup_minutes !== null ? (
                              <span>⏱ ~{s.estimated_setup_minutes} min de setup</span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-container-margin pb-16">
        <Card>
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div className="space-y-3">
              <h3 className="font-display text-headline-md text-on-surface">
                Mon cas n&apos;est pas listé
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                Lancez le configurateur sur mesure : 12 questions sur votre activité, votre volume,
                votre réglementation, et on calcule la stack adaptée.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/configurateur"
                className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container"
              >
                Configurateur sur mesure
              </Link>
              <Link
                href="/fiduciaire"
                className="inline-flex items-center justify-center rounded-full border border-outline-variant px-7 py-3 text-body-md text-on-surface transition-colors hover:bg-surface-container"
              >
                Charte fiduciaire
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
