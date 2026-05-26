import { describe, expect, it } from "vitest";
import { isAdminEmail } from "@/lib/auth/isAdmin";

describe("isAdminEmail", () => {
  const list = "erwan@example.com, chris@example.com,  amine@example.com  ";

  it("retourne false quand l'email est nul ou indéfini", () => {
    expect(isAdminEmail(null, list)).toBe(false);
    expect(isAdminEmail(undefined, list)).toBe(false);
  });

  it("retourne false quand l'email est vide ou n'est qu'espaces", () => {
    expect(isAdminEmail("", list)).toBe(false);
    expect(isAdminEmail("   ", list)).toBe(false);
  });

  it("retourne false quand la whitelist est nulle ou vide", () => {
    expect(isAdminEmail("erwan@example.com", null)).toBe(false);
    expect(isAdminEmail("erwan@example.com", undefined)).toBe(false);
    expect(isAdminEmail("erwan@example.com", "")).toBe(false);
    expect(isAdminEmail("erwan@example.com", "   ")).toBe(false);
  });

  it("retourne true sur un email présent dans la liste", () => {
    expect(isAdminEmail("erwan@example.com", list)).toBe(true);
    expect(isAdminEmail("chris@example.com", list)).toBe(true);
    expect(isAdminEmail("amine@example.com", list)).toBe(true);
  });

  it("ignore la casse de l'email et de la liste", () => {
    expect(isAdminEmail("ERWAN@example.COM", list)).toBe(true);
    expect(isAdminEmail("erwan@example.com", "ERWAN@EXAMPLE.COM")).toBe(true);
  });

  it("ignore les espaces autour des entrées de la liste", () => {
    expect(isAdminEmail("amine@example.com", list)).toBe(true);
  });

  it("retourne false sur un email qui n'est pas dans la liste", () => {
    expect(isAdminEmail("intrus@example.com", list)).toBe(false);
  });

  it("ne valide pas un sous-domaine ressemblant", () => {
    expect(isAdminEmail("erwan@example.co", "erwan@example.com")).toBe(false);
    expect(isAdminEmail("erwan@example.com.ev.il", "erwan@example.com")).toBe(false);
  });

  it("supporte une liste à un seul élément", () => {
    expect(isAdminEmail("jegouerwan@gmail.com", "jegouerwan@gmail.com")).toBe(true);
  });

  it("ne valide pas une entrée vide dans la liste", () => {
    expect(isAdminEmail("", "erwan@example.com, ,")).toBe(false);
  });
});
