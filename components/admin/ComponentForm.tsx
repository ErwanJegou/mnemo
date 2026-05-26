import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  BRICK_RANK_LABELS,
  CONFIDENCE_LABELS,
  INFRA_KIND_LABELS,
  LAYER_NAMES,
  PRESET_LABELS,
  PRICING_MODEL_LABELS,
  RANK_ORDER,
  STATUS_LABELS,
} from "@/lib/catalogue/labels";
import type {
  BrickCategoryRow,
  BrickInfraTargetRow,
  BrickPortRow,
  ComponentRow,
  ComponentStatus,
  ConfidenceLevel,
  InfraTargetRow,
  PortTypeRow,
  PresetFit,
  PricingModel,
  VendorRow,
} from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  vendors: VendorRow[];
  categories: BrickCategoryRow[];
  portTypes: PortTypeRow[];
  infraTargets: InfraTargetRow[];
  initial?: Partial<ComponentRow>;
  initialPorts?: BrickPortRow[];
  initialInfraTargets?: BrickInfraTargetRow[];
  defaultCategoryId?: string;
  submitLabel: string;
  errors?: Record<string, string>;
};

const PRESETS: PresetFit[] = ["light", "medium", "hard"];
const PRICING: PricingModel[] = ["free", "flat", "usage", "self_host", "contact"];
const CONFIDENCE: ConfidenceLevel[] = ["high", "medium", "low"];
const STATUS: ComponentStatus[] = ["draft", "validated", "deprecated"];
const LAYERS = [0, 1, 2, 3, 4, 5, 6] as const;

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactElement;
}): ReactElement {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-body-sm text-on-surface">
        {label}
      </label>
      {children}
      {hint !== undefined ? (
        <p className="text-body-sm text-on-surface-variant">{hint}</p>
      ) : null}
      {error !== undefined ? (
        <p className="text-body-sm text-error">{error}</p>
      ) : null}
    </div>
  );
}

