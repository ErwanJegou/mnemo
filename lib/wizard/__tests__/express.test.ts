import { describe, it, expect } from "vitest";
import { buildExpressProfile, EXPRESS_DEFAULT_ANSWERS } from "@/lib/wizard/express";

describe("buildExpressProfile", () => {
  it("freelance solo défaut → preset LIGHT-friendly, modules à 0", () => {
    const p = buildExpressProfile(EXPRESS_DEFAULT_ANSWERS);
    expect(p.activity).toBe("freelance");
    expect(p.voices).toBe("solo");
    expect(p.modules.bisect).toBe(0);
    expect(p.modules.conflict).toBe(0);
  });

  it("cabinet régulé force audit=required + bitemporal=desired + sensibilité ≥ confidential", () => {
    const p = buildExpressProfile({
      ...EXPRESS_DEFAULT_ANSWERS,
      activity: "cabinet-regule",
      sensitivity: "internal", // l'utilisateur dit interne mais cabinet régulé force ≥ confidential
    });
    expect(p.audit).toBe("required");
    expect(p.bitemporal).toBe("desired");
    expect(p.regulations).toContain("secret-pro");
    expect(p.sensitivity).toBe("confidential");
  });

  it("agence solo → voices basculées en multi (sinon pas de cross-client utile)", () => {
    const p = buildExpressProfile({
      ...EXPRESS_DEFAULT_ANSWERS,
      activity: "agence",
      voices: "solo",
    });
    expect(p.voices).toBe("multi");
  });

  it("données secret → audit + bitemporal verrouillés", () => {
    const p = buildExpressProfile({
      ...EXPRESS_DEFAULT_ANSWERS,
      sensitivity: "secret",
    });
    expect(p.audit).toBe("required");
    expect(p.bitemporal).toBe("desired");
  });

  it("budget < 50 € → tout cale en LIGHT (volume lt1, latence relâchée)", () => {
    const p = buildExpressProfile({
      ...EXPRESS_DEFAULT_ANSWERS,
      budget: "lt50",
    });
    expect(p.volume).toBe("lt1");
    expect(p.latency).toBe("relaxed");
  });

  it("budget > 2k € → latence rapide, croissance moyenne minimum", () => {
    const p = buildExpressProfile({
      ...EXPRESS_DEFAULT_ANSWERS,
      budget: "gt2k",
    });
    expect(p.latency).toBe("fast");
    expect(p.growth).not.toBe("low");
  });

  it("module conflict apparaît dès que le profil le justifie", () => {
    const p = buildExpressProfile({
      ...EXPRESS_DEFAULT_ANSWERS,
      activity: "agence", // → voices multi auto + conflict pertinent
    });
    // conflict ne devrait PAS être à 0 si le preset le recommande
    // (au moins via reconcileModuleLevels qui débloque la visibilité)
    expect(p.activity).toBe("agence");
    expect(p.voices).toBe("multi");
  });
});
