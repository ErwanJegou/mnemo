import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SolutionStepForm } from "@/components/admin/SolutionStepForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateStep } from "../../../../actions";

type Params = { id: string; stepId: string };
type Search = { errors?: string };

export default async function EditStepPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { id, stepId } = await params;
  const { errors: rawErrors } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  const supabase = createAdminClient();
  const [stepRes, catsRes, bricksRes, vendorsRes, portsRes] = await Promise.all([
    supabase.from("solution_steps").select("*").eq("id", stepId).maybeSingle(),
    supabase.from("brick_categories").select("*").order("rank").order("position"),
    supabase.from("components").select("*").order("name"),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("port_types").select("*").order("family").order("name"),
  ]);
  if (stepRes.error !== null) throw stepRes.error;
  if (catsRes.error !== null) throw catsRes.error;
  if (bricksRes.error !== null) throw bricksRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (portsRes.error !== null) throw portsRes.error;
  if (stepRes.data === null || stepRes.data.solution_id !== id) notFound();

  const updateAction = updateStep.bind(null, id, stepId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Édition étape</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Étape {stepRes.data.position} : {stepRes.data.title}
          </h1>
        </div>
        <Link href={`/admin/solutions/${id}/edit`}><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <SolutionStepForm
        action={updateAction}
        categories={catsRes.data}
        bricks={bricksRes.data}
        vendors={vendorsRes.data}
        portTypes={portsRes.data}
        initial={stepRes.data}
        submitLabel="Enregistrer"
        errors={errors}
      />
    </div>
  );
}
