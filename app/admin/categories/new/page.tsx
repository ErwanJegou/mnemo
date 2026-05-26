import type { ReactElement } from "react";
import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createCategory } from "../actions";

type Search = { errors?: string };

export default async function NewCategoryPage({
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
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Nouvelle catégorie</span>
          <h1 className="font-display text-headline-lg text-on-surface">Créer une catégorie</h1>
        </div>
        <Link href="/admin/categories"><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <CategoryForm action={createCategory} submitLabel="Créer" errors={errors} />
    </div>
  );
}
