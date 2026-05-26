import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SOVEREIGNTY_LABELS } from "@/lib/catalogue/labels";
import type { SovereigntyZone, VendorRow } from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  initial?: Partial<VendorRow>;
  submitLabel: string;
  errors?: Record<string, string>;
};

const ZONES: SovereigntyZone[] = ["eu", "us", "maroc", "other"];

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
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

export function VendorForm({
  action,
  initial,
  submitLabel,
  errors = {},
}: Props): ReactElement {
  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <Field id="name" label="Nom *" error={errors.name}>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Mistral AI"
          />
        </Field>

        <Field
          id="slug"
          label="Slug"
          hint="Laisser vide pour auto-générer depuis le nom."
          error={errors.slug}
        >
          <Input
            id="slug"
            name="slug"
            defaultValue={initial?.slug ?? ""}
            placeholder="mistral-ai"
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          />
        </Field>

        <Field id="country" label="Pays (code ISO)" error={errors.country}>
          <Input
            id="country"
            name="country"
            maxLength={2}
            defaultValue={initial?.country ?? ""}
            placeholder="FR"
          />
        </Field>

        <Field
          id="sovereignty_zone"
          label="Zone de souveraineté *"
          error={errors.sovereignty_zone}
        >
          <select
            id="sovereignty_zone"
            name="sovereignty_zone"
            required
            defaultValue={initial?.sovereignty_zone ?? "other"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {SOVEREIGNTY_LABELS[z]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="website" label="Site web" error={errors.website}>
          <Input
            id="website"
            name="website"
            type="url"
            defaultValue={initial?.website ?? ""}
            placeholder="https://mistral.ai"
          />
        </Field>

        <Field
          id="contact_email"
          label="E-mail commercial"
          error={errors.contact_email}
        >
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={initial?.contact_email ?? ""}
            placeholder="sales@mistral.ai"
          />
        </Field>

        <Field
          id="contact_form_url"
          label="URL formulaire contact"
          error={errors.contact_form_url}
        >
          <Input
            id="contact_form_url"
            name="contact_form_url"
            type="url"
            defaultValue={initial?.contact_form_url ?? ""}
            placeholder="https://mistral.ai/contact"
          />
        </Field>

        <Field id="notes" label="Notes internes" error={errors.notes}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            placeholder="Note libre (visible admin uniquement)."
          />
        </Field>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
