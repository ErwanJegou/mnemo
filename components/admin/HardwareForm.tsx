import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { STATUS_LABELS } from "@/lib/catalogue/labels";
import type { ComponentStatus, HardwareRecipeRow } from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  initial?: Partial<HardwareRecipeRow>;
  submitLabel: string;
  errors?: Record<string, string>;
};

const STATUS: ComponentStatus[] = ["draft", "validated", "deprecated"];

const BOM_PLACEHOLDER = `[
  {
    "part": "Mini-PC",
    "model": "Beelink SER7 7840HS",
    "ram_gb": 32,
    "disk_gb": 2000,
    "price_eur": 600,
    "vendor": "Beelink",
    "url": "https://www.bee-link.com"
  }
]`;

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

export function HardwareForm({ action, initial, submitLabel, errors = {} }: Props): ReactElement {
  const bomDefault = initial?.bom !== undefined ? JSON.stringify(initial.bom, null, 2) : "";

  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <Field id="name" label="Nom du pack *" error={errors.name}>
          <Input id="name" name="name" required defaultValue={initial?.name ?? ""} placeholder="Pack RAG perso (CPU)" />
        </Field>

        <Field id="slug" label="Slug" hint="Laisser vide pour auto-générer." error={errors.slug}>
          <Input id="slug" name="slug" defaultValue={initial?.slug ?? ""} pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
        </Field>

        <Field id="use_case" label="Cas d'usage *" className="col-span-full" error={errors.use_case}>
          <Input
            id="use_case"
            name="use_case"
            required
            defaultValue={initial?.use_case ?? ""}
            placeholder="Base mémorielle individuelle, CPU uniquement"
          />
        </Field>

        <Field id="total_price_eur" label="Prix total (€) *" error={errors.total_price_eur}>
          <Input
            id="total_price_eur"
            name="total_price_eur"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={initial?.total_price_eur ?? 0}
          />
        </Field>

        <Field id="purchase_url" label="URL d'achat (vendor principal)" error={errors.purchase_url}>
          <Input id="purchase_url" name="purchase_url" type="url" defaultValue={initial?.purchase_url ?? ""} />
        </Field>

        <Field id="status" label="Statut *" error={errors.status}>
          <select
            id="status"
            name="status"
            required
            defaultValue={initial?.status ?? "validated"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {STATUS.map((s) => (<option key={s} value={s}>{STATUS_LABELS[s]}</option>))}
          </select>
        </Field>

        <Field id="description" label="Description" className="col-span-full" error={errors.description}>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        </Field>

        <Field
          id="bom"
          label="Bill of materials (JSON)"
          className="col-span-full"
          hint="Tableau JSON. Chaque entrée : part, model, price_eur (obligatoires) + vendor/url/ram_gb/disk_gb (optionnels)."
          error={errors.bom}
        >
          <textarea
            id="bom"
            name="bom"
            rows={8}
            defaultValue={bomDefault}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:outline-none"
            placeholder={BOM_PLACEHOLDER}
          />
        </Field>

        <Field id="installer_notes" label="Notes installeur" className="col-span-full" error={errors.installer_notes}>
          <textarea
            id="installer_notes"
            name="installer_notes"
            rows={3}
            defaultValue={initial?.installer_notes ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            placeholder="Compter X heures pour l'installation, prévoir tel logiciel…"
          />
        </Field>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
