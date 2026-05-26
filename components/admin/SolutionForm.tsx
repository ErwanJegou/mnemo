import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { COMPLEXITY_LABELS, STATUS_LABELS } from "@/lib/catalogue/labels";
import type {
  ComponentStatus,
  SolutionComplexity,
  SolutionRow,
} from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  initial?: Partial<SolutionRow>;
  submitLabel: string;
  errors?: Record<string, string>;
};

const COMPLEXITIES: SolutionComplexity[] = ["easy", "medium", "hard"];
const STATUSES: ComponentStatus[] = ["draft", "validated", "deprecated"];

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

export function SolutionForm({ action, initial, submitLabel, errors = {} }: Props): ReactElement {
  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <Field id="title" label="Titre *" error={errors.title}>
          <Input id="title" name="title" required defaultValue={initial?.title ?? ""} placeholder="Mémoriser une image" />
        </Field>

        <Field id="slug" label="Slug" hint="Auto-généré depuis le titre si vide." error={errors.slug}>
          <Input id="slug" name="slug" defaultValue={initial?.slug ?? ""} placeholder="memo-image" pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
        </Field>

        <Field id="problem_statement" label="Énoncé du problème *" className="col-span-full" error={errors.problem_statement}>
          <textarea
            id="problem_statement"
            name="problem_statement"
            rows={3}
            required
            defaultValue={initial?.problem_statement ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            placeholder="J'ai des photos, je veux les retrouver plus tard avec leur contexte."
          />
        </Field>

        <Field id="audience" label="Audience visée" error={errors.audience}>
          <Input id="audience" name="audience" defaultValue={initial?.audience ?? ""} placeholder="Tout le monde, Cabinets régulés…" />
        </Field>

        <Field id="complexity" label="Complexité *" error={errors.complexity}>
          <select
            id="complexity"
            name="complexity"
            required
            defaultValue={initial?.complexity ?? "medium"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {COMPLEXITIES.map((c) => (<option key={c} value={c}>{COMPLEXITY_LABELS[c]}</option>))}
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
            {STATUSES.map((s) => (<option key={s} value={s}>{STATUS_LABELS[s]}</option>))}
          </select>
        </Field>

        <Field id="position" label="Position d'affichage" hint="Ordre sur la page d'accueil." error={errors.position}>
          <Input id="position" name="position" type="number" min={0} max={1000} defaultValue={initial?.position ?? 0} />
        </Field>

        <Field id="total_price_estimate_eur" label="Prix estimé €/mois" error={errors.total_price_estimate_eur}>
          <Input
            id="total_price_estimate_eur"
            name="total_price_estimate_eur"
            type="number"
            min={0}
            step="1"
            defaultValue={initial?.total_price_estimate_eur ?? ""}
          />
        </Field>

        <Field
          id="volume_assumptions"
          label="Hypothèses de volume (JSON)"
          hint='Exemple : {"image_per_month": 1000, "page_per_month": 500}'
          error={errors.volume_assumptions}
          className="col-span-full"
        >
          <textarea
            id="volume_assumptions"
            name="volume_assumptions"
            rows={3}
            defaultValue={
              initial?.volume_assumptions !== undefined
                ? JSON.stringify(initial.volume_assumptions, null, 2)
                : ""
            }
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:outline-none"
            placeholder='{"image_per_month": 1000}'
          />
        </Field>

        <Field id="estimated_setup_minutes" label="Setup estimé (minutes)" error={errors.estimated_setup_minutes}>
          <Input
            id="estimated_setup_minutes"
            name="estimated_setup_minutes"
            type="number"
            min={0}
            defaultValue={initial?.estimated_setup_minutes ?? ""}
          />
        </Field>

        <Field id="hero_emoji" label="Emoji (1-2 caractères)" hint="📸 📄 🎤 🔍 …" error={errors.hero_emoji}>
          <Input id="hero_emoji" name="hero_emoji" maxLength={4} defaultValue={initial?.hero_emoji ?? ""} />
        </Field>

        <Field id="hero_color" label="Couleur d'accent (slug Tailwind)" error={errors.hero_color}>
          <Input id="hero_color" name="hero_color" defaultValue={initial?.hero_color ?? ""} placeholder="primary, secondary, tertiary" />
        </Field>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
