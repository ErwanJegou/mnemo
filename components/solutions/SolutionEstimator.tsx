"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { estimateSolution, type EstimateLine } from "@/lib/pricing/estimateSolution";
import {
  boundsFor,
  labelFor,
  volumeKeyForCostUnit,
} from "@/lib/pricing/volumeUnits";
import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("fr-FR");

type Props = {
  steps: SolutionStepRow[];
  bricks: ComponentRow[];
  ratings: BrickQualityRatingRow[];
  defaultVolumes: Record<string, number>;
};

export function SolutionEstimator({
  steps,
  bricks,
  ratings,
  defaultVolumes,
}: Props): ReactElement {
  const [volumes, setVolumes] = useState<Record<string, number>>(defaultVolumes);
  useEffect(() => {
    setVolumes(defaultVolumes);
  }, [defaultVolumes]);

  const volumeKeys = useMemo(() => {
    const keys = new Set<string>();
    const bricksById = new Map(bricks.map((b) => [b.id, b]));
    for (const s of steps) {
      if (s.recommended_brick_id === null) continue;
      const b = bricksById.get(s.recommended_brick_id);
      if (b === undefined) continue;
      if (b.pricing_model !== "usage" && b.pricing_model !== "flat") continue;
      const key = volumeKeyForCostUnit(b.unit);
      if (key !== null) keys.add(key);
    }
    return Array.from(keys);
  }, [steps, bricks]);

  const estimate = useMemo(
    () => estimateSolution({ steps, bricks, ratings, volumes }),
    [steps, bricks, ratings, volumes],
  );

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-headline-sm text-on-surface">
            Estimation pour votre volume
          </h2>
          <p
            data-testid="total-monthly-eur"
            className="font-mono text-3xl text-primary"
          >
            {estimate.totalMonthlyEur === null
              ? "Sur devis"
              : `${EUR.format(estimate.totalMonthlyEur)}/mois`}
          </p>
        </div>

        {volumeKeys.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {volumeKeys.map((key) => {
              const bounds = boundsFor(key) ?? {
                min: 0,
                max: 100000,
                step: 1,
              };
              const label = labelFor(key);
              const value = volumes[key] ?? bounds.min;
              return (
                <label key={key} className="block space-y-1">
                  <span className="flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                    <span>{label}</span>
                    <span className="text-on-surface">{NUM.format(value)}</span>
                  </span>
                  <input
                    type="range"
                    aria-label={label}
                    min={bounds.min}
                    max={bounds.max}
                    step={bounds.step}
                    value={value}
                    onChange={(e) =>
                      setVolumes((v) => ({
                        ...v,
                        [key]: Number(e.currentTarget.value),
                      }))
                    }
                    className="w-full"
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        <details className="rounded-input border border-outline-variant bg-surface-container-lowest p-3">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-on-surface-variant">
            Détail du calcul ({estimate.lines.length} étapes)
          </summary>
          <ul className="mt-3 space-y-2">
            {estimate.lines.map((l) => (
              <EstimateLineView key={l.stepId} line={l} />
            ))}
          </ul>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Hypothèses : prix snapshot {formatHypothesis(volumes)}. Marge d&apos;incertitude
            ±30 %. Les briques self-hosted nécessitent un coût d&apos;infra séparé non
            inclus.
          </p>
        </details>
      </div>
    </Card>
  );
}

function EstimateLineView({ line }: { line: EstimateLine }): ReactElement {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 text-body-sm">
      <span>
        <span className="font-mono text-on-surface-variant">{line.stepPosition}.</span>{" "}
        <strong>{line.brickName ?? "—"}</strong>{" "}
        <Chip tone="neutral">{basisLabel(line.basis)}</Chip>
        {line.requiresInfra ? (
          <Chip tone="secondary">+ infra à prévoir</Chip>
        ) : null}
        {line.note !== null ? (
          <span className="ml-1 text-on-surface-variant">— {line.note}</span>
        ) : null}
      </span>
      <span className="font-mono text-on-surface">
        {line.monthlyEur === null
          ? "sur devis"
          : line.monthlyEur === 0
            ? "0 €"
            : `${EUR.format(line.monthlyEur)}/mois`}
      </span>
    </li>
  );
}

function basisLabel(basis: EstimateLine["basis"]): string {
  switch (basis) {
    case "free":
      return "Gratuit";
    case "flat_monthly":
      return "Forfait mensuel";
    case "usage_rated":
      return "À l'usage (rating)";
    case "usage_base":
      return "À l'usage (prix de base)";
    case "missing_volume":
      return "Volume manquant";
    case "self_host":
      return "Self-hosted";
    case "contact":
      return "Sur devis";
    case "no_brick":
      return "Sans brique";
  }
}

function formatHypothesis(volumes: Record<string, number>): string {
  const entries = Object.entries(volumes);
  if (entries.length === 0) return "aucun volume";
  return entries
    .map(([k, v]) => `${NUM.format(v)} ${labelFor(k)}`)
    .join(", ");
}
