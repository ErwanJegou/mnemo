import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfraForm } from "@/components/admin/InfraForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateInfra } from "../../actions";

type Params = { id: string };
type Search = { errors?: string };

export default async function EditInfraPage({
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
  const [infraRes, vendorsRes] = await Promise.all([
    supabase.from("infra_targets").select("*").eq("id", id).maybeSingle(),
    supabase.from("vendors").select("*").order("name"),
  ]);
  if (infraRes.error !== null) throw infraRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (infraRes.data === null) notFound();

  const updateAction = updateInfra.bind(null, id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Édition infra
          </span>
          <h1 className="font-display text-headline-lg text-on-surface">{infraRes.data.name}</h1>
        </div>
        <Link href="/admin/infra">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
      </header>
      <InfraForm
        action={updateAction}
        vendors={vendorsRes.data}
        initial={infraRes.data}
        submitLabel="Enregistrer"
        errors={errors}
      />
    </div>
  );
}
