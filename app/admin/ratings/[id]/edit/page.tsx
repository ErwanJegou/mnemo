import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RatingForm } from "@/components/admin/RatingForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateRating } from "../../actions";

type Params = { id: string };
type Search = { errors?: string };

export default async function EditRatingPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { id } = await params;
  const { errors: rawErrors } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  const supabase = createAdminClient();
  const [ratingRes, bricksRes, vendorsRes] = await Promise.all([
    supabase.from("brick_quality_ratings").select("*").eq("id", id).maybeSingle(),
    supabase.from("components").select("*").order("name"),
    supabase.from("vendors").select("*").order("name"),
  ]);
  if (ratingRes.error !== null) throw ratingRes.error;
  if (bricksRes.error !== null) throw bricksRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (ratingRes.data === null) notFound();

  const updateAction = updateRating.bind(null, id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Édition note</span>
          <h1 className="font-display text-headline-lg text-on-surface">{ratingRes.data.use_case}</h1>
        </div>
        <Link href="/admin/ratings"><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <RatingForm
        action={updateAction}
        bricks={bricksRes.data}
        vendors={vendorsRes.data}
        initial={ratingRes.data}
        submitLabel="Enregistrer"
        errors={errors}
      />
    </div>
  );
}
