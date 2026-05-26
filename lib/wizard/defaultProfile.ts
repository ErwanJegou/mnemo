import { defaultModuleLevels, type Profile } from "@/lib/engine";

export const STORAGE_KEY = "mnemo:profile:v1";

// Profil par défaut « neutre » : freelance non technique, données internes,
// pas d'historique des décisions ni de plan de continuité (modules à 0).
// L'utilisateur active activement ce dont il a besoin (matrice de refonte).
export const DEFAULT_PROFILE: Profile = {
  activity: "freelance",
  zone: "ue",
  users: 1,
  contentTypes: ["text"],
  volume: "1to10",
  growth: "low",
  regulations: ["rgpd"],
  sensitivity: "internal",
  audit: "no",
  bitemporal: "no",
  techLevel: "none",
  budget: "lt50",
  reqPerDay: "lt100",
  latency: "acceptable",
  voices: "solo",
  modules: defaultModuleLevels("LIGHT"),
};
