import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SOVEREIGNTY_LABELS } from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteVendor } from "./actions";

type Search = { ok?: string; erreur?: string };

const FEEDBACKS: Record<string, string> = {
  created: "Vendor créé.",
  updated: "Vendor mis à jour.",
  deleted: "Vendor supprimé.",
};

export default async function VendorsListPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { ok, erreur } = await searchParams;
  const supabase = createAdminClient();

  const [vendorsRes, countsRes] = await Promise.all([
    supabase.from("vendors").select("*").order("name", { ascending: true }),
    supabase.from("components").select("vendor_id"),
  ]);
  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (countsRes.error !== null) throw countsRes.error;

  const counts = new Map<string, number>();
  for (const c of countsRes.data) {
    counts.set(c.vendor_id, (counts.get(c.vendor_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Catalogue
          </span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Vendors ({vendorsRes.data.length})
          </h1>
        </div>
        <Link href="/admin/vendors/new">
          <Button>+ Nouveau vendor</Button>
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
        {vendorsRes.data.map((v) => {
          const usage = counts.get(v.id) ?? 0;
          const canDelete = usage === 0;
          return (
            <li key={v.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/vendors/${v.id}/edit`}
                        className="font-display text-body-lg text-on-surface hover:text-primary"
                      >
                        {v.name}
                      </Link>
                      <Chip tone="secondary">{SOVEREIGNTY_LABELS[v.sovereignty_zone]}</Chip>
                      <Chip tone="neutral">{usage} composant{usage > 1 ? "s" : ""}</Chip>
                    </div>
                    <p className="font-mono text-xs text-on-surface-variant">
                      slug : <code>{v.slug}</code>
                      {v.country !== null ? ` · ${v.country}` : ""}
                    </p>
                    {v.website !== null && v.website !== "" ? (
                      <a
                        href={v.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-body-sm text-primary underline decoration-dotted hover:no-underline"
                      >
                        {v.website} ↗
                      </a>
                    ) : null}
                    {v.contact_email !== null && v.contact_email !== "" ? (
                      <p className="text-body-sm text-on-surface-variant">
                        Contact : {v.contact_email}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/vendors/${v.id}/edit`}>
                      <Button variant="ghost" size="sm">Éditer</Button>
                    </Link>
                    <form action={deleteVendor}>
                      <input type="hidden" name="id" value={v.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        disabled={!canDelete}
                        title={
                          canDelete
                            ? "Supprimer ce vendor"
                            : "Impossible : ce vendor est référencé par des composants."
                        }
                      >
                        Supprimer
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
