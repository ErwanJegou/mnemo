import { describe, it, expect } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/wizard/defaultProfile";
import {
  isModuleVisible,
  recommendedModuleLevel,
  reconcileModuleLevels,
} from "@/lib/wizard/conditions";
import type { Profile } from "@/lib/engine";

const base = (overrides: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, ...overrides });

describe("isModuleVisible", () => {
  it("masque bisect quand bitemporal=no", () => {
    expect(isModuleVisible("bisect", base({ bitemporal: "no" }))).toBe(false);
  });

  it("affiche bisect dès que bitemporal=desired", () => {
    expect(isModuleVisible("bisect", base({ bitemporal: "desired" }))).toBe(true);
  });

  it("affiche reversal dès que audit=desired", () => {
    expect(isModuleVisible("reversal", base({ audit: "desired" }))).toBe(true);
  });

  it("affiche reversal pour données sensibles même sans audit", () => {
    expect(isModuleVisible("reversal", base({ audit: "no", sensitivity: "confidential" }))).toBe(true);
  });

  it("garde prereg toujours visible", () => {
    expect(isModuleVisible("prereg", base())).toBe(true);
    expect(isModuleVisible("prereg", base({ activity: "particulier" }))).toBe(true);
  });

  it("masque mel pour petite échelle non sensible", () => {
    expect(isModuleVisible("mel", base({ volume: "lt1", reqPerDay: "lt100", sensitivity: "internal" }))).toBe(false);
  });

  it("affiche mel dès qu'on dépasse 10 Go", () => {
    expect(isModuleVisible("mel", base({ volume: "10to100" }))).toBe(true);
  });

  it("affiche conflict pour cabinet régulé", () => {
    expect(isModuleVisible("conflict", base({ activity: "cabinet-regule" }))).toBe(true);
  });

  it("affiche conflict pour multi-contributeurs", () => {
    expect(isModuleVisible("conflict", base({ activity: "freelance", voices: "multi" }))).toBe(true);
  });

  it("masque conflict pour freelance solo non régulé", () => {
    expect(isModuleVisible("conflict", base({ activity: "freelance", voices: "solo" }))).toBe(false);
  });
});

describe("recommendedModuleLevel", () => {
  it("retourne 0 pour LIGHT sur tous les modules", () => {
    expect(recommendedModuleLevel("bisect", "LIGHT")).toBe(0);
    expect(recommendedModuleLevel("reversal", "LIGHT")).toBe(0);
    expect(recommendedModuleLevel("mel", "LIGHT")).toBe(0);
  });

  it("monte les modules sur HARD", () => {
    expect(recommendedModuleLevel("reversal", "HARD")).toBe(3);
    expect(recommendedModuleLevel("bisect", "HARD")).toBeGreaterThanOrEqual(2);
  });
});

describe("reconcileModuleLevels", () => {
  it("force à 0 les modules invisibles", () => {
    const profile = base({
      bitemporal: "no", // bisect masqué
      audit: "no",
      sensitivity: "internal", // reversal masqué
      volume: "lt1",
      reqPerDay: "lt100", // mel masqué
      voices: "solo",
      activity: "freelance", // conflict masqué
      modules: { bisect: 3, reversal: 3, prereg: 3, mel: 4, conflict: 4 },
    });
    const result = reconcileModuleLevels(profile, "HARD");
    expect(result.bisect).toBe(0);
    expect(result.reversal).toBe(0);
    expect(result.mel).toBe(0);
    expect(result.conflict).toBe(0);
    expect(result.prereg).toBeGreaterThan(0); // toujours visible
  });

  it("respecte le choix utilisateur quand le module est visible", () => {
    const profile = base({
      bitemporal: "required",
      modules: { bisect: 2, reversal: 0, prereg: 0, mel: 0, conflict: 0 },
    });
    const result = reconcileModuleLevels(profile, "LIGHT");
    expect(result.bisect).toBe(2); // utilisateur a choisi 2, on respecte
  });
});
