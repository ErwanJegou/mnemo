import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { STATUS_LABELS } from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteHardware } from "./actions";

type Search = { ok?: string; erreur?: string };

const FEEDBACKS: Record<string, string> = {
  created: "Pack créé.",
  updated: "Pack mis à jour.",
  deleted: "Pack supprimé.",
};

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default async function HardwareListPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { ok, erreur } = await searchParams;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("hardware_recipes")
    .select("*")
    .order("total_price_eur", { ascending: true });
  if (error !== null) throw error;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Catalogue</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Packs hardware ({data.length})
          </h1>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Recettes machines pour ceux qui partent on-prem : BOM, prix, lien d&apos;achat, notes installeur.
          </p>
        </div>
        <Link href="/admin/hardware/new">
          <Button>+ Nouveau pack</Button>
        </Link>
      </header>

      {ok !== undefined && FEEDBACKS[ok] !== undefined ? (
        <p className="rounded-input border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary">
          {FEEDBACKS[ok]}
        </p>
      ) : null}
      {erreur !== undefined ? (
        <p className="rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      ) : null}

      <ul className="grid gap-3">
        {data.map((h) => (
          <li key={h.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/hardware/${h.id}/edit`}
                      className="font-display text-body-lg text-on-surface hover:text-primary"
                    >
                      {h.name}
                    </Link>
                    <Chip tone={h.status === "validated" ? "primary" : "neutral"}>
                      {STATUS_LABELS[h.status]}
                    </Chip>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{h.use_case}</p>
                  {h.description !== null ? (
                    <p className="text-body-sm text-on-surface-variant">{h.description}</p>
                  ) : null}
                  {h.bom.length > 0 ? (
                    <ul className="mt-2 grid gap-1">
                      {h.bom.map((item, idx) => (
                        <li key={idx} className="font-mono text-xs text-on-surface-variant">
                          • {item.part} : <strong>{item.model}</strong> — {EUR.format(item.price_eur)}
                          {item.vendor !== undefined ? ` (${item.vendor})` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-mono text-headline-sm text-on-surface">
                    {EUR.format(h.total_price_eur)}
                  </span>
                  <Link href={`/admin/hardware/${h.id}/edit`}>
                    <Button variant="ghost" size="sm">Éditer</Button>
                  </Link>
                  <form action={deleteHardware}>
                    <input type="hidden" name="id" value={h.id} />
                    <Button type="submit" variant="ghost" size="sm">Supprimer</Button>
                  </form>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
