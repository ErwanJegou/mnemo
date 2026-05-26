import type { ReactElement } from "react";
import Link from "next/link";
import { RatingForm } from "@/components/admin/RatingForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRating } from "../actions";

type Search = { errors?: string; brick?: string };

export default async function NewRatingPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { errors: rawErrors, brick } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  const supabase = createAdminClient();
  const [bricksRes, vendorsRes] = await Promise.all([
    supabase.from("components").select("*").order("name"),
    supabase.from("vendors").select("*").order("name"),
  ]);
  if (bricksRes.error !== null) throw bricksRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Nouvelle note</span>
          <h1 className="font-display text-headline-lg text-on-surface">Évaluer une brique</h1>
        </div>
        <Link href="/admin/ratings"><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <RatingForm
        action={createRating}
        bricks={bricksRes.data}
        vendors={vendorsRes.data}
        defaultBrickId={brick}
        submitLabel="Créer"
        errors={errors}
      />
    </div>
  );
}
