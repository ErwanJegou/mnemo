import type { ReactElement } from "react";
import Link from "next/link";
import { SolutionStepForm } from "@/components/admin/SolutionStepForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStep } from "../../../actions";

type Params = { id: string };
type Search = { errors?: string; position?: string };

export default async function NewStepPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { id } = await params;
  const { errors: rawErrors, position: positionRaw } = await searchParams;
  const errors = parseSearchErrors(rawErrors);
  const defaultPosition = positionRaw !== undefined ? Number.parseInt(positionRaw, 10) : 1;

  const supabase = createAdminClient();
  const [catsRes, bricksRes, vendorsRes, portsRes] = await Promise.all([
    supabase.from("brick_categories").select("*").order("rank").order("position"),
    supabase.from("components").select("*").order("name"),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("port_types").select("*").order("family").order("name"),
  ]);
  if (catsRes.error !== null) throw catsRes.error;
  if (bricksRes.error !== null) throw bricksRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (portsRes.error !== null) throw portsRes.error;

  const createAction = createStep.bind(null, id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Nouvelle étape</span>
          <h1 className="font-display text-headline-lg text-on-surface">Ajouter une étape</h1>
        </div>
        <Link href={`/admin/solutions/${id}/edit`}><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <SolutionStepForm
        action={createAction}
        categories={catsRes.data}
        bricks={bricksRes.data}
        vendors={vendorsRes.data}
        portTypes={portsRes.data}
        defaultPosition={defaultPosition}
        submitLabel="Créer l'étape"
        errors={errors}
      />
    </div>
  );
}
