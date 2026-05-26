// Mode Express — 5 questions essentielles + défauts intelligents hérités.
// Le reste des 16 paramètres du Profile est déduit par une cascade de règles
// (matrice D de docs/wizard-refonte-matrix.html). Toujours pur, testable.

import {
  decidePreset,
  defaultModuleLevels,
  type Activity,
  type Budget,
  type Profile,
  type Sensitivity,
  type TechLevel,
  type Voices,
} from "@/lib/engine";
import { DEFAULT_PROFILE } from "./defaultProfile";
import { reconcileModuleLevels } from "./conditions";

export type ExpressAnswers = {
  activity: Activity;
  voices: Voices;
  sensitivity: Sensitivity;
  budget: Budget;
  techLevel: TechLevel;
};

export const EXPRESS_DEFAULT_ANSWERS: ExpressAnswers = {
  activity: "freelance",
  voices: "solo",
  sensitivity: "internal",
  budget: "50to200",
  techLevel: "none",
};

/**
 * Cascade de défauts : activité → réglementations + audit, sensibilité → audit,
 * budget → latence/volume, niveau technique → charge. Les réponses Express
 * prennent toujours le dessus ; les défauts ne comblent que les champs non
 * adressés par l'utilisateur.
 */
export function buildExpressProfile(answers: ExpressAnswers): Profile {
  const base: Profile = { ...DEFAULT_PROFILE };

  // Réponses Express (5 questions explicites)
  base.activity = answers.activity;
  base.voices = answers.voices;
  base.sensitivity = answers.sensitivity;
  base.budget = answers.budget;
  base.techLevel = answers.techLevel;

  // ─── Défauts dérivés de l'activité ─────────────────────────────────────
  switch (answers.activity) {
    case "cabinet-regule":
      base.zone = "ue";
      base.audit = "required";
      base.bitemporal = "desired";
      base.regulations = ["rgpd", "secret-pro"];
      // Un cabinet régulé travaille toujours au moins en confidentiel.
      if (answers.sensitivity === "public" || answers.sensitivity === "internal") {
        base.sensitivity = "confidential";
      }
      break;
    case "agence":
      base.regulations = ["rgpd"];
      // Une agence avec un seul intervenant pour plusieurs clients est rare ;
      // on bascule en multi-voix pour faire apparaître la détection de conflits.
      if (answers.voices === "solo") base.voices = "multi";
      break;
    case "recherche":
      base.audit = "desired";
      base.bitemporal = "desired";
      break;
    case "particulier":
      base.regulations = ["none"];
      base.zone = "ue";
      break;
    case "pme-startup":
      base.volume = "10to100";
      base.growth = "medium";
      break;
    case "freelance":
    case "other":
      // On reste sur le profil neutre de DEFAULT_PROFILE.
      break;
  }

  // ─── Défauts dérivés de la sensibilité ─────────────────────────────────
  if (answers.sensitivity === "confidential" && base.audit === "no") {
    base.audit = "desired";
  } else if (answers.sensitivity === "secret") {
    base.audit = "required";
    if (base.bitemporal === "no") base.bitemporal = "desired";
  }

  // ─── Défauts dérivés du budget ────────────────────────────────────────
  switch (answers.budget) {
    case "lt50":
      base.volume = "lt1";
      base.latency = "relaxed";
      base.reqPerDay = "lt100";
      break;
    case "500to2k":
    case "gt2k":
      base.latency = "fast";
      if (base.growth === "low") base.growth = "medium";
      break;
    case "50to200":
    case "200to500":
      // Défauts moyens — on ne touche pas, le profil reste cohérent.
      break;
  }

  // ─── Défauts dérivés du niveau technique ──────────────────────────────
  switch (answers.techLevel) {
    case "none":
      base.reqPerDay = "lt100";
      break;
    case "devops":
      if (base.reqPerDay === "lt100") base.reqPerDay = "lt1k";
      break;
    case "dev":
    case "hybrid":
      // Pas de surcharge.
      break;
  }

  // ─── Niveaux de modules : preset retenu + filtre conditionnel ─────────
  const presetDecision = decidePreset(base);
  base.modules = defaultModuleLevels(presetDecision.preset);
  base.modules = reconcileModuleLevels(base, presetDecision.preset);

  return base;
}
