// lib/pricing/volumeUnits.ts
// Convention de nommage des hypothèses de volume pour le calcul de prix.

const FIXED_COST_UNITS = new Set<string>(["mois", "année", "year", "month"]);

/** Une unité est dite "fixe" quand elle représente un forfait, pas un volume. */
export function isFixedCostUnit(costUnit: string): boolean {
  return FIXED_COST_UNITS.has(costUnit.trim().toLowerCase());
}

/**
 * Normalise une unité de coût (cost_unit d'un rating ou unit d'une brique)
 * vers une clé d'hypothèse de volume. Retourne null si l'unité est fixe.
 *
 * Convention : on retire les accents (NFD + suppression des diacritiques)
 * et on ajoute le suffixe `_per_month`.
 */
export function volumeKeyForCostUnit(costUnit: string): string | null {
  if (isFixedCostUnit(costUnit)) return null;
  const normalized = costUnit
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return `${normalized}_per_month`;
}

/** Libellés FR pour les clés de volume connues (UI sliders). */
export const VOLUME_UNIT_LABELS: Record<string, string> = {
  image_per_month: "Images par mois",
  page_per_month: "Pages par mois",
  minute_per_month: "Minutes (audio) par mois",
  "1k_tokens_per_month": "Milliers de tokens par mois",
  requete_per_month: "Requêtes par mois",
};

type SliderBounds = { min: number; max: number; step: number };

/** Bornes du slider pour chaque clé de volume connue. */
export const VOLUME_UNIT_SLIDER_BOUNDS: Record<string, SliderBounds> = {
  image_per_month: { min: 10, max: 100000, step: 10 },
  page_per_month: { min: 10, max: 50000, step: 10 },
  minute_per_month: { min: 30, max: 6000, step: 30 },
  "1k_tokens_per_month": { min: 10, max: 100000, step: 10 },
  requete_per_month: { min: 10, max: 100000, step: 10 },
};
