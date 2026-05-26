import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  CONFIDENCE_LABELS,
  INFRA_KIND_LABELS,
  SOVEREIGNTY_LABELS,
  STATUS_LABELS,
} from "@/lib/catalogue/labels";
import type {
  ComponentStatus,
  ConfidenceLevel,
  InfraKind,
  InfraTargetRow,
  SovereigntyZone,
  VendorRow,
} from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  vendors: VendorRow[];
  initial?: Partial<InfraTargetRow>;
  submitLabel: string;
  errors?: Record<string, string>;
};

const KINDS: InfraKind[] = ["vps_managed", "bare_metal", "gpu_rented", "on_prem", "saas_managed"];
const ZONES: SovereigntyZone[] = ["eu", "us", "maroc", "other"];
const CONFIDENCE: ConfidenceLevel[] = ["high", "medium", "low"];
const STATUS: ComponentStatus[] = ["draft", "validated", "deprecated"];

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

export function InfraForm({ action, vendors, initial, submitLabel, errors = {} }: Props): ReactElement {
  const specsDefault = initial?.specs !== undefined ? JSON.stringify(initial.specs, null, 2) : "";

  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <Field id="name" label="Nom *" error={errors.name}>
          <Input id="name" name="name" required defaultValue={initial?.name ?? ""} placeholder="Hetzner Cloud CX22" />
        </Field>

        <Field id="slug" label="Slug" hint="Laisser vide pour auto-générer." error={errors.slug}>
          <Input id="slug" name="slug" defaultValue={initial?.slug ?? ""} pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
        </Field>

        <Field id="infra_kind" label="Type d'infra *" error={errors.infra_kind}>
          <select
            id="infra_kind"
            name="infra_kind"
            required
            defaultValue={initial?.infra_kind ?? "vps_managed"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {KINDS.map((k) => (<option key={k} value={k}>{INFRA_KIND_LABELS[k]}</option>))}
          </select>
        </Field>

        <Field id="vendor_id" label="Vendor (optionnel)" error={errors.vendor_id}>
          <select
            id="vendor_id"
            name="vendor_id"
            defaultValue={initial?.vendor_id ?? ""}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">— Aucun —</option>
            {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
          </select>
        </Field>

        <Field id="country" label="Pays (code ISO)" error={errors.country}>
          <Input id="country" name="country" maxLength={2} defaultValue={initial?.country ?? ""} placeholder="DE" />
        </Field>

        <Field id="sovereignty_zone" label="Zone de souveraineté *" error={errors.sovereignty_zone}>
          <select
            id="sovereignty_zone"
            name="sovereignty_zone"
            required
            defaultValue={initial?.sovereignty_zone ?? "other"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {ZONES.map((z) => (<option key={z} value={z}>{SOVEREIGNTY_LABELS[z]}</option>))}
          </select>
        </Field>

        <Field id="base_price_eur" label="Prix de base (€) *" error={errors.base_price_eur}>
          <Input id="base_price_eur" name="base_price_eur" type="number" min={0} step="0.01" required defaultValue={initial?.base_price_eur ?? 0} />
        </Field>

        <Field id="unit" label="Unité *" hint="mois · heure · gratuit…" error={errors.unit}>
          <Input id="unit" name="unit" required defaultValue={initial?.unit ?? "mois"} />
        </Field>

        <Field id="source_url" label="URL source" error={errors.source_url}>
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
            {CONFIDENCE.map((c) => (<option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>))}
          </select>
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

        <Field
          id="specs"
          label="Specs (JSON)"
          className="col-span-full"
          hint='Ex. : { "cpu_vcpu": 2, "ram_gb": 4, "disk_gb": 40, "gpu_vram_gb": 16 }'
          error={errors.specs}
        >
          <textarea
            id="specs"
            name="specs"
            rows={4}
            defaultValue={specsDefault}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:outline-none"
            placeholder="{}"
          />
        </Field>

        <Field id="notes" label="Notes" className="col-span-full" error={errors.notes}>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initial?.notes ?? ""}
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
