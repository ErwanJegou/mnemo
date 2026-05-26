// Logique conditionnelle du wizard (matrice B de docs/wizard-refonte-matrix.html).
// Pure : pas de DOM, pas de stockage. Décide quels modules sont visibles
// pour un profil donné, et quel niveau proposer par défaut selon le preset.
//
// Règle : si un module n'est pas visible pour le profil courant, on force
// son niveau à 0 (cohérent moteur). Sinon, on propose le défaut du preset.

import type { ModuleId, Preset, Profile } from "@/lib/engine";
import { defaultModuleLevels } from "@/lib/engine";

const HIGH_VOLUME = ["10to100", "100to1000", "gt1000"] as const;
const HIGH_REQ = ["lt1k", "lt10k", "gt10k"] as const;
const HIGH_SENSITIVITY = ["confidential", "secret"] as const;

/**
 * Vrai si le module a un sens pour ce profil. Sinon, le wizard masque le slider
 * et le moteur reçoit le niveau 0 quoi qu'il arrive.
 */
export function isModuleVisible(moduleId: ModuleId, profile: Profile): boolean {
  switch (moduleId) {
    case "bisect":
      // Nécessite un historique des décisions — pas pertinent sans bitemporalité.
      return profile.bitemporal !== "no";
    case "reversal":
      // Audit demandé OU données sensibles → la traçabilité des corrections compte.
      return (
        profile.audit !== "no" ||
        (HIGH_SENSITIVITY as readonly Profile["sensitivity"][]).includes(profile.sensitivity)
      );
    case "prereg":
      // Méthode universelle anti-biais : toujours pertinente.
      return true;
    case "mel":
      // Plan de continuité utile à partir d'un certain volume / charge / sensibilité.
      return (
        (HIGH_VOLUME as readonly Profile["volume"][]).includes(profile.volume) ||
        (HIGH_REQ as readonly Profile["reqPerDay"][]).includes(profile.reqPerDay) ||
        (HIGH_SENSITIVITY as readonly Profile["sensitivity"][]).includes(profile.sensitivity)
      );
    case "conflict":
      // Multi-clients / multi-voix / cabinet régulé : risque de conflit d'intérêts.
      return (
        profile.activity === "cabinet-regule" ||
        profile.activity === "agence" ||
        profile.voices === "multi" ||
        profile.voices === "many"
      );
  }
}

/** Niveau recommandé pour un module donné, en fonction du preset retenu. */
export function recommendedModuleLevel(moduleId: ModuleId, preset: Preset): number {
  return defaultModuleLevels(preset)[moduleId];
}

/**
 * Aligne les niveaux de modules d'un profil avec la matrice :
 * - si le module n'est pas visible → niveau 0 ;
 * - sinon → on garde le niveau de l'utilisateur s'il existe, sinon le défaut du preset.
 */
export function reconcileModuleLevels(
  profile: Profile,
  preset: Preset,
): Record<ModuleId, number> {
  const defaults = defaultModuleLevels(preset);
  const out: Record<ModuleId, number> = { ...defaults };
  for (const id of Object.keys(out) as ModuleId[]) {
    if (!isModuleVisible(id, profile)) {
      out[id] = 0;
    } else if (profile.modules[id] > 0) {
      // L'utilisateur a déjà choisi un niveau explicite — on le respecte.
      out[id] = profile.modules[id];
    }
  }
  return out;
}
