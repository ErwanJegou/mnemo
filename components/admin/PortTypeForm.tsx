import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { PortTypeRow } from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  initial?: Partial<PortTypeRow>;
  submitLabel: string;
  errors?: Record<string, string>;
};

export function PortTypeForm({ action, initial, submitLabel, errors = {} }: Props): ReactElement {
  return (
    <Card>
      <form action={action} className="grid gap-5 md:grid-cols-2">
        {errors.global !== undefined ? (
          <p className="col-span-full rounded-input border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
            {errors.global}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-body-sm text-on-surface">Nom *</label>
          <Input id="name" name="name" required defaultValue={initial?.name ?? ""} placeholder="Embedding dense" />
          {errors.name !== undefined ? <p className="text-body-sm text-error">{errors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="family" className="text-body-sm text-on-surface">Famille *</label>
          <Input id="family" name="family" required defaultValue={initial?.family ?? ""} placeholder="embedding" pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
          {errors.family !== undefined ? <p className="text-body-sm text-error">{errors.family}</p> : null}
        </div>

        <div className="col-span-full flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-body-sm text-on-surface">Slug *</label>
          <Input id="slug" name="slug" required defaultValue={initial?.slug ?? ""} placeholder="embedding/dense" />
          <p className="text-body-sm text-on-surface-variant">Format conseillé : <code>family/specific</code> (ex. <code>embedding/dense</code>).</p>
          {errors.slug !== undefined ? <p className="text-body-sm text-error">{errors.slug}</p> : null}
        </div>

        <div className="col-span-full flex flex-col gap-1.5">
          <label htmlFor="description" className="text-body-sm text-on-surface">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
