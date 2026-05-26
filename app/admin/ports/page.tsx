import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { createAdminClient } from "@/lib/supabase/admin";
import { deletePortType } from "./actions";

type Search = { ok?: string; erreur?: string };

const FEEDBACKS: Record<string, string> = {
  created: "Port créé.",
  updated: "Port mis à jour.",
  deleted: "Port supprimé.",
};

export default async function PortsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { ok, erreur } = await searchParams;
  const supabase = createAdminClient();

  const [portsRes, usageRes] = await Promise.all([
    supabase.from("port_types").select("*").order("family").order("name"),
    supabase.from("brick_ports").select("port_type_id"),
  ]);
  if (portsRes.error !== null) throw portsRes.error;
  if (usageRes.error !== null) throw usageRes.error;

  const counts = new Map<string, number>();
  for (const r of usageRes.data) counts.set(r.port_type_id, (counts.get(r.port_type_id) ?? 0) + 1);

  const byFamily = new Map<string, typeof portsRes.data>();
  for (const p of portsRes.data) {
    const bucket = byFamily.get(p.family) ?? [];
    bucket.push(p);
    byFamily.set(p.family, bucket);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Taxonomie</span>
          <h1 className="font-display text-headline-lg text-on-surface">
            Types de ports ({portsRes.data.length})
          </h1>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Catalogue des types de données qui transitent entre les briques. Une brique déclare ses ports
            d&apos;entrée (ce qu&apos;elle consomme) et de sortie (ce qu&apos;elle produit).
          </p>
        </div>
        <Link href="/admin/ports/new"><Button>+ Nouveau port</Button></Link>
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
        {Array.from(byFamily.entries()).map(([family, ports]) => (
          <section key={family} className="space-y-2">
            <h2 className="font-display text-headline-sm text-on-surface">
              <code>{family}</code>
              <span className="ml-2 font-mono text-body-sm text-on-surface-variant">({ports.length})</span>
            </h2>
            <ul className="grid gap-2">
              {ports.map((p) => {
                const usage = counts.get(p.id) ?? 0;
                return (
                  <li key={p.id}>
                    <Card>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/ports/${p.id}/edit`}
                              className="font-display text-body-md text-on-surface hover:text-primary"
                            >
                              {p.name}
                            </Link>
                            <code className="text-body-sm text-on-surface-variant">{p.slug}</code>
                            <Chip tone="neutral">{usage} usage{usage > 1 ? "s" : ""}</Chip>
                          </div>
                          {p.description !== null ? (
                            <p className="text-body-sm text-on-surface-variant">{p.description}</p>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/ports/${p.id}/edit`}>
                            <Button variant="ghost" size="sm">Éditer</Button>
                          </Link>
                          <form action={deletePortType}>
                            <input type="hidden" name="id" value={p.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              disabled={usage > 0}
                              title={usage > 0 ? `${usage} brique(s) référence(nt) ce port.` : "Supprimer."}
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
          </section>
        ))}
      </div>
    </div>
  );
}
