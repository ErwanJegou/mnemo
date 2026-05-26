import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { BRICK_RANK_LABELS, RANK_ORDER } from "@/lib/catalogue/labels";
import type {
  BrickCategoryRow,
  ComponentRow,
  PortTypeRow,
  SolutionStepRow,
  VendorRow,
} from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: BrickCategoryRow[];
  bricks: ComponentRow[];
  vendors: VendorRow[];
  portTypes: PortTypeRow[];
  initial?: Partial<SolutionStepRow>;
  defaultPosition?: number;
  submitLabel: string;
  errors?: Record<string, string>;
};

function Field({
  id, label, hint, error, className, children,
}: {
  id: string; label: string; hint?: string; error?: string;
  className?: string; children: ReactElement;
}): ReactElement {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-body-sm text-on-surface">{label}</label>
      {children}
      {hint !== undefined ? <p className="text-body-sm text-on-surface-variant">{hint}</p> : null}
      {error !== undefined ? <p className="text-body-sm text-error">{error}</p> : null}
    </div>
  );
}

export function SolutionStepForm({
  action,
  categories,
  bricks,
  vendors,
  portTypes,
  initial,
  defaultPosition,
  submitLabel,
  errors = {},
}: Props): ReactElement {
  const vendorsById = new Map(vendors.map((v) => [v.id, v]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  // Briques groupées par catégorie (pour les dropdowns)
  const bricksByCategory = new Map<string, ComponentRow[]>();
  const bricksWithoutCat: ComponentRow[] = [];
  for (const b of bricks) {
    if (b.category_id === null) {
      bricksWithoutCat.push(b);
    } else {
      const bucket = bricksByCategory.get(b.category_id) ?? [];
      bucket.push(b);
      bricksByCategory.set(b.category_id, bucket);
    }
  }

  // Catégories groupées par rang
  const catsByRank = new Map<string, BrickCategoryRow[]>();
  for (const c of categories) {
    const bucket = catsByRank.get(c.rank) ?? [];
    bucket.push(c);
    catsByRank.set(c.rank, bucket);
  }

  const alternativeIds = new Set(initial?.alternative_brick_ids ?? []);

  // Ports groupés par family
  const portsByFamily = new Map<string, PortTypeRow[]>();
  for (const p of portTypes) {
    const bucket = portsByFamily.get(p.family) ?? [];
    bucket.push(p);
    portsByFamily.set(p.family, bucket);
  }

  function brickLabel(b: ComponentRow): string {
    const vendor = vendorsById.get(b.vendor_id);
    return `${b.name}${vendor ? ` (${vendor.name})` : ""}`;
  }

  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <Field id="position" label="Position (1-100) *" error={errors.position}>
          <Input
            id="position"
            name="position"
            type="number"
            min={1}
            max={100}
            required
            defaultValue={initial?.position ?? defaultPosition ?? 1}
          />
        </Field>

        <Field id="title" label="Titre de l'étape *" error={errors.title}>
          <Input id="title" name="title" required defaultValue={initial?.title ?? ""} placeholder="Comprendre l'image" />
        </Field>

        <Field id="description" label="Description" className="col-span-full" error={errors.description}>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        </Field>

        <Field id="required_category_id" label="Catégorie requise" error={errors.required_category_id}>
          <select
            id="required_category_id"
            name="required_category_id"
            defaultValue={initial?.required_category_id ?? ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Aucune —</option>
            {RANK_ORDER.map((rank) => {
              const cats = catsByRank.get(rank) ?? [];
              if (cats.length === 0) return null;
              return (
                <optgroup key={rank} label={BRICK_RANK_LABELS[rank]}>
                  {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </optgroup>
              );
            })}
          </select>
        </Field>

        <Field id="recommended_brick_id" label="Brique recommandée" error={errors.recommended_brick_id}>
          <select
            id="recommended_brick_id"
            name="recommended_brick_id"
            defaultValue={initial?.recommended_brick_id ?? ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Aucune —</option>
            {Array.from(bricksByCategory.entries()).map(([catId, list]) => {
              const cat = categoriesById.get(catId);
              return (
                <optgroup key={catId} label={cat?.name ?? "?"}>
                  {list.map((b) => (<option key={b.id} value={b.id}>{brickLabel(b)}</option>))}
                </optgroup>
              );
            })}
            {bricksWithoutCat.length > 0 ? (
              <optgroup label="Sans catégorie">
                {bricksWithoutCat.map((b) => (<option key={b.id} value={b.id}>{brickLabel(b)}</option>))}
              </optgroup>
            ) : null}
          </select>
        </Field>

        <Field id="input_port_id" label="Port d'entrée" error={errors.input_port_id}>
          <select
            id="input_port_id"
            name="input_port_id"
            defaultValue={initial?.input_port_id ?? ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Aucun —</option>
            {Array.from(portsByFamily.entries()).map(([family, ports]) => (
              <optgroup key={`in-${family}`} label={family}>
                {ports.map((p) => (<option key={p.id} value={p.id}>{p.slug}</option>))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field id="output_port_id" label="Port de sortie" error={errors.output_port_id}>
          <select
            id="output_port_id"
            name="output_port_id"
            defaultValue={initial?.output_port_id ?? ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Aucun —</option>
            {Array.from(portsByFamily.entries()).map(([family, ports]) => (
              <optgroup key={`out-${family}`} label={family}>
                {ports.map((p) => (<option key={p.id} value={p.id}>{p.slug}</option>))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field
          id="alternative_brick_ids"
          label="Alternatives (multi-sélection)"
          className="col-span-full"
          hint="Cocher toutes les briques équivalentes pouvant servir à cette étape."
          error={errors.alternative_brick_ids}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from(bricksByCategory.entries()).map(([catId, list]) => {
              const cat = categoriesById.get(catId);
              return (
                <fieldset
                  key={catId}
                  className="rounded-input border border-outline-variant bg-surface-container-lowest p-3"
                >
                  <legend className="px-1 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                    {cat?.name ?? "?"}
                  </legend>
                  <div className="flex flex-col gap-1">
                    {list.map((b) => (
                      <label key={b.id} className="inline-flex items-center gap-2 text-body-sm text-on-surface">
                        <input
                          type="checkbox"
                          name="alternative_brick_ids"
                          value={b.id}
                          defaultChecked={alternativeIds.has(b.id)}
                        />
                        <span>{brickLabel(b)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </Field>

        <Field
          id="decision_notes"
          label="Notes de décision"
          className="col-span-full"
          hint="Aide à choisir entre la recommandée et les alternatives."
          error={errors.decision_notes}
        >
          <textarea
            id="decision_notes"
            name="decision_notes"
            rows={3}
            defaultValue={initial?.decision_notes ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            placeholder="Ex : Claude Vision pour les scènes complexes, Florence-2 si vous voulez 100% local."
          />
        </Field>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
