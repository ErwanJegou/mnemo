import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HardwareForm } from "@/components/admin/HardwareForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateHardware } from "../../actions";

type Params = { id: string };
type Search = { errors?: string };

export default async function EditHardwarePage({
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
  const { data, error } = await supabase
    .from("hardware_recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error !== null) throw error;
  if (data === null) notFound();

  const updateAction = updateHardware.bind(null, id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Édition pack</span>
          <h1 className="font-display text-headline-lg text-on-surface">{data.name}</h1>
        </div>
        <Link href="/admin/hardware"><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <HardwareForm action={updateAction} initial={data} submitLabel="Enregistrer" errors={errors} />
    </div>
  );
}
