import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wizard } from "@/components/wizard/Wizard";

describe("Wizard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("affiche le mode Express par défaut avec les 5 questions", async () => {
    render(<Wizard />);
    expect(await screen.findByText("5 questions pour démarrer")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Express/u })).toHaveAttribute("aria-selected", "true");
  });

  it("propose les profils-types pré-remplis", async () => {
    render(<Wizard />);
    await screen.findByText("5 questions pour démarrer");
    expect(screen.getByRole("button", { name: "Coach indépendant" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cabinet juridique régulé" })).toBeInTheDocument();
  });
});
