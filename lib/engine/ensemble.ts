// Ensemble multi-configuration (F5).
// Analogie : prévision météo d'ensemble — on ne lance pas un seul modèle, mais
// plusieurs, et la DISPERSION de leurs sorties (le « spread ») mesure l'incertitude.
// Ici chaque « membre » de l'ensemble est le profil utilisateur biaisé vers une
// priorité différente (souveraineté / coût / délai). On passe chaque membre dans
// le moteur déterministe `recommend()` et on quantifie l'écart résultant.

import { MODULES, defaultModuleLevels } from "./modules";
import { recommend } from "./recommend";
import {
  PRESETS,
  type ModuleId,
  type Preset,
  type Profile,
  type Recommendation,
  type Sensitivity,
  type Budget,
} from "./types";

export const ENSEMBLE_VARIANT_IDS = ["sovereignty", "cost", "speed"] as const;
export type EnsembleVariantId = (typeof ENSEMBLE_VARIANT_IDS)[number];

export type EnsembleVariant = {
  id: EnsembleVariantId;
  label: string;
  /** Objectif poursuivi par ce membre de l'ensemble. */
  intent: string;
  /** Hypothèses appliquées au profil, en clair (transparence des overrides). */
  assumptions: string[];
  profile: Profile;
  recommendation: Recommendation;
};

/** Niveau d'accord de l'ensemble (inverse de la dispersion). */
export type EnsembleAgreement = "fort" | "modéré" | "faible";

export type EnsembleSpread = {
  count: number;
  costMin: number;
  costMax: number;
  costRange: number;
  /** Amplitude de coût rapportée au minimum, en %. */
  costRangePct: number;
  scoreMin: number;
  scoreMax: number;
  scoreRange: number;
  /** Presets distincts couverts par l'ensemble (ordre LIGHT→MEDIUM→HARD). */
  presetsSpan: Preset[];
  agreement: EnsembleAgreement;
  /** Libellé d'incertitude explicite, prêt à afficher. */
  uncertaintyLabel: string;
};

export type Ensemble = {
  /** Recommandation du profil tel quel (membre de référence). */
  baseline: Recommendation;
  variants: EnsembleVariant[];
  spread: EnsembleSpread;
};

const VARIANT_META: Record<EnsembleVariantId, { label: string; intent: string }> = {
  sovereignty: {
    label: "Souveraineté maximale",
    intent: "Verrouille la souveraineté et la gouvernance au maximum ; coût et délai passent au second plan.",
  },
  cost: {
    label: "Coût minimal",
    intent: "Comprime le coût mensuel : budget serré, options de gouvernance et modules désactivés.",
  },
  speed: {
    label: "Time-to-V1 minimal",
    intent: "Démarre le plus vite possible : stack légère, compétences DevOps, zéro module bloquant.",
  },
};

/** Construit un jeu de niveaux de modules tout au maximum ou tout désactivé. */
function modulesAt(target: "max" | "off"): Record<ModuleId, number> {
  const levels = defaultModuleLevels();
  for (const mod of MODULES) {
    levels[mod.id] = target === "max" ? mod.maxLevel : 0;
  }
  return levels;
}

/** Applique les overrides d'un membre de l'ensemble au profil de base. */
function applyVariant(id: EnsembleVariantId, base: Profile): Profile {
  switch (id) {
    case "sovereignty":
      return {
        ...base,
        zone: base.zone === "maroc" ? "maroc" : "ue",
        sensitivity: "secret",
        audit: "required",
        bitemporal: "required",
        modules: modulesAt("max"),
      };
    case "cost":
      return {
        ...base,
        budget: "lt50",
        audit: "no",
        bitemporal: "no",
        modules: modulesAt("off"),
      };
    case "speed":
      return {
        ...base,
        techLevel: "devops",
        audit: "no",
        bitemporal: "no",
        budget: "lt50",
        modules: modulesAt("off"),
      };
  }
}

const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  public: "publique",
  internal: "interne",
  confidential: "confidentielle",
  secret: "secret",
};

const BUDGET_LABEL: Record<Budget, string> = {
  lt50: "< 50 €/mois",
  "50to200": "50 – 200 €/mois",
  "200to500": "200 – 500 €/mois",
  "500to2k": "500 – 2 000 €/mois",
  gt2k: "> 2 000 €/mois",
};

/**
 * Décrit les changements réellement appliqués au profil de base. Si l'utilisateur
 * était déjà aligné sur la priorité du variant (ex. budget déjà < 50 € pour le
 * variant « coût »), la liste est plus courte — voire vide → fallback explicite.
 */
