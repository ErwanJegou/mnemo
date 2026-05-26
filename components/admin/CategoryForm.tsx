import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { BRICK_RANK_LABELS, RANK_ORDER } from "@/lib/catalogue/labels";
import type { BrickCategoryRow } from "@/lib/supabase/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  initial?: Partial<BrickCategoryRow>;
  submitLabel: string;
  errors?: Record<string, string>;
};

export function CategoryForm({ action, initial, submitLabel, errors = {} }: Props): ReactElement {
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
          <Input id="name" name="name" required defaultValue={initial?.name ?? ""} placeholder="Stockage vectoriel" />
          {errors.name !== undefined ? <p className="text-body-sm text-error">{errors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-body-sm text-on-surface">Slug</label>
          <Input id="slug" name="slug" defaultValue={initial?.slug ?? ""} placeholder="cat-storage-vector" pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
          <p className="text-body-sm text-on-surface-variant">Auto-généré depuis le nom si vide.</p>
          {errors.slug !== undefined ? <p className="text-body-sm text-error">{errors.slug}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rank" className="text-body-sm text-on-surface">Rang *</label>
          <select
            id="rank"
            name="rank"
            required
            defaultValue={initial?.rank ?? "ingest"}
            className="rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
          >
            {RANK_ORDER.map((r) => (<option key={r} value={r}>{BRICK_RANK_LABELS[r]}</option>))}
          </select>
          {errors.rank !== undefined ? <p className="text-body-sm text-error">{errors.rank}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="position" className="text-body-sm text-on-surface">Position dans le rang *</label>
          <Input id="position" name="position" type="number" min={0} max={100} required defaultValue={initial?.position ?? 1} />
          {errors.position !== undefined ? <p className="text-body-sm text-error">{errors.position}</p> : null}
        </div>

        <div className="col-span-full flex flex-col gap-1.5">
          <label htmlFor="description" className="text-body-sm text-on-surface">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
            className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
            placeholder="À quoi ça sert : décrire la fonction générique."
          />
        </div>

        <div className="col-span-full">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
