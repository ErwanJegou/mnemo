import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { RATING_SOURCE_LABELS } from "@/lib/catalogue/labels";
import type {
  BrickQualityRatingRow,
  ComponentRow,
  RatingSource,
  VendorRow,
} from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  bricks: ComponentRow[];
  vendors: VendorRow[];
  initial?: Partial<BrickQualityRatingRow>;
  defaultBrickId?: string;
  submitLabel: string;
  errors?: Record<string, string>;
};

const SOURCES: RatingSource[] = ["internal", "user_report", "vendor_doc"];

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

export function RatingForm({
  action, bricks, vendors, initial, defaultBrickId, submitLabel, errors = {},
}: Props): ReactElement {
  const vendorsById = new Map(vendors.map((v) => [v.id, v]));

  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <Field id="brick_id" label="Brique *" error={errors.brick_id}>
          <select
            id="brick_id"
            name="brick_id"
            required
            defaultValue={initial?.brick_id ?? defaultBrickId ?? ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Choisir —</option>
            {bricks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({vendorsById.get(b.vendor_id)?.name ?? "?"})
              </option>
            ))}
          </select>
        </Field>

        <Field id="use_case" label="Cas d'usage *" hint="Ex. OCR facture, Vision schéma technique." error={errors.use_case}>
          <Input id="use_case" name="use_case" required defaultValue={initial?.use_case ?? ""} placeholder="OCR facture imprimée propre" />
        </Field>

        <Field id="score" label="Score 1-5 *" error={errors.score}>
          <Input id="score" name="score" type="number" min={1} max={5} required defaultValue={initial?.score ?? 3} />
        </Field>

        <Field id="source" label="Source *" error={errors.source}>
          <select
            id="source"
            name="source"
            required
            defaultValue={initial?.source ?? "internal"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {SOURCES.map((s) => (<option key={s} value={s}>{RATING_SOURCE_LABELS[s]}</option>))}
          </select>
        </Field>

        <Field id="cost_per_op_eur" label="Coût par opération (€)" error={errors.cost_per_op_eur}>
          <Input
            id="cost_per_op_eur"
            name="cost_per_op_eur"
            type="number"
            step="0.000001"
            min={0}
            defaultValue={initial?.cost_per_op_eur ?? ""}
          />
        </Field>

        <Field id="cost_unit" label="Unité du coût" hint="page, image, minute, 1k_tokens…" error={errors.cost_unit}>
          <Input id="cost_unit" name="cost_unit" defaultValue={initial?.cost_unit ?? ""} placeholder="page" />
        </Field>

        <Field id="rated_at" label="Date du test" error={errors.rated_at}>
          <Input id="rated_at" name="rated_at" type="date" defaultValue={initial?.rated_at ?? ""} />
        </Field>

        <div className="hidden md:block" />

        <Field id="notes" label="Notes" className="col-span-full" error={errors.notes}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            placeholder="Pourquoi ce score : forces, limites, points d'attention."
          />
        </Field>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
