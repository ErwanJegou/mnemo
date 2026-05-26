import type { Preset, Profile } from "./types";

export type PresetDecision = { preset: Preset; reason: string };

/**
 * Décide le preset (LIGHT/MEDIUM/HARD) à partir du profil. Fonction pure.
 * La raison liste les conditions effectivement déclenchées par le profil
 * (et non un bloc générique couvrant toutes les conditions possibles).
 */
export function decidePreset(p: Profile): PresetDecision {
  const hardTriggers: string[] = [];
  if (p.sensitivity === "secret") hardTriggers.push("sensibilité « secret »");
  if (p.activity === "cabinet-regule") hardTriggers.push("activité = cabinet régulé");
  if (p.regulations.includes("hipaa")) hardTriggers.push("HIPAA");
  if (p.regulations.includes("secret-pro")) hardTriggers.push("secret professionnel");
  if (p.audit === "required" && p.bitemporal === "required") {
    hardTriggers.push("audit + historique des décisions obligatoires");
  }

  if (hardTriggers.length > 0) {
    return {
      preset: "HARD",
      reason: `Déclencheur${hardTriggers.length > 1 ? "s" : ""} HARD : ${hardTriggers.join(
        ", ",
      )} → souveraineté maximale, on-prem privilégié, isolation forte.`,
    };
  }

  const fitsLight =
    (p.sensitivity === "public" || (p.sensitivity === "confidential" && p.users <= 1)) &&
    p.audit !== "required" &&
    p.bitemporal !== "required" &&
    (p.budget === "lt50" || (p.budget === "50to200" && p.users <= 1)) &&
    (p.volume === "lt1" || p.volume === "1to10");

  if (fitsLight) {
    const lightReasons: string[] = [];
    if (p.sensitivity === "public") lightReasons.push("données publiques");
    else lightReasons.push("solo + confidentiel toléré");
    if (p.budget === "lt50") lightReasons.push("budget < 50 €");
    else lightReasons.push("budget modéré + 1 utilisateur");
    lightReasons.push(`volume ${p.volume === "lt1" ? "< 1 Go" : "1–10 Go"}`);

    return {
      preset: "LIGHT",
      reason: `${lightReasons.join(", ")} → stack simplifiée API-first qui démarre en quelques heures.`,
    };
  }

  // MEDIUM : cas par défaut. On précise les raisons qui empêchent LIGHT.
  const whyNotLight: string[] = [];
  if (p.sensitivity === "internal" || p.sensitivity === "confidential") {
    whyNotLight.push(
      `sensibilité ${p.sensitivity === "internal" ? "interne" : "confidentielle"}`,
    );
  }
  if (p.audit === "required") whyNotLight.push("audit obligatoire");
  if (p.bitemporal === "required") whyNotLight.push("historique des décisions obligatoire");
  if (p.volume !== "lt1" && p.volume !== "1to10") {
    const vol = p.volume === "10to100" ? "10 – 100 Go" : p.volume === "100to1000" ? "100 Go – 1 To" : "> 1 To";
    whyNotLight.push(`volume ${vol}`);
  }
  if (p.users > 1) whyNotLight.push(`${p.users} utilisateurs`);

  const why = whyNotLight.length > 0 ? ` (${whyNotLight.join(", ")})` : "";
  return {
    preset: "MEDIUM",
    reason: `Profil intermédiaire${why} : balance entre souveraineté (hébergement contrôlé) et pragmatisme (cascade API + self-host). Sweet spot freelance / PME / agence.`,
  };
}
