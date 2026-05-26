import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StatusDot } from "@/components/ui/StatusDot";
import {
  COMPLEXITY_LABELS,
  COMPLEXITY_TONE,
  PORT_DIRECTION_LABELS,
  PRICING_MODEL_LABELS,
  RATING_SOURCE_LABELS,
  formatPrice,
  formatScore,
} from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { SolutionEstimator } from "@/components/solutions/SolutionEstimator";

const EUR_PRECISE = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 4,
});

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ReactElement> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: solution, error: solErr } = await supabase
    .from("solutions")
    .select("*")
    .eq("slug", slug)
    .eq("status", "validated")
    .maybeSingle();
  if (solErr !== null) throw solErr;
  if (solution === null) notFound();

  const { data: steps, error: stepsErr } = await supabase
    .from("solution_steps")
    .select("*")
    .eq("solution_id", solution.id)
    .order("position", { ascending: true });
  if (stepsErr !== null) throw stepsErr;

  // Collecte les IDs utilisés par les steps
  const brickIds = new Set<string>();
  const categoryIds = new Set<string>();
  const portIds = new Set<string>();
  for (const s of steps) {
    if (s.recommended_brick_id !== null) brickIds.add(s.recommended_brick_id);
    for (const id of s.alternative_brick_ids) brickIds.add(id);
    if (s.required_category_id !== null) categoryIds.add(s.required_category_id);
    if (s.input_port_id !== null) portIds.add(s.input_port_id);
    if (s.output_port_id !== null) portIds.add(s.output_port_id);
  }

  const brickIdsArr = Array.from(brickIds);

  const [bricksRes, categoriesRes, portsRes, ratingsRes] = await Promise.all([
    brickIdsArr.length > 0
      ? supabase.from("components").select("*").in("id", brickIdsArr)
      : Promise.resolve({ data: [], error: null as null }),
    categoryIds.size > 0
      ? supabase.from("brick_categories").select("*").in("id", Array.from(categoryIds))
      : Promise.resolve({ data: [], error: null as null }),
    portIds.size > 0
      ? supabase.from("port_types").select("*").in("id", Array.from(portIds))
      : Promise.resolve({ data: [], error: null as null }),
    brickIdsArr.length > 0
      ? supabase.from("brick_quality_ratings").select("*").in("brick_id", brickIdsArr)
      : Promise.resolve({ data: [], error: null as null }),
  ]);

  if (bricksRes.error !== null) throw bricksRes.error;
  if (categoriesRes.error !== null) throw categoriesRes.error;
  if (portsRes.error !== null) throw portsRes.error;
  if (ratingsRes.error !== null) throw ratingsRes.error;

  const vendorIds = Array.from(new Set(bricksRes.data.map((b) => b.vendor_id)));
  const { data: vendors, error: vendorsErr } =
    vendorIds.length > 0
      ? await supabase.from("vendors").select("*").in("id", vendorIds)
      : { data: [], error: null as null };
  if (vendorsErr !== null) throw vendorsErr;

  const bricksById = new Map(bricksRes.data.map((b) => [b.id, b]));
  const categoriesById = new Map(categoriesRes.data.map((c) => [c.id, c]));
  const portsById = new Map(portsRes.data.map((p) => [p.id, p]));
  const vendorsById = new Map(vendors.map((v) => [v.id, v]));
  const ratingsByBrick = new Map<string, typeof ratingsRes.data>();
  for (const r of ratingsRes.data) {
    const arr = ratingsByBrick.get(r.brick_id) ?? [];
    arr.push(r);
    ratingsByBrick.set(r.brick_id, arr);
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-on-surface/10">
        <div className="mx-auto max-w-5xl px-container-margin py-4">
          <Link href="/" className="text-body-sm text-primary hover:underline">
            ← Toutes les solutions
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-container-margin py-12">
        <div className="flex flex-wrap items-start gap-6">
          <div className="shrink-0 text-7xl" aria-hidden="true">
            {solution.hero_emoji ?? "🧩"}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                Solution Mnémo
              </span>
              <Chip tone={COMPLEXITY_TONE[solution.complexity]}>
                {COMPLEXITY_LABELS[solution.complexity]}
              </Chip>
            </div>
            <h1 className="font-display text-headline-lg text-on-surface md:text-5xl">
              {solution.title}
            </h1>
            <p className="max-w-3xl text-body-lg text-on-surface-variant">
              {solution.problem_statement}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-body-sm text-on-surface-variant">
              {solution.audience !== null ? <span>👥 {solution.audience}</span> : null}
              {solution.estimated_setup_minutes !== null ? (
                <span>⏱ ~{solution.estimated_setup_minutes} min de setup</span>
              ) : null}
              <span>{steps.length} étapes</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-container-margin pb-4">
        <SolutionEstimator
          steps={steps}
          bricks={bricksRes.data}
          ratings={ratingsRes.data}
          defaultVolumes={solution.volume_assumptions ?? {}}
        />
      </section>

      <section className="mx-auto max-w-5xl px-container-margin pb-16">
        <h2 className="mb-6 font-display text-headline-md text-on-surface">Le workflow</h2>
        <ol className="space-y-6">
          {steps.map((step) => {
            const reco = step.recommended_brick_id !== null
              ? bricksById.get(step.recommended_brick_id) ?? null
              : null;
            const recoVendor = reco !== null ? vendorsById.get(reco.vendor_id) : null;
            const recoRatings = reco !== null ? ratingsByBrick.get(reco.id) ?? [] : [];
            const cat = step.required_category_id !== null
              ? categoriesById.get(step.required_category_id) ?? null
              : null;
            const inputPort = step.input_port_id !== null
              ? portsById.get(step.input_port_id) ?? null
              : null;
            const outputPort = step.output_port_id !== null
              ? portsById.get(step.output_port_id) ?? null
              : null;
            const alternatives = step.alternative_brick_ids
              .map((id) => bricksById.get(id))
              .filter((b): b is NonNullable<typeof b> => b !== undefined);

            return (
              <li key={step.id}>
                <Card>
                  <div className="space-y-4">
                    {/* En-tête étape */}
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-body-md font-bold text-on-primary">
                        {step.position}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-display text-headline-sm text-on-surface">
                          {step.title}
                        </h3>
                        {step.description !== null ? (
                          <p className="text-body-sm text-on-surface-variant">{step.description}</p>
                        ) : null}
                        {cat !== null ? (
                          <p className="font-mono text-xs text-on-surface-variant">
                            Catégorie : <strong>{cat.name}</strong>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Flux ports */}
                    {(inputPort !== null || outputPort !== null) ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-input border border-outline-variant bg-surface-container-lowest p-3 font-mono text-xs">
                        <Chip tone="neutral">
                          {PORT_DIRECTION_LABELS.in} : {inputPort?.slug ?? "—"}
                        </Chip>
                        <span aria-hidden="true">→</span>
                        <Chip tone="neutral">
                          {PORT_DIRECTION_LABELS.out} : {outputPort?.slug ?? "—"}
                        </Chip>
                      </div>
                    ) : null}

                    {/* Brique recommandée */}
                    {reco !== null ? (
                      <div className="rounded-input border border-primary/30 bg-primary/5 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Chip tone="primary">Recommandé</Chip>
                          <span className="font-display text-body-lg text-on-surface">
                            {reco.name}
                          </span>
                          {reco.tier !== null && reco.tier !== "" ? (
                            <Chip tone="neutral">{reco.tier}</Chip>
                          ) : null}
                        </div>
                        <p className="text-body-sm text-on-surface-variant">
                          {recoVendor?.name ?? "?"} · {PRICING_MODEL_LABELS[reco.pricing_model]} ·{" "}
                          <span className="font-mono">
                            {formatPrice(reco.base_price_eur, reco.unit, reco.pricing_model)}
                          </span>
                        </p>
                        {reco.description !== null ? (
                          <p className="mt-2 text-body-sm text-on-surface-variant">
                            {reco.description}
                          </p>
                        ) : null}
                        {recoRatings.length > 0 ? (
                          <div className="mt-3 space-y-1.5">
                            <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                              Notes Mnémo
                            </p>
                            <ul className="space-y-1">
                              {recoRatings.map((r) => (
                                <li key={r.id} className="text-body-sm text-on-surface-variant">
                                  <span className="font-mono text-primary">{formatScore(r.score)}</span>
                                  {" "}<strong>{r.use_case}</strong>
                                  {r.cost_per_op_eur !== null && r.cost_unit !== null ? (
                                    <span className="ml-1 font-mono text-xs">
                                      ({EUR_PRECISE.format(r.cost_per_op_eur)}/{r.cost_unit})
                                    </span>
                                  ) : null}
                                  {r.notes !== null ? <span> — {r.notes}</span> : null}
                                  <span className="ml-2 font-mono text-xs text-on-surface-variant">
                                    [{RATING_SOURCE_LABELS[r.source]}]
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                          <StatusDot confidence={reco.confidence} />
                          {reco.source_url !== null && reco.source_url !== "" ? (
                            <a
                              href={reco.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-body-sm text-primary underline decoration-dotted hover:no-underline"
                            >
                              Source ↗
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-input border border-dashed border-outline-variant p-3 text-body-sm text-on-surface-variant">
                        Pas encore de brique recommandée pour cette étape — à compléter.
                      </p>
                    )}

                    {/* Alternatives */}
                    {alternatives.length > 0 ? (
                      <div>
                        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                          Alternatives
                        </p>
                        <ul className="grid gap-2 md:grid-cols-2">
                          {alternatives.map((alt) => {
                            const altVendor = vendorsById.get(alt.vendor_id);
                            const altRatings = ratingsByBrick.get(alt.id) ?? [];
                            return (
                              <li
                                key={alt.id}
                                className="rounded-input border border-outline-variant bg-surface p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-display text-body-md text-on-surface">
                                    {alt.name}
                                  </span>
                                  {alt.tier !== null && alt.tier !== "" ? (
                                    <Chip tone="neutral">{alt.tier}</Chip>
                                  ) : null}
                                </div>
                                <p className="mt-1 font-mono text-xs text-on-surface-variant">
                                  {altVendor?.name ?? "?"} ·{" "}
                                  {formatPrice(alt.base_price_eur, alt.unit, alt.pricing_model)}
                                </p>
                                {altRatings.length > 0 ? (
                                  <p className="mt-1 text-body-sm text-on-surface-variant">
                                    {altRatings.slice(0, 1).map((r) => (
                                      <span key={r.id}>
                                        <span className="font-mono text-primary">
                                          {formatScore(r.score)}
                                        </span>{" "}
                                        {r.use_case}
                                      </span>
                                    ))}
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    {/* Notes de décision */}
                    {step.decision_notes !== null && step.decision_notes !== "" ? (
                      <div className="rounded-input border border-tertiary/30 bg-tertiary/5 p-3 text-body-sm text-on-surface">
                        💡 {step.decision_notes}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-container-margin pb-16">
        <Card>
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <div className="space-y-2">
              <h3 className="font-display text-headline-sm text-on-surface">
                Cette solution vous parle ?
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                Le configurateur sur mesure vous aide à ajuster cette recette selon votre volume,
                votre réglementation, votre budget.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/configurateur"
                className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container"
              >
                Adapter à mon cas
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-outline-variant px-7 py-3 text-body-md text-on-surface transition-colors hover:bg-surface-container"
              >
                Voir d&apos;autres solutions
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
