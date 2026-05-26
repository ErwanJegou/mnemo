import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StatusDot } from "@/components/ui/StatusDot";
import {
  BRICK_RANK_DESCRIPTIONS,
  BRICK_RANK_LABELS,
  CONFIDENCE_LABELS,
  PRESET_LABELS,
  PRICING_MODEL_LABELS,
  RANK_ORDER,
  STATUS_LABELS,
  formatCheckDate,
  formatPrice,
} from "@/lib/catalogue/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BrickCategoryRow,
  BrickRank,
  ComponentRow,
  ComponentStatus,
  PresetFit,
  VendorRow,
} from "@/lib/supabase/types";

type Search = {
  vendor?: string;
  status?: string;
  preset?: string;
  rank?: string;
  category?: string;
};

const STATUS_VALUES: ComponentStatus[] = ["draft", "validated", "deprecated"];
const PRESET_VALUES: PresetFit[] = ["light", "medium", "hard"];

function parseStatus(raw: string | undefined): ComponentStatus | null {
  return raw !== undefined && (STATUS_VALUES as string[]).includes(raw)
    ? (raw as ComponentStatus)
    : null;
}

function parsePreset(raw: string | undefined): PresetFit | null {
  return raw !== undefined && (PRESET_VALUES as string[]).includes(raw)
    ? (raw as PresetFit)
    : null;
}

function parseRank(raw: string | undefined): BrickRank | null {
  return raw !== undefined && (RANK_ORDER as string[]).includes(raw)
    ? (raw as BrickRank)
    : null;
}

const STATUS_TONE: Record<ComponentStatus, "primary" | "neutral" | "error"> = {
  draft: "neutral",
  validated: "primary",
  deprecated: "error",
};

