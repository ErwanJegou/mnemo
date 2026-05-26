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
  const trimmed = costUnit.trim();
  if (trimmed === "") return null;
  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
  return `${normalized}_per_month`;
}

/** Clés connues d'hypothèses de volume. Sert à typer strictement les maps de libellés et bornes. */
export type VolumeKey =
  | "image_per_month"
  | "page_per_month"
  | "minute_per_month"
  | "1k_tokens_per_month"
  | "requete_per_month";

/** Libellés FR pour les clés de volume connues (UI sliders). */
export const VOLUME_UNIT_LABELS: Record<VolumeKey, string> = {
  image_per_month: "Images par mois",
  page_per_month: "Pages par mois",
  minute_per_month: "Minutes (audio) par mois",
  "1k_tokens_per_month": "Milliers de tokens par mois",
  requete_per_month: "Requêtes par mois",
};

export type SliderBounds = { min: number; max: number; step: number };

/** Bornes du slider pour chaque clé de volume connue. */
export const VOLUME_UNIT_SLIDER_BOUNDS: Record<VolumeKey, SliderBounds> = {
  image_per_month: { min: 10, max: 100000, step: 10 },
  page_per_month: { min: 10, max: 50000, step: 10 },
  minute_per_month: { min: 30, max: 6000, step: 30 },
  "1k_tokens_per_month": { min: 10, max: 100000, step: 10 },
  requete_per_month: { min: 10, max: 100000, step: 10 },
};

// Accès sécurisé par clé arbitraire (évite les casts `as VolumeKey` côté appelant).

/** Retourne le libellé UI pour une clé de volume, ou la clé brute si inconnue. */
export function labelFor(key: string): string {
  const labels: Record<string, string | undefined> = VOLUME_UNIT_LABELS;
  return labels[key] ?? key;
}

/** Retourne les bornes slider pour une clé de volume, ou undefined si inconnue. */
export function boundsFor(key: string): SliderBounds | undefined {
  const bounds: Record<string, SliderBounds | undefined> = VOLUME_UNIT_SLIDER_BOUNDS;
  return bounds[key];
}
