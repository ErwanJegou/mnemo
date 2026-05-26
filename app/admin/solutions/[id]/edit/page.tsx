import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SolutionForm } from "@/components/admin/SolutionForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteStep, updateSolution } from "../../actions";

type Params = { id: string };
type Search = { errors?: string; ok?: string };

const FEEDBACKS: Record<string, string> = {
  updated: "Solution mise à jour.",
  created: "Solution créée.",
  "step-created": "Étape créée.",
  "step-updated": "Étape mise à jour.",
  "step-deleted": "Étape supprimée.",
};

export default async function EditSolutionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { id } = await params;
  const { errors: rawErrors, ok } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  const supabase = createAdminClient();
  const [solRes, stepsRes, bricksRes, catsRes] = await Promise.all([
    supabase.from("solutions").select("*").eq("id", id).maybeSingle(),
    supabase.from("solution_steps").select("*").eq("solution_id", id).order("position"),
    supabase.from("components").select("id, name"),
    supabase.from("brick_categories").select("id, name"),
  ]);
  if (solRes.error !== null) throw solRes.error;
  if (stepsRes.error !== null) throw stepsRes.error;
  if (bricksRes.error !== null) throw bricksRes.error;
  if (catsRes.error !== null) throw catsRes.error;
  if (solRes.data === null) notFound();

  const bricksById = new Map(bricksRes.data.map((b) => [b.id, b.name]));
  const catsById = new Map(catsRes.data.map((c) => [c.id, c.name]));
  const updateAction = updateSolution.bind(null, id);
  const deleteStepAction = deleteStep.bind(null, id);

  const nextPosition = stepsRes.data.length > 0
    ? Math.max(...stepsRes.data.map((s) => s.position)) + 1
    : 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Édition solution</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            {solRes.data.hero_emoji ?? "🧩"} {solRes.data.title}
          </h1>
        </div>
        <div className="flex gap-2">
          {solRes.data.status === "validated" ? (
            <Link href={`/solutions/${solRes.data.slug}`} target="_blank">
              <Button variant="ghost" size="sm">Voir public ↗</Button>
            </Link>
          ) : null}
          <Link href="/admin/solutions"><Button variant="ghost" size="sm">← Retour</Button></Link>
        </div>
      </header>

      {ok !== undefined && FEEDBACKS[ok] !== undefined ? (
        <p className="rounded-input border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary">
          {FEEDBACKS[ok]}
        </p>
      ) : null}

      <SolutionForm action={updateAction} initial={solRes.data} submitLabel="Enregistrer" errors={errors} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-headline-md text-on-surface">
            Étapes du workflow ({stepsRes.data.length})
          </h2>
          <Link href={`/admin/solutions/${id}/steps/new?position=${nextPosition}`}>
            <Button>+ Nouvelle étape</Button>
          </Link>
        </div>

        {stepsRes.data.length === 0 ? (
          <Card>
            <p className="text-body-sm text-on-surface-variant">
              Aucune étape. Ajoutez la première pour démarrer le workflow.
            </p>
          </Card>
        ) : (
          <ol className="space-y-2">
            {stepsRes.data.map((step) => (
              <li key={step.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-body-md font-bold text-on-primary">
                        {step.position}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/solutions/${id}/steps/${step.id}/edit`}
                            className="font-display text-body-md text-on-surface hover:text-primary"
                          >
                            {step.title}
                          </Link>
                          {step.required_category_id !== null ? (
                            <Chip tone="secondary">
                              {catsById.get(step.required_category_id) ?? "?"}
                            </Chip>
                          ) : null}
                          {step.recommended_brick_id !== null ? (
                            <Chip tone="primary">
                              {bricksById.get(step.recommended_brick_id) ?? "?"}
                            </Chip>
                          ) : null}
                          {step.alternative_brick_ids.length > 0 ? (
                            <Chip tone="neutral">
                              +{step.alternative_brick_ids.length} alt
                            </Chip>
                          ) : null}
                        </div>
                        {step.description !== null ? (
                          <p className="text-body-sm text-on-surface-variant">{step.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/solutions/${id}/steps/${step.id}/edit`}>
                        <Button variant="ghost" size="sm">Éditer</Button>
                      </Link>
                      <form action={deleteStepAction}>
                        <input type="hidden" name="id" value={step.id} />
                        <Button type="submit" variant="ghost" size="sm">Supprimer</Button>
                      </form>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
