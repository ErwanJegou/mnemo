// Libellés français pour les valeurs énumérées du catalogue.
// Centralisé pour réutilisation : page admin, formulaires, fiches publiques.

import type {
  BrickRank,
  ComponentStatus,
  ConfidenceLevel,
  InfraKind,
  PortDirection,
  PresetFit,
  PricingModel,
  RatingSource,
  SolutionComplexity,
  SovereigntyZone,
} from "@/lib/supabase/types";

export const LAYER_NAMES: Record<number, string> = {
  0: "C0 — Contrat commun (frontmatter YAML)",
  1: "C1 — Surface utilisateur (MCP)",
  2: "C2 — Orchestrateur RAG + cascade LLM",
  3: "C3 — Retrieval + reranking",
  4: "C4 — Embeddings",
  5: "C5 — Stockage polyglotte",
  6: "C6 — Infra (LLM Gateway + inférence + backup)",
};

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  free: "Gratuit",
  flat: "Forfait",
  usage: "À l’usage",
  self_host: "Self-host (OSS)",
  contact: "Sur devis",
};

export const SOVEREIGNTY_LABELS: Record<SovereigntyZone, string> = {
  eu: "Union européenne",
  us: "États-Unis",
  maroc: "Maroc",
  other: "Autre",
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "Haute",
  medium: "Moyenne",
  low: "Faible",
};

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  draft: "Brouillon",
  validated: "Validé",
  deprecated: "Déprécié",
};

export const PRESET_LABELS: Record<PresetFit, string> = {
  light: "LIGHT",
  medium: "MEDIUM",
  hard: "HARD",
};

export const BRICK_RANK_LABELS: Record<BrickRank, string> = {
  preingest: "1. Pré-ingestion",
  ingest: "2. Ingestion",
  storage: "3. Stockage",
  query: "4. Requêtage",
  ai: "5. IA",
  surface: "6. Surface",
  ops: "7. Opérations",
};

export const BRICK_RANK_DESCRIPTIONS: Record<BrickRank, string> = {
  preingest: "Transformer la matière brute (PDF, image, audio) en texte structuré.",
  ingest: "Mettre la matière dans le système (schéma pivot, embeddings, extraction).",
  storage: "Où vivent les données (vault, vecteurs, relationnel, graphe).",
  query: "Interroger la base (orchestration RAG, reranking, gateway LLM).",
  ai: "Le LLM lui-même (API hostée ou inférence locale).",
  surface: "Comment l'humain parle au système (chat MCP, IDE, UI).",
  ops: "Faire tourner en prod (backup, monitoring, sécurité).",
};

export const RANK_ORDER: BrickRank[] = [
  "preingest",
  "ingest",
  "storage",
  "query",
  "ai",
  "surface",
  "ops",
];

export const INFRA_KIND_LABELS: Record<InfraKind, string> = {
  vps_managed: "VPS managé",
  bare_metal: "Bare metal dédié",
  gpu_rented: "GPU loué (à l'heure)",
  on_prem: "On-prem (machine perso/cabinet)",
  saas_managed: "SaaS managé (vendor héberge tout)",
};

export const PORT_DIRECTION_LABELS: Record<PortDirection, string> = {
  in: "Entrée",
  out: "Sortie",
};

export const COMPLEXITY_LABELS: Record<SolutionComplexity, string> = {
  easy: "Facile",
  medium: "Intermédiaire",
  hard: "Avancé",
};

export const COMPLEXITY_TONE: Record<SolutionComplexity, "primary" | "secondary" | "error"> = {
  easy: "primary",
  medium: "secondary",
  hard: "error",
};

export const RATING_SOURCE_LABELS: Record<RatingSource, string> = {
  internal: "Test interne Mnémo",
  user_report: "Retour utilisateur",
  vendor_doc: "Documentation vendor",
};

/** Affiche un score sur 5 en notation ★ pour les fiches solution. */
export function formatScore(score: number): string {
  const filled = "★".repeat(score);
  const empty = "☆".repeat(5 - score);
  return filled + empty;
}

const EUR_FMT = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * Formate un montant avec son unité.
 * Cas particuliers :
 * - `free` → "Gratuit"
 * - `contact` → "Sur devis"
 * - `self_host` → "Self-hosted (+ infra)" — le logiciel est gratuit, le coût
 *   éventuel saisi sur `base_price_eur` représente l'infra et est masqué ici
 *   pour ne pas le confondre avec un prix logiciel. L'infra est modélisée
 *   séparément via `infra_targets` et `brick_infra_targets`.
 */
export function formatPrice(
  amountEur: number,
  unit: string,
  pricingModel: PricingModel,
): string {
  if (pricingModel === "free") return "Gratuit";
  if (pricingModel === "contact") return "Sur devis";
  if (pricingModel === "self_host") return "Self-hosted (+ infra)";
  if (amountEur === 0) return `0 €/${unit}`;
  return `${EUR_FMT.format(amountEur)} / ${unit}`;
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** Date YYYY-MM-DD ISO → "23 mai 2026". Retourne "—" si null. */
export function formatCheckDate(iso: string | null): string {
  if (iso === null) return "—";
  return DATE_FMT.format(new Date(iso));
}
