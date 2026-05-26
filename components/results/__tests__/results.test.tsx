import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsView } from "@/components/results/ResultsView";

describe("ResultsView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("affiche le preset et la carte de coûts pour le profil par défaut", async () => {
    render(<ResultsView />);
    // Nouveau profil par défaut (freelance solo, données internes) → MEDIUM
    // (sweet spot freelance/PME/agence selon decidePreset).
    expect(await screen.findByText("Preset : MEDIUM")).toBeInTheDocument();
    expect(screen.getByText("Carte de coûts")).toBeInTheDocument();
    expect(screen.getByText("Stack recommandée")).toBeInTheDocument();
  });
});
