import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  INFRA_KIND_LABELS,
  SOVEREIGNTY_LABELS,
  STATUS_LABELS,
  formatPrice,
} from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InfraKind, InfraTargetRow } from "@/lib/supabase/types";
import { deleteInfra } from "./actions";

type Search = { ok?: string; erreur?: string };

const FEEDBACKS: Record<string, string> = {
  created: "Infra créée.",
  updated: "Infra mise à jour.",
  deleted: "Infra supprimée.",
};

const KIND_ORDER: InfraKind[] = ["vps_managed", "bare_metal", "gpu_rented", "on_prem", "saas_managed"];

export default async function InfraListPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { ok, erreur } = await searchParams;
  const supabase = createAdminClient();

  const [infraRes, usageRes, vendorsRes] = await Promise.all([
    supabase.from("infra_targets").select("*").order("infra_kind").order("base_price_eur"),
    supabase.from("brick_infra_targets").select("infra_target_id"),
    supabase.from("vendors").select("id, name"),
  ]);
  if (infraRes.error !== null) throw infraRes.error;
  if (usageRes.error !== null) throw usageRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;

  const counts = new Map<string, number>();
  for (const r of usageRes.data) counts.set(r.infra_target_id, (counts.get(r.infra_target_id) ?? 0) + 1);
  const vendorsById = new Map(vendorsRes.data.map((v) => [v.id, v.name]));

  const byKind = new Map<InfraKind, InfraTargetRow[]>();
  for (const i of infraRes.data) {
    const bucket = byKind.get(i.infra_kind) ?? [];
    bucket.push(i);
    byKind.set(i.infra_kind, bucket);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Catalogue</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Infra ({infraRes.data.length})
          </h1>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Où héberger les briques : VPS managés, bare metal, GPU à la demande, on-prem, SaaS managés.
          </p>
        </div>
        <Link href="/admin/infra/new">
          <Button>+ Nouvelle infra</Button>
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

      <div className="space-y-6">
        {KIND_ORDER.map((kind) => {
          const items = byKind.get(kind) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={kind} className="space-y-2">
              <h2 className="font-display text-headline-sm text-on-surface">
                {INFRA_KIND_LABELS[kind]}
                <span className="ml-2 font-mono text-body-sm text-on-surface-variant">({items.length})</span>
              </h2>
              <ul className="grid gap-2">
                {items.map((i) => {
                  const usage = counts.get(i.id) ?? 0;
                  return (
                    <li key={i.id}>
                      <Card>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/admin/infra/${i.id}/edit`}
                                className="font-display text-body-lg text-on-surface hover:text-primary"
                              >
                                {i.name}
                              </Link>
                              <Chip tone="secondary">{SOVEREIGNTY_LABELS[i.sovereignty_zone]}</Chip>
                              <Chip tone="neutral">{usage} brique{usage > 1 ? "s" : ""}</Chip>
                              <Chip tone={i.status === "validated" ? "primary" : "neutral"}>
                                {STATUS_LABELS[i.status]}
                              </Chip>
                            </div>
                            <p className="font-mono text-xs text-on-surface-variant">
                              slug : <code>{i.slug}</code>
                              {i.vendor_id !== null ? ` · vendor : ${vendorsById.get(i.vendor_id) ?? "?"}` : ""}
                              {i.country !== null ? ` · ${i.country}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-body-md text-on-surface">
                              {i.base_price_eur === 0 && i.unit === "gratuit" ? "Gratuit" : formatPrice(i.base_price_eur, i.unit, "flat")}
                            </span>
                            <div className="flex gap-2">
                              <Link href={`/admin/infra/${i.id}/edit`}>
                                <Button variant="ghost" size="sm">Éditer</Button>
                              </Link>
                              <form action={deleteInfra}>
                                <input type="hidden" name="id" value={i.id} />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  disabled={usage > 0}
                                  title={usage > 0 ? `Référencée par ${usage} brique(s).` : "Supprimer."}
                                >
                                  Supprimer
                                </Button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
