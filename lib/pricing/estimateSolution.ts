// lib/pricing/estimateSolution.ts
// Moteur pur d'agrégation de prix pour une solution.
// Parcourt les étapes, lit la brique recommandée, applique le pricing_model
// et les volumes fournis. Retourne un détail par ligne + un total.
//
// Règles :
// - free / self_host  → 0 (self_host marqué requiresInfra=true)
// - flat              → base_price_eur si unit=mois|année (sinon traité en usage_base)
// - usage             → cherche un rating cost_unit==brick.unit le moins cher,
//                       sinon retombe sur base_price_eur ; multiplie par
//                       volumes[<unit>_per_month] ; si volume manquant → 0 + flag
// - contact           → null (sur devis, total devient null si présent)

import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";
import { isFixedCostUnit, volumeKeyForCostUnit } from "./volumeUnits";

export type EstimateBasis =
  | "free"
  | "flat_monthly"
  | "usage_rated"
  | "usage_base"
  | "missing_volume"
  | "self_host"
  | "contact"
  | "no_brick";

export type EstimateLine = {
  stepId: string;
  stepPosition: number;
  brickId: string | null;
  brickName: string | null;
  basis: EstimateBasis;
  monthlyEur: number | null;
  unitPriceEur: number | null;
  unit: string | null;
  volumeApplied: number | null;
  requiresInfra: boolean;
  note: string | null;
};

export type EstimateResult = {
  totalMonthlyEur: number | null;
  lines: EstimateLine[];
};

export type EstimateInput = {
  steps: SolutionStepRow[];
  bricks: ComponentRow[];
  ratings: BrickQualityRatingRow[];
  volumes: Record<string, number>;
};

/** Calcule l'estimation mensuelle d'une solution à partir de ses étapes. */
export function estimateSolution(input: EstimateInput): EstimateResult {
  const bricksById = new Map(input.bricks.map((b) => [b.id, b]));

  const ratingsByBrick = new Map<string, BrickQualityRatingRow[]>();
  for (const r of input.ratings) {
    const arr = ratingsByBrick.get(r.brick_id) ?? [];
    arr.push(r);
    ratingsByBrick.set(r.brick_id, arr);
  }

  const lines: EstimateLine[] = [];
  let total = 0;
  let totalIsNull = false;

  for (const s of input.steps) {
    const line = lineForStep(s, bricksById, ratingsByBrick, input.volumes);
    lines.push(line);
    if (line.monthlyEur === null) totalIsNull = true;
    else total += line.monthlyEur;
  }

  return {
    totalMonthlyEur: totalIsNull ? null : total,
    lines,
  };
}

function lineForStep(
  s: SolutionStepRow,
  bricksById: Map<string, ComponentRow>,
  ratingsByBrick: Map<string, BrickQualityRatingRow[]>,
  volumes: Record<string, number>,
): EstimateLine {
  if (s.recommended_brick_id === null) {
    return {
      stepId: s.id,
      stepPosition: s.position,
      brickId: null,
      brickName: null,
      basis: "no_brick",
      monthlyEur: 0,
      unitPriceEur: null,
      unit: null,
      volumeApplied: null,
      requiresInfra: false,
      note: "Pas de brique recommandée.",
    };
  }

  const b = bricksById.get(s.recommended_brick_id);
  if (b === undefined) {
    return {
      stepId: s.id,
      stepPosition: s.position,
      brickId: s.recommended_brick_id,
      brickName: null,
      basis: "no_brick",
      monthlyEur: 0,
      unitPriceEur: null,
      unit: null,
      volumeApplied: null,
      requiresInfra: false,
      note: "Brique recommandée introuvable.",
    };
  }

  const base = {
    stepId: s.id,
    stepPosition: s.position,
    brickId: b.id,
    brickName: b.name,
    unit: b.unit,
  };

  switch (b.pricing_model) {
    case "free":
      return {
        ...base,
        basis: "free",
        monthlyEur: 0,
        unitPriceEur: 0,
        volumeApplied: null,
        requiresInfra: false,
        note: null,
      };

    case "self_host":
      return {
        ...base,
        basis: "self_host",
        monthlyEur: 0,
        unitPriceEur: 0,
        volumeApplied: null,
        requiresInfra: true,
        note: "Self-hosted : prévoir un coût d'infra séparé.",
      };

    case "contact":
      return {
        ...base,
        basis: "contact",
        monthlyEur: null,
        unitPriceEur: null,
        volumeApplied: null,
        requiresInfra: false,
        note: "Sur devis.",
      };

    case "flat":
      if (isFixedCostUnit(b.unit)) {
        return {
          ...base,
          basis: "flat_monthly",
          monthlyEur: b.base_price_eur,
          unitPriceEur: b.base_price_eur,
          volumeApplied: null,
          requiresInfra: false,
          note: null,
        };
      }
      return usageLine(base, b, ratingsByBrick.get(b.id) ?? [], volumes);

    case "usage":
      return usageLine(base, b, ratingsByBrick.get(b.id) ?? [], volumes);
  }
}

type BaseFields = {
  stepId: string;
  stepPosition: number;
  brickId: string;
  brickName: string;
  unit: string;
};

function usageLine(
  base: BaseFields,
  b: ComponentRow,
  ratings: BrickQualityRatingRow[],
  volumes: Record<string, number>,
): EstimateLine {
  const matchingRatings = ratings.filter(
    (r) => r.cost_per_op_eur !== null && r.cost_unit === b.unit,
  );
  const cheapest = matchingRatings.reduce<BrickQualityRatingRow | null>(
    (best, r) => {
      if (r.cost_per_op_eur === null) return best;
      if (best === null) return r;
      if (best.cost_per_op_eur === null) return r;
      return r.cost_per_op_eur < best.cost_per_op_eur ? r : best;
    },
    null,
  );

  const useRating = cheapest !== null && cheapest.cost_per_op_eur !== null;
  const unitPrice = useRating ? (cheapest.cost_per_op_eur ?? 0) : b.base_price_eur;
  const basis: EstimateBasis = useRating ? "usage_rated" : "usage_base";

  const volumeKey = volumeKeyForCostUnit(b.unit);
  if (volumeKey === null) {
    return {
      ...base,
      basis: "flat_monthly",
      monthlyEur: unitPrice,
      unitPriceEur: unitPrice,
      volumeApplied: null,
      requiresInfra: false,
      note: null,
    };
  }

  const volume = volumes[volumeKey];
  if (typeof volume !== "number" || !Number.isFinite(volume)) {
    return {
      ...base,
      basis: "missing_volume",
      monthlyEur: 0,
      unitPriceEur: unitPrice,
      volumeApplied: null,
      requiresInfra: false,
      note: `Volume manquant : ajustez le slider "${volumeKey}".`,
    };
  }

  return {
    ...base,
    basis,
    monthlyEur: unitPrice * volume,
    unitPriceEur: unitPrice,
    volumeApplied: volume,
    requiresInfra: false,
    note: null,
  };
}
