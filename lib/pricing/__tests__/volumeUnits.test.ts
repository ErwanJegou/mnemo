// lib/pricing/__tests__/volumeUnits.test.ts
import { describe, expect, it } from "vitest";
import {
  isFixedCostUnit,
  volumeKeyForCostUnit,
  VOLUME_UNIT_LABELS,
  VOLUME_UNIT_SLIDER_BOUNDS,
} from "@/lib/pricing/volumeUnits";

describe("isFixedCostUnit", () => {
  it("retourne true pour mois", () => {
    expect(isFixedCostUnit("mois")).toBe(true);
  });
  it("retourne true pour année", () => {
    expect(isFixedCostUnit("année")).toBe(true);
  });
  it("retourne false pour image", () => {
    expect(isFixedCostUnit("image")).toBe(false);
  });
  it("retourne false pour page", () => {
    expect(isFixedCostUnit("page")).toBe(false);
  });
});

describe("volumeKeyForCostUnit", () => {
  it("mappe image vers image_per_month", () => {
    expect(volumeKeyForCostUnit("image")).toBe("image_per_month");
  });
  it("mappe page vers page_per_month", () => {
    expect(volumeKeyForCostUnit("page")).toBe("page_per_month");
  });
  it("mappe minute vers minute_per_month", () => {
    expect(volumeKeyForCostUnit("minute")).toBe("minute_per_month");
  });
  it("mappe 1k_tokens vers 1k_tokens_per_month", () => {
    expect(volumeKeyForCostUnit("1k_tokens")).toBe("1k_tokens_per_month");
  });
  it("normalise requête en requete_per_month (sans accent)", () => {
    expect(volumeKeyForCostUnit("requête")).toBe("requete_per_month");
  });
  it("retourne null pour les unités fixes", () => {
    expect(volumeKeyForCostUnit("mois")).toBeNull();
  });
  it("retourne null pour une chaîne vide ou des espaces seulement", () => {
    expect(volumeKeyForCostUnit("")).toBeNull();
    expect(volumeKeyForCostUnit("   ")).toBeNull();
  });
});

describe("VOLUME_UNIT_LABELS", () => {
  it("a un libellé FR pour image_per_month", () => {
    expect(VOLUME_UNIT_LABELS.image_per_month).toBe("Images par mois");
  });
  it("a un libellé FR pour page_per_month", () => {
    expect(VOLUME_UNIT_LABELS.page_per_month).toBe("Pages par mois");
  });
});

describe("VOLUME_UNIT_SLIDER_BOUNDS", () => {
  it("définit des bornes pour image_per_month", () => {
    const b = VOLUME_UNIT_SLIDER_BOUNDS.image_per_month;
    expect(b.min).toBe(10);
    expect(b.max).toBe(100000);
    expect(b.step).toBe(10);
  });
});