function describeVariantChanges(base: Profile, variant: Profile): string[] {
  const out: string[] = [];

  if (base.zone !== variant.zone) {
    const zoneLabel =
      variant.zone === "ue"
        ? "Union européenne"
        : variant.zone === "maroc"
          ? "Maroc"
          : variant.zone === "us"
            ? "États-Unis"
            : "autre zone";
    out.push(`Hébergement forcé en ${zoneLabel}`);
  }

  if (base.sensitivity !== variant.sensitivity) {
    out.push(
      `Sensibilité ${SENSITIVITY_LABEL[base.sensitivity]} → ${SENSITIVITY_LABEL[variant.sensitivity]}`,
    );
  }

  if (base.audit !== variant.audit) {
    if (variant.audit === "required") out.push("Audit rendu obligatoire");
    else if (variant.audit === "no") out.push("Audit désactivé");
    else out.push("Audit ramené à « souhaité »");
  }

  if (base.bitemporal !== variant.bitemporal) {
    if (variant.bitemporal === "required") out.push("Historique des décisions rendu obligatoire");
    else if (variant.bitemporal === "no") out.push("Historique des décisions désactivé");
    else out.push("Historique des décisions ramené à « souhaité »");
  }

  if (base.budget !== variant.budget) {
    out.push(`Budget ${BUDGET_LABEL[base.budget]} → ${BUDGET_LABEL[variant.budget]}`);
  }

  if (base.techLevel !== variant.techLevel) {
    if (variant.techLevel === "devops") out.push("Compétences DevOps assumées disponibles");
    else if (variant.techLevel === "none") out.push("Compétences techniques retirées");
    else out.push(`Niveau technique ajusté en « ${variant.techLevel} »`);
  }

  const moduleDiff = countModuleDiff(base.modules, variant.modules);
  if (moduleDiff.maxed > 0) {
    const s = moduleDiff.maxed > 1 ? "s" : "";
    out.push(`${moduleDiff.maxed} option${s} avancée${s} poussée${s} au maximum`);
  }
  if (moduleDiff.turnedOff > 0) {
    const s = moduleDiff.turnedOff > 1 ? "s" : "";
    out.push(`${moduleDiff.turnedOff} option${s} avancée${s} désactivée${s}`);
  }

  if (out.length === 0) {
    out.push("Aucun changement — votre profil est déjà aligné sur cette priorité.");
  }

  return out;
}

function countModuleDiff(
  base: Record<ModuleId, number>,
  variant: Record<ModuleId, number>,
): { maxed: number; turnedOff: number } {
  let maxed = 0;
  let turnedOff = 0;
  for (const mod of MODULES) {
    const b = base[mod.id];
    const v = variant[mod.id];
    if (b === v) continue;
    if (v >= mod.maxLevel && b < mod.maxLevel) maxed += 1;
    if (v === 0 && b > 0) turnedOff += 1;
  }
  return { maxed, turnedOff };
}

function buildVariant(id: EnsembleVariantId, base: Profile): EnsembleVariant {
  const meta = VARIANT_META[id];
  const profile = applyVariant(id, base);
  const assumptions = describeVariantChanges(base, profile);
  return {
    id,
    label: meta.label,
    intent: meta.intent,
    assumptions,
    profile,
    recommendation: recommend(profile),
  };
}

function describeUncertainty(
  count: number,
  costMin: number,
  costMax: number,
  costRange: number,
  costRangePct: number,
  scoreMin: number,
  scoreMax: number,
  agreement: EnsembleAgreement,
): string {
  const head =
    `Les ${count} configurations s'étalent de ${costMin} à ${costMax} €/mois ` +
    `(écart ${costRange} €, soit ${costRangePct} %) et de ${scoreMin} à ${scoreMax}/10 de score global. ` +
    `Accord de l'ensemble : ${agreement}. `;
  const tail =
    agreement === "fort"
      ? "Les membres convergent : la recommandation est robuste et peu sensible aux arbitrages."
      : agreement === "modéré"
        ? "Un arbitrage souveraineté / coût / délai reste à trancher selon votre priorité."
        : "Forte divergence : la décision dépend fortement de la priorité retenue — tranchez explicitement souveraineté vs coût vs délai.";
  return head + tail;
}

function computeSpread(recommendations: Recommendation[]): EnsembleSpread {
  const costs = recommendations.map((r) => r.totalCost);
  const scores = recommendations.map((r) => r.scoreAvg);

  const costMin = Math.min(...costs);
  const costMax = Math.max(...costs);
  const costRange = costMax - costMin;
  const costRangePct = costMin > 0 ? Math.round((costRange / costMin) * 100) : 0;

  const scoreMin = Math.min(...scores);
  const scoreMax = Math.max(...scores);
  const scoreRange = Math.round((scoreMax - scoreMin) * 10) / 10;

  const presetsSpan = PRESETS.filter((p) => recommendations.some((r) => r.preset === p));

  const agreement: EnsembleAgreement =
    costRangePct <= 30 && scoreRange <= 1
      ? "fort"
      : costRangePct >= 120 || scoreRange >= 2.5
        ? "faible"
        : "modéré";

  return {
    count: recommendations.length,
    costMin,
    costMax,
    costRange,
    costRangePct,
    scoreMin,
    scoreMax,
    scoreRange,
    presetsSpan,
    agreement,
    uncertaintyLabel: describeUncertainty(
      recommendations.length,
      costMin,
      costMax,
      costRange,
      costRangePct,
      scoreMin,
      scoreMax,
      agreement,
    ),
  };
}

/**
 * Construit l'ensemble multi-configuration : la recommandation de référence + un
 * membre par priorité (souveraineté / coût / délai), et la dispersion résultante
 * (le « spread » = l'incertitude). Fonction pure et déterministe.
 */
export function buildEnsemble(profile: Profile): Ensemble {
  const baseline = recommend(profile);
  const variants = ENSEMBLE_VARIANT_IDS.map((id) => buildVariant(id, profile));
  const spread = computeSpread([baseline, ...variants.map((v) => v.recommendation)]);
  return { baseline, variants, spread };
}