export function ComponentForm({
  action,
  vendors,
  categories,
  portTypes,
  infraTargets,
  initial,
  initialPorts = [],
  initialInfraTargets = [],
  defaultCategoryId,
  submitLabel,
  errors = {},
}: Props): ReactElement {
  const capsDefault =
    initial?.capabilities !== undefined
      ? JSON.stringify(initial.capabilities, null, 2)
      : "";
  const presetFit = initial?.preset_fit ?? [];

  const checkedPortIn = new Set(
    initialPorts.filter((p) => p.direction === "in").map((p) => p.port_type_id),
  );
  const checkedPortOut = new Set(
    initialPorts.filter((p) => p.direction === "out").map((p) => p.port_type_id),
  );
  const checkedInfra = new Set(initialInfraTargets.map((i) => i.infra_target_id));

  // Groupement des port_types par family
  const portsByFamily = new Map<string, PortTypeRow[]>();
  for (const p of portTypes) {
    const bucket = portsByFamily.get(p.family) ?? [];
    bucket.push(p);
    portsByFamily.set(p.family, bucket);
  }

  // Groupement infra par kind
  const infraByKind = new Map<string, InfraTargetRow[]>();
  for (const i of infraTargets) {
    const bucket = infraByKind.get(i.infra_kind) ?? [];
    bucket.push(i);
    infraByKind.set(i.infra_kind, bucket);
  }

  // Catégories groupées par rang (pour le select grouped)
  const catsByRank = new Map<string, BrickCategoryRow[]>();
  for (const c of categories) {
    const bucket = catsByRank.get(c.rank) ?? [];
    bucket.push(c);
    catsByRank.set(c.rank, bucket);
  }

  const initialCategoryId = initial?.category_id ?? defaultCategoryId ?? "";

  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <Field id="category_id" label="Catégorie générique *" error={errors.category_id}>
          <select
            id="category_id"
            name="category_id"
            defaultValue={initialCategoryId}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Aucune (à compléter) —</option>
            {RANK_ORDER.map((rank) => {
              const cats = catsByRank.get(rank) ?? [];
              if (cats.length === 0) return null;
              return (
                <optgroup key={rank} label={BRICK_RANK_LABELS[rank]}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </Field>

        <Field id="vendor_id" label="Vendor *" error={errors.vendor_id}>
          <select
            id="vendor_id"
            name="vendor_id"
            required
            defaultValue={initial?.vendor_id ?? ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Choisir —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </Field>

        <Field id="layer_id" label="Couche historique (0-6) *" error={errors.layer_id} hint="Conservée pour rétro-compatibilité wizard. La catégorie ci-dessus est l'attribut principal.">
          <select
            id="layer_id"
            name="layer_id"
            required
            defaultValue={initial?.layer_id !== undefined ? String(initial.layer_id) : ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Choisir —</option>
            {LAYERS.map((l) => (
              <option key={l} value={l}>{LAYER_NAMES[l]}</option>
            ))}
          </select>
        </Field>

        <Field id="name" label="Nom *" error={errors.name}>
          <Input id="name" name="name" required defaultValue={initial?.name ?? ""} />
        </Field>

        <Field
          id="slug"
          label="Slug *"
          hint="Recommandé : préfixe par catégorie (ex. vector-qdrant-cloud-free)."
          error={errors.slug}
        >
          <Input
            id="slug"
            name="slug"
            required
            defaultValue={initial?.slug ?? ""}
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          />
        </Field>

        <Field id="tier" label="Tier / édition" error={errors.tier}>
          <Input id="tier" name="tier" defaultValue={initial?.tier ?? ""} placeholder="Free, Pro, Enterprise…" />
        </Field>

        <Field id="pricing_model" label="Modèle de prix *" error={errors.pricing_model}>
          <select
            id="pricing_model"
            name="pricing_model"
            required
            defaultValue={initial?.pricing_model ?? "flat"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {PRICING.map((p) => (
              <option key={p} value={p}>{PRICING_MODEL_LABELS[p]}</option>
            ))}
          </select>
        </Field>

        <Field id="base_price_eur" label="Prix de base (€) *" error={errors.base_price_eur}>
          <Input
            id="base_price_eur"
            name="base_price_eur"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={initial?.base_price_eur ?? 0}
          />
        </Field>

        <Field id="unit" label="Unité *" hint="mois · requête · Go · 1M_tokens · gratuit…" error={errors.unit}>
          <Input id="unit" name="unit" required defaultValue={initial?.unit ?? "mois"} />
        </Field>

        <Field id="pricing_url" label="URL pricing" error={errors.pricing_url}>
          <Input id="pricing_url" name="pricing_url" type="url" defaultValue={initial?.pricing_url ?? ""} />
        </Field>

        <Field id="source_url" label="URL source (audit)" error={errors.source_url}>
          <Input id="source_url" name="source_url" type="url" defaultValue={initial?.source_url ?? ""} />
        </Field>

        <Field id="last_checked_at" label="Vérifié le" error={errors.last_checked_at}>
          <Input id="last_checked_at" name="last_checked_at" type="date" defaultValue={initial?.last_checked_at ?? ""} />
        </Field>

        <Field id="confidence" label="Confiance *" error={errors.confidence}>
          <select
            id="confidence"
            name="confidence"
            required
            defaultValue={initial?.confidence ?? "medium"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {CONFIDENCE.map((c) => (
              <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>
            ))}
          </select>
        </Field>

        <Field id="status" label="Statut *" error={errors.status}>
          <select
            id="status"
            name="status"
            required
            defaultValue={initial?.status ?? "draft"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </Field>

        <Field
          id="preset_fit"
          label="Compatibilité preset"
          className="col-span-full"
          error={errors.preset_fit}
        >
          <div className="flex flex-wrap gap-3">
            {PRESETS.map((p) => (
              <label
                key={p}
                className="inline-flex items-center gap-2 rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface"
              >
                <input
                  type="checkbox"
                  name="preset_fit"
                  value={p}
                  defaultChecked={presetFit.includes(p)}
                />
                {PRESET_LABELS[p]}
              </label>
            ))}
          </div>
        </Field>

        <Field
          id="description"
          label="Description courte"
          className="col-span-full"
          error={errors.description}
        >
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        </Field>

        {/* Ports d'entrée */}
        <Field
          id="port_in"
          label="Ports d'entrée (ce que la brique consomme)"
          className="col-span-full"
          hint="Cocher tous les types de données que la brique peut recevoir."
          error={errors.ports}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from(portsByFamily.entries()).map(([family, ports]) => (
              <fieldset
                key={`in-${family}`}
                className="rounded-input border border-outline-variant bg-surface-container-lowest p-3"
              >
                <legend className="px-1 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  {family}
                </legend>
                <div className="flex flex-col gap-1">
                  {ports.map((p) => (
                    <label key={p.id} className="inline-flex items-center gap-2 text-body-sm text-on-surface">
                      <input
                        type="checkbox"
                        name="port_in"
                        value={p.id}
                        defaultChecked={checkedPortIn.has(p.id)}
                      />
                      <span>{p.name}</span>
                      <code className="text-xs text-on-surface-variant">{p.slug}</code>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Field>

        {/* Ports de sortie */}
        <Field
          id="port_out"
          label="Ports de sortie (ce que la brique produit)"
          className="col-span-full"
          hint="Cocher tous les types de données que la brique peut produire."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from(portsByFamily.entries()).map(([family, ports]) => (
              <fieldset
                key={`out-${family}`}
                className="rounded-input border border-outline-variant bg-surface-container-lowest p-3"
              >
                <legend className="px-1 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  {family}
                </legend>
                <div className="flex flex-col gap-1">
                  {ports.map((p) => (
                    <label key={p.id} className="inline-flex items-center gap-2 text-body-sm text-on-surface">
                      <input
                        type="checkbox"
                        name="port_out"
                        value={p.id}
                        defaultChecked={checkedPortOut.has(p.id)}
                      />
                      <span>{p.name}</span>
                      <code className="text-xs text-on-surface-variant">{p.slug}</code>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Field>

        {/* Infra targets compatibles */}
        <Field
          id="infra_targets"
          label="Infra compatibles (où la brique peut tourner)"
          className="col-span-full"
          error={errors.infra_targets}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from(infraByKind.entries()).map(([kind, items]) => (
              <fieldset
                key={kind}
                className="rounded-input border border-outline-variant bg-surface-container-lowest p-3"
              >
                <legend className="px-1 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  {INFRA_KIND_LABELS[kind as keyof typeof INFRA_KIND_LABELS] ?? kind}
                </legend>
                <div className="flex flex-col gap-1">
                  {items.map((i) => (
                    <label key={i.id} className="inline-flex items-center gap-2 text-body-sm text-on-surface">
                      <input
                        type="checkbox"
                        name="infra_targets"
                        value={i.id}
                        defaultChecked={checkedInfra.has(i.id)}
                      />
                      <span>{i.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Field>

        <Field
          id="capabilities"
          label="Capabilities (JSON libre)"
          className="col-span-full"
          hint='Attributs supplémentaires en JSON, ex. : { "open_source": true }'
          error={errors.capabilities}
        >
          <textarea
            id="capabilities"
            name="capabilities"
            rows={3}
            defaultValue={capsDefault}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:outline-none"
            placeholder="{}"
          />
        </Field>

        <Field id="notes" label="Notes internes" className="col-span-full" error={errors.notes}>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initial?.notes ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        </Field>

        <Field
          id="rfq_template"
          label="Template RFQ (corps mail) — optionnel"
          className="col-span-full"
          hint="Si vide, un template par défaut est utilisé. Placeholders : {vendor}, {component}, {tier}, {layer}."
          error={errors.rfq_template}
        >
          <textarea
            id="rfq_template"
            name="rfq_template"
            rows={3}
            defaultValue={initial?.rfq_template ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        </Field>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
