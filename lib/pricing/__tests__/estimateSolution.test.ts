// lib/pricing/__tests__/estimateSolution.test.ts
import { describe, expect, it } from "vitest";
import { estimateSolution } from "@/lib/pricing/estimateSolution";
import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";

// --- Helpers de factory ---

function brick(over: Partial<ComponentRow>): ComponentRow {
  return {
    id: "b-fixed-id",
    vendor_id: "v-1",
    layer_id: 0,
    category_id: null,
    slug: "b",
    name: "Brique X",
    tier: null,
    description: null,
    pricing_model: "flat",
    base_price_eur: 0,
    unit: "mois",
    pricing_url: null,
    preset_fit: [],
    capabilities: {},
    source_url: null,
    last_checked_at: null,
    confidence: "medium",
    status: "validated",
    notes: null,
    rfq_template: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function step(over: Partial<SolutionStepRow>): SolutionStepRow {
  return {
    id: "s-fixed-id",
    solution_id: "sol-1",
    position: 1,
    title: "Étape",
    description: null,
    required_category_id: null,
    recommended_brick_id: null,
    alternative_brick_ids: [],
    input_port_id: null,
    output_port_id: null,
    decision_notes: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function rating(over: Partial<BrickQualityRatingRow>): BrickQualityRatingRow {
  return {
    id: "r-1",
    brick_id: "b-fixed-id",
    use_case: "uc",
    score: 5,
    cost_per_op_eur: null,
    cost_unit: null,
    notes: null,
    source: "internal",
    rated_at: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("estimateSolution", () => {
  it("retourne 0 pour une solution sans étapes", () => {
    const r = estimateSolution({ steps: [], bricks: [], ratings: [], volumes: {} });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it("ignore une étape sans brique recommandée", () => {
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: null })],
      bricks: [],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].basis).toBe("no_brick");
    expect(r.lines[0].monthlyEur).toBe(0);
  });

  it("compte une brique free à 0", () => {
    const b = brick({ id: "b1", pricing_model: "free", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines[0].basis).toBe("free");
  });

  it("compte une brique flat avec unit=mois directement", () => {
    const b = brick({ id: "b1", pricing_model: "flat", base_price_eur: 25, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(25);
    expect(r.lines[0].basis).toBe("flat_monthly");
  });

  it("compte une brique usage avec rating et volume correspondant", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.003, unit: "image" });
    const rat = rating({
      brick_id: "b1",
      cost_per_op_eur: 0.003,
      cost_unit: "image",
      use_case: "Description scène complexe",
    });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [rat],
      volumes: { image_per_month: 1000 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(3, 5);
    expect(r.lines[0].basis).toBe("usage_rated");
    expect(r.lines[0].volumeApplied).toBe(1000);
  });

  it("retombe sur base_price_eur pour usage sans rating", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.001, unit: "page" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: { page_per_month: 500 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(0.5, 5);
    expect(r.lines[0].basis).toBe("usage_base");
  });

  it("marque missing_volume si usage sans volume correspondant", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.003, unit: "image" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines[0].basis).toBe("missing_volume");
    expect(r.lines[0].monthlyEur).toBe(0);
  });

  it("compte une brique self_host à 0 avec flag infra requise", () => {
    const b = brick({ id: "b1", pricing_model: "self_host", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines[0].basis).toBe("self_host");
    expect(r.lines[0].requiresInfra).toBe(true);
  });

  it("retourne null pour une brique contact (sur devis)", () => {
    const b = brick({ id: "b1", pricing_model: "contact", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBeNull();
    expect(r.lines[0].basis).toBe("contact");
    expect(r.lines[0].monthlyEur).toBeNull();
  });

  it("somme correctement plusieurs étapes hétérogènes", () => {
    const b1 = brick({
      id: "b1",
      pricing_model: "usage",
      base_price_eur: 0.003,
      unit: "image",
    });
    const b2 = brick({
      id: "b2",
      pricing_model: "flat",
      base_price_eur: 14,
      unit: "mois",
    });
    const r = estimateSolution({
      steps: [
        step({ id: "s1", position: 1, recommended_brick_id: "b1" }),
        step({ id: "s2", position: 2, recommended_brick_id: "b2" }),
      ],
      bricks: [b1, b2],
      ratings: [
        rating({ brick_id: "b1", cost_per_op_eur: 0.003, cost_unit: "image" }),
      ],
      volumes: { image_per_month: 1000 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(3 + 14, 5);
    expect(r.lines).toHaveLength(2);
  });

  it("si une ligne est sur devis, total est null mais autres lignes restent visibles", () => {
    const b1 = brick({ id: "b1", pricing_model: "flat", base_price_eur: 10, unit: "mois" });
    const b2 = brick({ id: "b2", pricing_model: "contact", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [
        step({ id: "s1", position: 1, recommended_brick_id: "b1" }),
        step({ id: "s2", position: 2, recommended_brick_id: "b2" }),
      ],
      bricks: [b1, b2],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBeNull();
    expect(r.lines[0].monthlyEur).toBe(10);
    expect(r.lines[1].monthlyEur).toBeNull();
  });

  it("choisit le rating le moins cher quand plusieurs matchent l'unité", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.005, unit: "image" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [
        rating({ id: "r1", brick_id: "b1", cost_per_op_eur: 0.005, cost_unit: "image" }),
        rating({ id: "r2", brick_id: "b1", cost_per_op_eur: 0.003, cost_unit: "image" }),
      ],
      volumes: { image_per_month: 1000 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(3, 5);
  });
});
