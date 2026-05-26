import type { ReactElement } from "react";
import Link from "next/link";
import { ComponentForm } from "@/components/admin/ComponentForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createComponent } from "../actions";

type Search = { errors?: string; category?: string };

export default async function NewComponentPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { errors: rawErrors, category: defaultCategoryId } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  const supabase = createAdminClient();
  const [vendorsRes, categoriesRes, portsRes, infraRes] = await Promise.all([
    supabase.from("vendors").select("*").order("name", { ascending: true }),
    supabase.from("brick_categories").select("*").order("rank").order("position"),
    supabase.from("port_types").select("*").order("family").order("name"),
    supabase.from("infra_targets").select("*").order("infra_kind").order("name"),
  ]);

  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (categoriesRes.error !== null) throw categoriesRes.error;
  if (portsRes.error !== null) throw portsRes.error;
  if (infraRes.error !== null) throw infraRes.error;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Nouvelle brique
          </span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Créer une brique
          </h1>
        </div>
        <Link href="/admin">
          <Button variant="ghost" size="sm">← Retour catalogue</Button>
        </Link>
      </header>
      <ComponentForm
        action={createComponent}
        vendors={vendorsRes.data}
        categories={categoriesRes.data}
        portTypes={portsRes.data}
        infraTargets={infraRes.data}
        defaultCategoryId={defaultCategoryId}
        submitLabel="Créer"
        errors={errors}
      />
    </div>
  );
}