export default async function AdminCataloguePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<ReactElement> {
  const {
    vendor: vendorFilter,
    status: statusRaw,
    preset: presetRaw,
    rank: rankRaw,
    category: categoryFilter,
  } = await searchParams;
  const statusFilter = parseStatus(statusRaw);
  const presetFilter = parsePreset(presetRaw);
  const rankFilter = parseRank(rankRaw);

  const supabase = createAdminClient();

  const [vendorsRes, componentsRes, categoriesRes] = await Promise.all([
    supabase.from("vendors").select("*").order("name", { ascending: true }),
    supabase
      .from("components")
      .select("*")
      .order("base_price_eur", { ascending: true }),
    supabase
      .from("brick_categories")
      .select("*")
      .order("rank", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  if (vendorsRes.error !== null) throw vendorsRes.error;
  if (componentsRes.error !== null) throw componentsRes.error;
  if (categoriesRes.error !== null) throw categoriesRes.error;

  const vendors: VendorRow[] = vendorsRes.data;
  const vendorsById = new Map(vendors.map((v) => [v.id, v]));
  const allComponents: ComponentRow[] = componentsRes.data;
  const categories: BrickCategoryRow[] = categoriesRes.data;
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const filtered = allComponents.filter((c) => {
    if (vendorFilter !== undefined && vendorFilter !== "" && c.vendor_id !== vendorFilter) {
      return false;
    }
    if (statusFilter !== null && c.status !== statusFilter) return false;
    if (presetFilter !== null && !c.preset_fit.includes(presetFilter)) return false;
    if (categoryFilter !== undefined && categoryFilter !== "" && c.category_id !== categoryFilter) {
      return false;
    }
    if (rankFilter !== null) {
      const cat = c.category_id !== null ? categoriesById.get(c.category_id) : undefined;
      if (cat === undefined || cat.rank !== rankFilter) return false;
    }
    return true;
  });

  // Groupement : rang → catégorie → composants
  const byRank = new Map<BrickRank | "uncategorized", Map<string, ComponentRow[]>>();
  for (const c of filtered) {
    const cat = c.category_id !== null ? categoriesById.get(c.category_id) : undefined;
    const rank = cat?.rank ?? "uncategorized";
    const catKey = cat?.id ?? "uncategorized";
    if (!byRank.has(rank)) byRank.set(rank, new Map());
    const ranks = byRank.get(rank);
    if (ranks === undefined) continue;
    if (!ranks.has(catKey)) ranks.set(catKey, []);
    ranks.get(catKey)?.push(c);
  }

  const totalComponents = allComponents.length;
  const totalShown = filtered.length;
  const hasActiveFilter =
    (vendorFilter !== undefined && vendorFilter !== "") ||
    statusFilter !== null ||
    presetFilter !== null ||
    rankFilter !== null ||
    (categoryFilter !== undefined && categoryFilter !== "");

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">Catalogue</span>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-headline-lg text-on-surface">
            Briques ({totalShown}
            {hasActiveFilter ? ` / ${totalComponents}` : ""})
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/categories"><Button variant="ghost" size="sm">Catégories</Button></Link>
            <Link href="/admin/vendors"><Button variant="ghost" size="sm">Vendors</Button></Link>
            <Link href="/admin/infra"><Button variant="ghost" size="sm">Infra</Button></Link>
            <Link href="/admin/hardware"><Button variant="ghost" size="sm">Hardware</Button></Link>
            <Link href="/admin/ports"><Button variant="ghost" size="sm">Ports</Button></Link>
            <Link href="/admin/components/new"><Button variant="primary" size="sm">+ Brique</Button></Link>
          </div>
        </div>
        <p className="max-w-3xl text-body-sm text-on-surface-variant">
          Catalogue éditable des briques composant une base mémorielle. Groupé par <strong>rang</strong>
          (pré-ingestion → ops) puis par <strong>catégorie générique</strong>. Les briques sans catégorie
          sont à compléter.
        </p>
      </header>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-body-sm">
            <span className="text-on-surface-variant">Rang</span>
            <select
              name="rank"
              defaultValue={rankRaw ?? ""}
              className="rounded-input border border-on-surface/20 bg-surface px-3 py-1.5 text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Tous</option>
              {RANK_ORDER.map((r) => (
                <option key={r} value={r}>{BRICK_RANK_LABELS[r]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body-sm">
            <span className="text-on-surface-variant">Catégorie</span>
            <select
              name="category"
              defaultValue={categoryFilter ?? ""}
              className="rounded-input border border-on-surface/20 bg-surface px-3 py-1.5 text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body-sm">
            <span className="text-on-surface-variant">Vendor</span>
            <select
              name="vendor"
              defaultValue={vendorFilter ?? ""}
              className="rounded-input border border-on-surface/20 bg-surface px-3 py-1.5 text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Tous</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body-sm">
            <span className="text-on-surface-variant">Statut</span>
            <select
              name="status"
              defaultValue={statusRaw ?? ""}
              className="rounded-input border border-on-surface/20 bg-surface px-3 py-1.5 text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Tous</option>
              {STATUS_VALUES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body-sm">
            <span className="text-on-surface-variant">Preset</span>
            <select
              name="preset"
              defaultValue={presetRaw ?? ""}
              className="rounded-input border border-on-surface/20 bg-surface px-3 py-1.5 text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Tous</option>
              {PRESET_VALUES.map((p) => (
                <option key={p} value={p}>{PRESET_LABELS[p]}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Filtrer</Button>
            {hasActiveFilter ? (
              <Link href="/admin/components"><Button type="button" variant="ghost" size="sm">Réinitialiser</Button></Link>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="space-y-8">
        {RANK_ORDER.map((rank) => {
          const rankCats = byRank.get(rank);
          if (rankCats === undefined && hasActiveFilter) return null;
          const cats = categories.filter((c) => c.rank === rank);
          const countInRank = Array.from(rankCats?.values() ?? []).reduce(
            (acc, arr) => acc + arr.length,
            0,
          );

          return (
            <section key={rank} className="space-y-4">
              <header className="space-y-1">
                <h2 className="font-display text-headline-md text-on-surface">
                  {BRICK_RANK_LABELS[rank]}
                  <span className="ml-2 font-mono text-body-sm text-on-surface-variant">
                    ({countInRank})
                  </span>
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  {BRICK_RANK_DESCRIPTIONS[rank]}
                </p>
              </header>
              <div className="space-y-4">
                {cats.map((cat) => {
                  const bricks = rankCats?.get(cat.id) ?? [];
                  if (bricks.length === 0 && hasActiveFilter) return null;
                  return (
                    <div key={cat.id} className="space-y-2">
                      <h3 className="font-display text-body-lg text-on-surface">
                        {cat.name}
                        <span className="ml-2 font-mono text-body-sm text-on-surface-variant">
                          ({bricks.length})
                        </span>
                      </h3>
                      {bricks.length === 0 ? (
                        <p className="rounded-input border border-dashed border-outline-variant px-3 py-2 text-body-sm text-on-surface-variant">
                          Aucune brique dans cette catégorie.{" "}
                          <Link
                            href={`/admin/components/new?category=${cat.id}`}
                            className="text-primary underline decoration-dotted hover:no-underline"
                          >
                            En ajouter une
                          </Link>
                          .
                        </p>
                      ) : (
                        <ul className="grid gap-2">
                          {bricks.map((c) => {
                            const vendor = vendorsById.get(c.vendor_id);
                            return (
                              <li key={c.id}>
                                <Card>
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Link
                                          href={`/admin/components/${c.id}/edit`}
                                          className="font-display text-body-lg text-on-surface hover:text-primary"
                                        >
                                          {c.name}
                                        </Link>
                                        <Chip tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</Chip>
                                        {c.tier !== null && c.tier !== "" ? (
                                          <Chip tone="neutral">{c.tier}</Chip>
                                        ) : null}
                                        {c.preset_fit.map((p) => (
                                          <Chip key={p} tone="secondary">{PRESET_LABELS[p]}</Chip>
                                        ))}
                                      </div>
                                      <p className="font-mono text-xs text-on-surface-variant">
                                        Vendor : {vendor?.name ?? "(orphelin)"} ·{" "}
                                        {PRICING_MODEL_LABELS[c.pricing_model]} ·{" "}
                                        <code>{c.slug}</code>
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 text-right">
                                      <span className="font-mono text-body-md text-on-surface">
                                        {formatPrice(c.base_price_eur, c.unit, c.pricing_model)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <StatusDot confidence={c.confidence} />
                                        <span className="text-body-sm text-on-surface-variant">
                                          {CONFIDENCE_LABELS[c.confidence]}
                                        </span>
                                      </div>
                                      <span className="text-body-sm text-on-surface-variant">
                                        Vérifié le {formatCheckDate(c.last_checked_at)}
                                      </span>
                                    </div>
                                  </div>
                                </Card>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Briques sans catégorie (à compléter) */}
        {byRank.has("uncategorized") ? (
          <section className="space-y-3">
            <h2 className="font-display text-headline-md text-on-surface">
              Sans catégorie ({byRank.get("uncategorized")?.get("uncategorized")?.length ?? 0})
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Briques à rattacher à une catégorie via leur fiche d&apos;édition.
            </p>
            <ul className="grid gap-2">
              {(byRank.get("uncategorized")?.get("uncategorized") ?? []).map((c) => (
                <li key={c.id}>
                  <Card>
                    <Link
                      href={`/admin/components/${c.id}/edit`}
                      className="font-display text-body-md text-on-surface hover:text-primary"
                    >
                      {c.name}
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
