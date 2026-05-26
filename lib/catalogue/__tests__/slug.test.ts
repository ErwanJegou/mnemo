import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "@/lib/catalogue/slug";

describe("slugify", () => {
  it("met en minuscules et remplace les espaces", () => {
    expect(slugify("Mistral AI")).toBe("mistral-ai");
  });

  it("retire les accents", () => {
    expect(slugify("École de Café")).toBe("ecole-de-cafe");
  });

  it("strippe les caractères spéciaux", () => {
    expect(slugify("Hello, World!!!")).toBe("hello-world");
  });

  it("compresse les tirets multiples et trim", () => {
    expect(slugify("  --- a  ---  b ---  ")).toBe("a-b");
  });

  it("retourne une chaîne vide sur une entrée vide", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("valide un slug propre", () => {
    expect(isValidSlug("mistral-ai")).toBe(true);
    expect(isValidSlug("c0-frontmatter-xavier-v1")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
  });

  it("refuse les bordures '-' et les doublons", () => {
    expect(isValidSlug("-foo")).toBe(false);
    expect(isValidSlug("foo-")).toBe(false);
    expect(isValidSlug("foo--bar")).toBe(false);
  });

  it("refuse les majuscules, espaces, caractères spéciaux", () => {
    expect(isValidSlug("Foo")).toBe(false);
    expect(isValidSlug("foo bar")).toBe(false);
    expect(isValidSlug("foo!bar")).toBe(false);
  });

  it("refuse la chaîne vide", () => {
    expect(isValidSlug("")).toBe(false);
  });
});
