import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorForm } from "@/components/admin/VendorForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateVendor } from "../../actions";

type Params = { id: string };
type Search = { errors?: string };

export default async function EditVendorPage({
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
  const { data: vendor, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error !== null) throw error;
  if (vendor === null) notFound();

  const updateAction = updateVendor.bind(null, id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Édition vendor
          </span>
          <h1 className="font-display text-headline-lg text-on-surface">
            {vendor.name}
          </h1>
        </div>
        <Link href="/admin/vendors">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
      </header>
      <VendorForm
        action={updateAction}
        initial={vendor}
        submitLabel="Enregistrer"
        errors={errors}
      />
    </div>
  );
}
