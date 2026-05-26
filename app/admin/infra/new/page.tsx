import type { ReactElement } from "react";
import Link from "next/link";
import { InfraForm } from "@/components/admin/InfraForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInfra } from "../actions";

type Search = { errors?: string };

export default async function NewInfraPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { errors: rawErrors } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  const supabase = createAdminClient();
  const { data: vendors, error } = await supabase.from("vendors").select("*").order("name");
  if (error !== null) throw error;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Nouvelle infra
          </span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Créer une cible d&apos;infra
          </h1>
        </div>
        <Link href="/admin/infra">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
      </header>
      <InfraForm action={createInfra} vendors={vendors} submitLabel="Créer" errors={errors} />
    </div>
  );
}
