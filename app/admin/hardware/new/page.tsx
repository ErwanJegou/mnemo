import type { ReactElement } from "react";
import Link from "next/link";
import { HardwareForm } from "@/components/admin/HardwareForm";
import { Button } from "@/components/ui/Button";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createHardware } from "../actions";

type Search = { errors?: string };

export default async function NewHardwarePage({
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
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Nouveau pack</span>
          <h1 className="font-display text-headline-lg text-on-surface">Créer un pack hardware</h1>
        </div>
        <Link href="/admin/hardware"><Button variant="ghost" size="sm">← Retour</Button></Link>
      </header>
      <HardwareForm action={createHardware} submitLabel="Créer" errors={errors} />
    </div>
  );
}
