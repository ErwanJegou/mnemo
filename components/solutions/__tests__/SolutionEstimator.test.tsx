// components/solutions/__tests__/SolutionEstimator.test.tsx
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SolutionEstimator } from "@/components/solutions/SolutionEstimator";
import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";

const BRICK_USAGE: ComponentRow = {
  id: "b-usage",
  vendor_id: "v",
  layer_id: 0,
  category_id: null,
  slug: "vision",
  name: "Claude Vision",
  tier: null,
  description: null,
  pricing_model: "usage",
  base_price_eur: 0.003,
  unit: "image",
  pricing_url: null,
  preset_fit: [],
  capabilities: {},
  source_url: null,
  last_checked_at: null,
  confidence: "high",
  status: "validated",
  notes: null,
  rfq_template: null,
  created_at: "",
  updated_at: "",
};

const STEP: SolutionStepRow = {
  id: "s1",
  solution_id: "sol",
  position: 1,
  title: "Comprendre l'image",
  description: null,
  required_category_id: null,
  recommended_brick_id: "b-usage",
  alternative_brick_ids: [],
  input_port_id: null,
  output_port_id: null,
  decision_notes: null,
  created_at: "",
  updated_at: "",
};

const RATING: BrickQualityRatingRow = {
  id: "r1",
  brick_id: "b-usage",
  use_case: "Description scène",
  score: 5,
  cost_per_op_eur: 0.003,
  cost_unit: "image",
  notes: null,
  source: "internal",
  rated_at: null,
  created_at: "",
  updated_at: "",
};

describe("SolutionEstimator", () => {
  it("affiche le total initial calculé avec les volumes par défaut", () => {
    render(
      <SolutionEstimator
        steps={[STEP]}
        bricks={[BRICK_USAGE]}
        ratings={[RATING]}
        defaultVolumes={{ image_per_month: 1000 }}
      />,
    );
    expect(screen.getByText(/Estimation/)).toBeTruthy();
    expect(screen.getByTestId("total-monthly-eur").textContent).toContain("3");
  });

  it("recalcule le total quand on change le slider", () => {
    render(
      <SolutionEstimator
        steps={[STEP]}
        bricks={[BRICK_USAGE]}
        ratings={[RATING]}
        defaultVolumes={{ image_per_month: 1000 }}
      />,
    );
    const slider = screen.getByLabelText(/Images par mois/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "5000" } });
    expect(screen.getByTestId("total-monthly-eur").textContent).toContain("15");
  });

  it("affiche 'Sur devis' quand au moins une ligne est contact", () => {
    const brickContact: ComponentRow = {
      ...BRICK_USAGE,
      id: "b-contact",
      slug: "contact",
      name: "Enterprise X",
      pricing_model: "contact",
      base_price_eur: 0,
      unit: "mois",
    };
    const stepContact: SolutionStepRow = {
      ...STEP,
      id: "s-contact",
      position: 2,
      recommended_brick_id: "b-contact",
    };
    render(
      <SolutionEstimator
        steps={[STEP, stepContact]}
        bricks={[BRICK_USAGE, brickContact]}
        ratings={[RATING]}
        defaultVolumes={{ image_per_month: 1000 }}
      />,
    );
    expect(screen.getByTestId("total-monthly-eur").textContent).toMatch(/devis/i);
  });

  it("n'affiche aucun slider si pas de clé de volume", () => {
    const brickFlat: ComponentRow = {
      ...BRICK_USAGE,
      pricing_model: "flat",
      base_price_eur: 25,
      unit: "mois",
    };
    render(
      <SolutionEstimator
        steps={[STEP]}
        bricks={[brickFlat]}
        ratings={[]}
        defaultVolumes={{}}
      />,
    );
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByTestId("total-monthly-eur").textContent).toContain("25");
  });
});
