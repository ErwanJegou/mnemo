import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComponentForm } from "@/components/admin/ComponentForm";
import { RfqButton } from "@/components/admin/RfqButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { formatCheckDate, formatPrice } from "@/lib/catalogue/labels";
import { parseSearchErrors } from "@/lib/catalogue/parseSearchErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteComponent, updateComponent } from "../../actions";

type Params = { id: string };
type Search = { errors?: string; ok?: string };

export default async function EditComponentPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const { id } = await params;
  const { errors: rawErrors, ok } = await searchParams;
  const errors = parseSearchErrors(rawErrors);

  const supabase = createAdminClient();
  const [
    componentRes,
    vendorsRes,
    categoriesRes,
    portsRes,
    infraRes,
    brickPortsRes,
    brickInfraRes,
    historyRes,
  ] = await Promise.all([
    supabase.from("components").select("*").eq("id", id).maybeSingle(),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("brick_categories").select("*").order("rank").order("position"),
    supabase.from("port_types").select("*").order("family").order("name"),
    supabase.from("infra_targets").select("*").order("infra_kind").order("name"),
    supabase.from("brick_ports").select("*").eq("brick_id", id),
    supabase.from("brick_infra_targets").select("*").eq("brick_id", id),
    supabase
      .from("price_history")
      .select("*")
      .eq("component_id", id)
      .order("checked_at", { ascending: false })
      .limit(10),
  ]);

  if (componentRes.error !== null) throw componentRes.error;
  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (categoriesRes.error !== null) throw categoriesRes.error;
  if (portsRes.error !== null) throw portsRes.error;
  if (infraRes.error !== null) throw infraRes.error;
  if (brickPortsRes.error !== null) throw brickPortsRes.error;
  if (brickInfraRes.error !== null) throw brickInfraRes.error;
  if (historyRes.error !== null) throw historyRes.error;
  if (componentRes.data === null) notFound();

  const component = componentRes.data;
  const updateAction = updateComponent.bind(null, id);
  const vendor = vendorsRes.data.find((v) => v.id === component.vendor_id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Édition brique
          </span>
          <h1 className="font-display text-headline-lg text-on-surface">{component.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin"><Button variant="ghost" size="sm">← Catalogue</Button></Link>
          <form action={deleteComponent}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="ghost" size="sm">Supprimer</Button>
          </form>
        </div>
      </header>

      {ok === "updated" ? (
        <p className="rounded-input border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary">
          Brique mise à jour.
        </p>
      ) : null}

      {vendor !== undefined ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-body-sm text-on-surface">
                Demande de prix directe à <strong>{vendor.name}</strong>
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Ouvre votre client mail avec un brouillon pré-rempli.
              </p>
            </div>
            <RfqButton vendor={vendor} component={component} />
          </div>
        </Card>
      ) : null}

      <ComponentForm
        action={updateAction}
        vendors={vendorsRes.data}
        categories={categoriesRes.data}
        portTypes={portsRes.data}
        infraTargets={infraRes.data}
        initial={component}
        initialPorts={brickPortsRes.data}
        initialInfraTargets={brickInfraRes.data}
        submitLabel="Enregistrer"
        errors={errors}
      />

      <section className="space-y-3">
        <h2 className="font-display text-headline-sm text-on-surface">Historique des prix</h2>
        <Card>
          {historyRes.data.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Pas encore d&apos;historique.</p>
          ) : (
            <ul className="divide-y divide-on-surface/10">
              {historyRes.data.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-body-md text-on-surface">
                      {formatPrice(h.price_eur, h.unit, h.pricing_model)}
                    </span>
                    {h.note !== null ? <Chip tone="neutral">{h.note}</Chip> : null}
                  </div>
                  <span className="text-body-sm text-on-surface-variant">
                    {formatCheckDate(h.checked_at.slice(0, 10))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
