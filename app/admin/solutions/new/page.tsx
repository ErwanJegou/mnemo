import type { ReactElement } from "react";
import Link from "next/link";
import { SolutionForm } from "@/components/admin/SolutionForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createSolution } from "../actions";

type Search = { errors?: string };

export default async function NewSolutionPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { errors: rawErrors } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Nouvelle solution</span>
          <h1 className="font-display text-headline-lg text-on-surface">Créer une solution</h1>
          <p className="text-body-sm text-on-surface-variant">
            Après création, vous pourrez ajouter les étapes du workflow.
          </p>
        </div>
        <Link href="/admin/solutions"><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <SolutionForm action={createSolution} submitLabel="Créer" errors={errors} />
    </div>
  );
}
