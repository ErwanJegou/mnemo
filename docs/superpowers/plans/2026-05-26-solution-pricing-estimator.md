# Solution Pricing Estimator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le `total_price_estimate_eur` saisi à la main par un calcul agrégé honnête : (1) chaque solution déclare ses hypothèses de volume en BDD, (2) un moteur pur agrège les coûts des briques recommandées en parcourant pricing_model + ratings, (3) la page solution affiche des sliders de volume qui recalculent le total en direct.

**Architecture :**
- Migration Supabase ajoute `solutions.volume_assumptions jsonb` + seed pour les 4 solutions existantes.
- Moteur d'agrégation pur dans `lib/pricing/estimateSolution.ts` (input = solution + steps + bricks + ratings + volumes ; output = total + détail par ligne avec mention "+ infra à prévoir" pour le self_host).
- Page `/solutions/[slug]` : un Server Component fait le fetch puis hydrate un Client Component `SolutionEstimator` qui contient les sliders et appelle le moteur pur côté client à chaque changement.
- Home `/` : utilise l'estimation calculée avec les volumes par défaut de la solution (cohérence avec la page détail).

**Tech Stack :** Next.js 15 App Router, React 19, TypeScript strict, Supabase (Postgres + RLS), Tailwind v3, Vitest, fonctions pures testables.

**Conventions du dépôt (extraites de `CLAUDE.md`) :**
- Pas de `any`, `as`, `!`
- TypeScript `strict`, return types sur fonctions exportées
- Code anglais, UI/commentaires/commits FR, accents sur majuscules
- Avant marquer fini : `npm run typecheck` (0), `npm run lint` (0), `npm test` (vert), `npm run build` (OK)
- RLS activée sur toutes les tables Supabase

---

## File Structure

**Nouveaux fichiers :**
- `supabase/migrations/20260526120000_solutions_volume_assumptions.sql` — ajoute la colonne + seed les 4 solutions
- `lib/pricing/estimateSolution.ts` — moteur pur d'agrégation
- `lib/pricing/__tests__/estimateSolution.test.ts` — tests Vitest
- `lib/pricing/volumeUnits.ts` — convention de nommage des clés de volume + libellés FR
- `lib/pricing/__tests__/volumeUnits.test.ts` — tests Vitest
- `components/solutions/SolutionEstimator.tsx` — Client Component (sliders + total live)
- `components/solutions/__tests__/SolutionEstimator.test.tsx` — tests RTL
- `lib/catalogue/__tests__/solutionForm.test.ts` — couvrir le nouveau parsing

**Fichiers modifiés :**
- `lib/supabase/types.ts` — ajouter `volume_assumptions: Record<string, number>` à `SolutionRow`
- `lib/catalogue/solutionForm.ts` — parser le champ `volume_assumptions` (JSON dans textarea)
- `components/admin/SolutionForm.tsx` — ajouter textarea "Hypothèses de volume"
- `app/solutions/[slug]/page.tsx` — passer données au nouveau Client Component, supprimer affichage statique du prix
- `app/page.tsx` — calculer l'estimation par défaut par solution au lieu de lire `total_price_estimate_eur`

**Hors scope (à traiter dans un futur plan) :**
- Coût d'infra séparé pour les briques `self_host` (on affiche juste "+ infra à prévoir")
- Sauvegarde des volumes choisis dans `configurations`
- Calcul agrégé sur les alternatives (uniquement la brique recommandée pour ce lot)

---

## Convention de nommage des clés de volume

Pour qu'un rating `cost_unit = "image"` se mappe à une hypothèse de volume, on adopte une convention stricte :

| `cost_unit` (rating ou brique) | Clé dans `volume_assumptions` | Libellé FR |
|---|---|---|
| `image` | `image_per_month` | Images par mois |
| `page` | `page_per_month` | Pages par mois |
| `minute` | `minute_per_month` | Minutes (audio) par mois |
| `1k_tokens` | `1k_tokens_per_month` | Milliers de tokens par mois |
| `mois` | _(pas de volume — coût fixe)_ | — |
| `année` | _(pas de volume — coût fixe)_ | — |
| `requête` | `requete_per_month` | Requêtes par mois |

**Règle** : si `cost_unit ∈ {mois, année}`, on considère que c'est un forfait fixe (volume ignoré). Sinon, on cherche la clé `<cost_unit>_per_month` dans `volume_assumptions`. Si absente, on tombe sur 0 avec un flag `missing_volume`.

---

## Task 1: Migration BDD — ajouter `volume_assumptions`

**Files:**
- Create: `supabase/migrations/20260526120000_solutions_volume_assumptions.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Ajoute volume_assumptions aux solutions pour permettre un calcul de prix
-- agrégé honnête (au lieu d'une valeur figée saisie à la main).
-- Clé = "<cost_unit>_per_month", valeur = nombre. Voir lib/pricing/volumeUnits.ts.

alter table public.solutions
  add column volume_assumptions jsonb not null default '{}'::jsonb;

comment on column public.solutions.volume_assumptions is
  'Hypothèses de volume pour le calcul de prix. Ex: {"image_per_month": 1000}. Voir lib/pricing/volumeUnits.ts.';

-- Seed des 4 solutions existantes
update public.solutions set volume_assumptions = '{"image_per_month": 1000}'::jsonb
  where slug = 'memo-image';

update public.solutions set volume_assumptions = '{"page_per_month": 500}'::jsonb
  where slug = 'memo-pdf';

update public.solutions set volume_assumptions = '{"minute_per_month": 240}'::jsonb
  where slug = 'memo-meeting';

update public.solutions set volume_assumptions = '{"requete_per_month": 1000}'::jsonb
  where slug = 'search-base';
```

- [ ] **Step 2 : Appliquer la migration en local**

Run: `npx supabase db reset` (réapplique tout depuis zéro, sûr en dev)
Expected: la commande termine sans erreur, les 4 `update` affichent `UPDATE 1` chacun

Vérifier :

```bash
npx supabase db query "select slug, volume_assumptions from public.solutions order by slug;"
```

Expected output (4 lignes) :
- `memo-image` → `{"image_per_month": 1000}`
- `memo-meeting` → `{"minute_per_month": 240}`
- `memo-pdf` → `{"page_per_month": 500}`
- `search-base` → `{"requete_per_month": 1000}`

- [ ] **Step 3 : Pousser sur Supabase cloud**

Run: `npx supabase db push` (le `SUPABASE_ACCESS_TOKEN` doit être dans l'env via direnv)
Expected: "Applying migration 20260526120000_solutions_volume_assumptions.sql..."

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260526120000_solutions_volume_assumptions.sql
git commit -m "feat(db): ajouter solutions.volume_assumptions pour calcul de prix agrégé"
```

---

## Task 2: Type TypeScript pour `volume_assumptions`

**Files:**
- Modify: `lib/supabase/types.ts:193-208` (`SolutionRow`)

- [ ] **Step 1 : Ajouter le champ au type**

Localiser le bloc `export type SolutionRow = {` (vers ligne 193) et ajouter `volume_assumptions` juste après `total_price_estimate_eur` :

```ts
export type SolutionRow = {
  id: string;
  slug: string;
  title: string;
  problem_statement: string;
  audience: string | null;
  complexity: SolutionComplexity;
  total_price_estimate_eur: number | null;
  volume_assumptions: Record<string, number>;
  estimated_setup_minutes: number | null;
  status: ComponentStatus;
  hero_emoji: string | null;
  hero_color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2 : Vérifier le typecheck**

Run: `npm run typecheck`
Expected: 0 erreur (le type est cohérent avec la migration, aucune utilisation existante ne casse car le champ est nouveau)

- [ ] **Step 3 : Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(types): ajouter SolutionRow.volume_assumptions"
```

---

## Task 3: Convention de nommage `volumeUnits.ts`

**Files:**
- Create: `lib/pricing/volumeUnits.ts`
- Test: `lib/pricing/__tests__/volumeUnits.test.ts`

- [ ] **Step 1 : Écrire les tests**

```ts
// lib/pricing/__tests__/volumeUnits.test.ts
import { describe, expect, it } from "vitest";
import {
  isFixedCostUnit,
  volumeKeyForCostUnit,
  VOLUME_UNIT_LABELS,
  VOLUME_UNIT_SLIDER_BOUNDS,
} from "@/lib/pricing/volumeUnits";

describe("isFixedCostUnit", () => {
  it("retourne true pour mois", () => {
    expect(isFixedCostUnit("mois")).toBe(true);
  });
  it("retourne true pour année", () => {
    expect(isFixedCostUnit("année")).toBe(true);
  });
  it("retourne false pour image", () => {
    expect(isFixedCostUnit("image")).toBe(false);
  });
  it("retourne false pour page", () => {
    expect(isFixedCostUnit("page")).toBe(false);
  });
});

describe("volumeKeyForCostUnit", () => {
  it("mappe image vers image_per_month", () => {
    expect(volumeKeyForCostUnit("image")).toBe("image_per_month");
  });
  it("mappe page vers page_per_month", () => {
    expect(volumeKeyForCostUnit("page")).toBe("page_per_month");
  });
  it("mappe minute vers minute_per_month", () => {
    expect(volumeKeyForCostUnit("minute")).toBe("minute_per_month");
  });
  it("mappe 1k_tokens vers 1k_tokens_per_month", () => {
    expect(volumeKeyForCostUnit("1k_tokens")).toBe("1k_tokens_per_month");
  });
  it("normalise requête en requete_per_month (sans accent)", () => {
    expect(volumeKeyForCostUnit("requête")).toBe("requete_per_month");
  });
  it("retourne null pour les unités fixes", () => {
    expect(volumeKeyForCostUnit("mois")).toBeNull();
  });
});

describe("VOLUME_UNIT_LABELS", () => {
  it("a un libellé FR pour image_per_month", () => {
    expect(VOLUME_UNIT_LABELS.image_per_month).toBe("Images par mois");
  });
  it("a un libellé FR pour page_per_month", () => {
    expect(VOLUME_UNIT_LABELS.page_per_month).toBe("Pages par mois");
  });
});

describe("VOLUME_UNIT_SLIDER_BOUNDS", () => {
  it("définit des bornes pour image_per_month", () => {
    const b = VOLUME_UNIT_SLIDER_BOUNDS.image_per_month;
    expect(b.min).toBe(10);
    expect(b.max).toBe(100000);
    expect(b.step).toBe(10);
  });
});
```

- [ ] **Step 2 : Faire échouer les tests**

Run: `npx vitest run lib/pricing/__tests__/volumeUnits.test.ts`
Expected: FAIL avec "Cannot find module '@/lib/pricing/volumeUnits'"

- [ ] **Step 3 : Implémenter `volumeUnits.ts`**

```ts
// lib/pricing/volumeUnits.ts
// Convention de nommage des hypothèses de volume pour le calcul de prix.
// Voir docs/superpowers/plans/2026-05-26-solution-pricing-estimator.md.

const FIXED_COST_UNITS = new Set<string>(["mois", "année", "year", "month"]);

/** Une unité est dite "fixe" quand elle représente un forfait, pas un volume. */
export function isFixedCostUnit(costUnit: string): boolean {
  return FIXED_COST_UNITS.has(costUnit.trim().toLowerCase());
}

/**
 * Normalise une unité de coût (cost_unit d'un rating ou unit d'une brique)
 * vers une clé d'hypothèse de volume. Retourne null si l'unité est fixe.
 *
 * Convention : on retire les accents (NFD + suppression des diacritiques)
 * et on ajoute le suffixe `_per_month`.
 */
export function volumeKeyForCostUnit(costUnit: string): string | null {
  if (isFixedCostUnit(costUnit)) return null;
  const normalized = costUnit
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return `${normalized}_per_month`;
}

/** Libellés FR pour les clés de volume connues (UI sliders). */
export const VOLUME_UNIT_LABELS: Record<string, string> = {
  image_per_month: "Images par mois",
  page_per_month: "Pages par mois",
  minute_per_month: "Minutes (audio) par mois",
  "1k_tokens_per_month": "Milliers de tokens par mois",
  requete_per_month: "Requêtes par mois",
};

type SliderBounds = { min: number; max: number; step: number };

/** Bornes du slider pour chaque clé de volume connue. */
export const VOLUME_UNIT_SLIDER_BOUNDS: Record<string, SliderBounds> = {
  image_per_month: { min: 10, max: 100000, step: 10 },
  page_per_month: { min: 10, max: 50000, step: 10 },
  minute_per_month: { min: 30, max: 6000, step: 30 },
  "1k_tokens_per_month": { min: 10, max: 100000, step: 10 },
  requete_per_month: { min: 10, max: 100000, step: 10 },
};
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run: `npx vitest run lib/pricing/__tests__/volumeUnits.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/pricing/volumeUnits.ts lib/pricing/__tests__/volumeUnits.test.ts
git commit -m "feat(pricing): ajouter convention de nommage des unités de volume"
```

---

## Task 4: Moteur d'agrégation `estimateSolution.ts`

**Files:**
- Create: `lib/pricing/estimateSolution.ts`
- Test: `lib/pricing/__tests__/estimateSolution.test.ts`

- [ ] **Step 1 : Écrire les tests (cas isolés)**

```ts
// lib/pricing/__tests__/estimateSolution.test.ts
import { describe, expect, it } from "vitest";
import { estimateSolution } from "@/lib/pricing/estimateSolution";
import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";

// --- Helpers de factory ---

function brick(over: Partial<ComponentRow>): ComponentRow {
  return {
    id: "b-fixed-id",
    vendor_id: "v-1",
    layer_id: 0,
    category_id: null,
    slug: "b",
    name: "Brique X",
    tier: null,
    description: null,
    pricing_model: "flat",
    base_price_eur: 0,
    unit: "mois",
    pricing_url: null,
    preset_fit: [],
    capabilities: {},
    source_url: null,
    last_checked_at: null,
    confidence: "medium",
    status: "validated",
    notes: null,
    rfq_template: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function step(over: Partial<SolutionStepRow>): SolutionStepRow {
  return {
    id: "s-fixed-id",
    solution_id: "sol-1",
    position: 1,
    title: "Étape",
    description: null,
    required_category_id: null,
    recommended_brick_id: null,
    alternative_brick_ids: [],
    input_port_id: null,
    output_port_id: null,
    decision_notes: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function rating(over: Partial<BrickQualityRatingRow>): BrickQualityRatingRow {
  return {
    id: "r-1",
    brick_id: "b-fixed-id",
    use_case: "uc",
    score: 5,
    cost_per_op_eur: null,
    cost_unit: null,
    notes: null,
    source: "internal",
    rated_at: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("estimateSolution", () => {
  it("retourne 0 pour une solution sans étapes", () => {
    const r = estimateSolution({ steps: [], bricks: [], ratings: [], volumes: {} });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it("ignore une étape sans brique recommandée", () => {
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: null })],
      bricks: [],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].basis).toBe("no_brick");
    expect(r.lines[0].monthlyEur).toBe(0);
  });

  it("compte une brique free à 0", () => {
    const b = brick({ id: "b1", pricing_model: "free", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines[0].basis).toBe("free");
  });

  it("compte une brique flat avec unit=mois directement", () => {
    const b = brick({ id: "b1", pricing_model: "flat", base_price_eur: 25, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(25);
    expect(r.lines[0].basis).toBe("flat_monthly");
  });

  it("compte une brique usage avec rating et volume correspondant", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.003, unit: "image" });
    const rat = rating({
      brick_id: "b1",
      cost_per_op_eur: 0.003,
      cost_unit: "image",
      use_case: "Description scène complexe",
    });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [rat],
      volumes: { image_per_month: 1000 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(3, 5);
    expect(r.lines[0].basis).toBe("usage_rated");
    expect(r.lines[0].volumeApplied).toBe(1000);
  });

  it("retombe sur base_price_eur pour usage sans rating", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.001, unit: "page" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: { page_per_month: 500 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(0.5, 5);
    expect(r.lines[0].basis).toBe("usage_base");
  });

  it("marque missing_volume si usage sans volume correspondant", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.003, unit: "image" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines[0].basis).toBe("missing_volume");
    expect(r.lines[0].monthlyEur).toBe(0);
  });

  it("compte une brique self_host à 0 avec flag infra requise", () => {
    const b = brick({ id: "b1", pricing_model: "self_host", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBe(0);
    expect(r.lines[0].basis).toBe("self_host");
    expect(r.lines[0].requiresInfra).toBe(true);
  });

  it("retourne null pour une brique contact (sur devis)", () => {
    const b = brick({ id: "b1", pricing_model: "contact", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBeNull();
    expect(r.lines[0].basis).toBe("contact");
    expect(r.lines[0].monthlyEur).toBeNull();
  });

  it("somme correctement plusieurs étapes hétérogènes", () => {
    const b1 = brick({
      id: "b1",
      pricing_model: "usage",
      base_price_eur: 0.003,
      unit: "image",
    });
    const b2 = brick({
      id: "b2",
      pricing_model: "flat",
      base_price_eur: 14,
      unit: "mois",
    });
    const r = estimateSolution({
      steps: [
        step({ id: "s1", position: 1, recommended_brick_id: "b1" }),
        step({ id: "s2", position: 2, recommended_brick_id: "b2" }),
      ],
      bricks: [b1, b2],
      ratings: [
        rating({ brick_id: "b1", cost_per_op_eur: 0.003, cost_unit: "image" }),
      ],
      volumes: { image_per_month: 1000 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(3 + 14, 5);
    expect(r.lines).toHaveLength(2);
  });

  it("si une ligne est sur devis, total est null mais autres lignes restent visibles", () => {
    const b1 = brick({ id: "b1", pricing_model: "flat", base_price_eur: 10, unit: "mois" });
    const b2 = brick({ id: "b2", pricing_model: "contact", base_price_eur: 0, unit: "mois" });
    const r = estimateSolution({
      steps: [
        step({ id: "s1", position: 1, recommended_brick_id: "b1" }),
        step({ id: "s2", position: 2, recommended_brick_id: "b2" }),
      ],
      bricks: [b1, b2],
      ratings: [],
      volumes: {},
    });
    expect(r.totalMonthlyEur).toBeNull();
    expect(r.lines[0].monthlyEur).toBe(10);
    expect(r.lines[1].monthlyEur).toBeNull();
  });

  it("choisit le rating le moins cher quand plusieurs matchent l'unité", () => {
    const b = brick({ id: "b1", pricing_model: "usage", base_price_eur: 0.005, unit: "image" });
    const r = estimateSolution({
      steps: [step({ recommended_brick_id: "b1" })],
      bricks: [b],
      ratings: [
        rating({ id: "r1", brick_id: "b1", cost_per_op_eur: 0.005, cost_unit: "image" }),
        rating({ id: "r2", brick_id: "b1", cost_per_op_eur: 0.003, cost_unit: "image" }),
      ],
      volumes: { image_per_month: 1000 },
    });
    expect(r.totalMonthlyEur).toBeCloseTo(3, 5);
  });
});
```

- [ ] **Step 2 : Faire échouer les tests**

Run: `npx vitest run lib/pricing/__tests__/estimateSolution.test.ts`
Expected: FAIL avec "Cannot find module '@/lib/pricing/estimateSolution'"

- [ ] **Step 3 : Implémenter `estimateSolution.ts`**

```ts
// lib/pricing/estimateSolution.ts
// Moteur pur d'agrégation de prix pour une solution.
// Parcourt les étapes, lit la brique recommandée, applique le pricing_model
// et les volumes fournis. Retourne un détail par ligne + un total.
//
// Règles :
// - free / self_host  → 0 (self_host marqué requiresInfra=true)
// - flat              → base_price_eur si unit=mois|année (sinon traité en usage_base)
// - usage             → cherche un rating cost_unit==brick.unit le moins cher,
//                       sinon retombe sur base_price_eur ; multiplie par
//                       volumes[<unit>_per_month] ; si volume manquant → 0 + flag
// - contact           → null (sur devis, total devient null si présent)

import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";
import { isFixedCostUnit, volumeKeyForCostUnit } from "./volumeUnits";

export type EstimateBasis =
  | "free"
  | "flat_monthly"
  | "usage_rated"
  | "usage_base"
  | "missing_volume"
  | "self_host"
  | "contact"
  | "no_brick";

export type EstimateLine = {
  stepId: string;
  stepPosition: number;
  brickId: string | null;
  brickName: string | null;
  basis: EstimateBasis;
  monthlyEur: number | null;
  unitPriceEur: number | null;
  unit: string | null;
  volumeApplied: number | null;
  requiresInfra: boolean;
  note: string | null;
};

export type EstimateResult = {
  totalMonthlyEur: number | null;
  lines: EstimateLine[];
};

export type EstimateInput = {
  steps: SolutionStepRow[];
  bricks: ComponentRow[];
  ratings: BrickQualityRatingRow[];
  volumes: Record<string, number>;
};

/** Calcule l'estimation mensuelle d'une solution à partir de ses étapes. */
export function estimateSolution(input: EstimateInput): EstimateResult {
  const bricksById = new Map(input.bricks.map((b) => [b.id, b]));

  const ratingsByBrick = new Map<string, BrickQualityRatingRow[]>();
  for (const r of input.ratings) {
    const arr = ratingsByBrick.get(r.brick_id) ?? [];
    arr.push(r);
    ratingsByBrick.set(r.brick_id, arr);
  }

  const lines: EstimateLine[] = [];
  let total = 0;
  let totalIsNull = false;

  for (const s of input.steps) {
    const line = lineForStep(s, bricksById, ratingsByBrick, input.volumes);
    lines.push(line);
    if (line.monthlyEur === null) totalIsNull = true;
    else total += line.monthlyEur;
  }

  return {
    totalMonthlyEur: totalIsNull ? null : total,
    lines,
  };
}

function lineForStep(
  s: SolutionStepRow,
  bricksById: Map<string, ComponentRow>,
  ratingsByBrick: Map<string, BrickQualityRatingRow[]>,
  volumes: Record<string, number>,
): EstimateLine {
  if (s.recommended_brick_id === null) {
    return {
      stepId: s.id,
      stepPosition: s.position,
      brickId: null,
      brickName: null,
      basis: "no_brick",
      monthlyEur: 0,
      unitPriceEur: null,
      unit: null,
      volumeApplied: null,
      requiresInfra: false,
      note: "Pas de brique recommandée.",
    };
  }

  const b = bricksById.get(s.recommended_brick_id);
  if (b === undefined) {
    return {
      stepId: s.id,
      stepPosition: s.position,
      brickId: s.recommended_brick_id,
      brickName: null,
      basis: "no_brick",
      monthlyEur: 0,
      unitPriceEur: null,
      unit: null,
      volumeApplied: null,
      requiresInfra: false,
      note: "Brique recommandée introuvable.",
    };
  }

  const base = {
    stepId: s.id,
    stepPosition: s.position,
    brickId: b.id,
    brickName: b.name,
    unit: b.unit,
  };

  switch (b.pricing_model) {
    case "free":
      return {
        ...base,
        basis: "free",
        monthlyEur: 0,
        unitPriceEur: 0,
        volumeApplied: null,
        requiresInfra: false,
        note: null,
      };

    case "self_host":
      return {
        ...base,
        basis: "self_host",
        monthlyEur: 0,
        unitPriceEur: 0,
        volumeApplied: null,
        requiresInfra: true,
        note: "Self-hosted : prévoir un coût d'infra séparé.",
      };

    case "contact":
      return {
        ...base,
        basis: "contact",
        monthlyEur: null,
        unitPriceEur: null,
        volumeApplied: null,
        requiresInfra: false,
        note: "Sur devis.",
      };

    case "flat":
      if (isFixedCostUnit(b.unit)) {
        return {
          ...base,
          basis: "flat_monthly",
          monthlyEur: b.base_price_eur,
          unitPriceEur: b.base_price_eur,
          volumeApplied: null,
          requiresInfra: false,
          note: null,
        };
      }
      return usageLine(base, b, ratingsByBrick.get(b.id) ?? [], volumes);

    case "usage":
      return usageLine(base, b, ratingsByBrick.get(b.id) ?? [], volumes);
  }
}

type BaseFields = {
  stepId: string;
  stepPosition: number;
  brickId: string;
  brickName: string;
  unit: string;
};

function usageLine(
  base: BaseFields,
  b: ComponentRow,
  ratings: BrickQualityRatingRow[],
  volumes: Record<string, number>,
): EstimateLine {
  const matchingRatings = ratings.filter(
    (r) => r.cost_per_op_eur !== null && r.cost_unit === b.unit,
  );
  const cheapest = matchingRatings.reduce<BrickQualityRatingRow | null>(
    (best, r) => {
      if (r.cost_per_op_eur === null) return best;
      if (best === null) return r;
      if (best.cost_per_op_eur === null) return r;
      return r.cost_per_op_eur < best.cost_per_op_eur ? r : best;
    },
    null,
  );

  const useRating = cheapest !== null && cheapest.cost_per_op_eur !== null;
  const unitPrice = useRating ? (cheapest.cost_per_op_eur ?? 0) : b.base_price_eur;
  const basis: EstimateBasis = useRating ? "usage_rated" : "usage_base";

  const volumeKey = volumeKeyForCostUnit(b.unit);
  if (volumeKey === null) {
    // unit fixe sur du usage : traiter comme flat
    return {
      ...base,
      basis: "flat_monthly",
      monthlyEur: unitPrice,
      unitPriceEur: unitPrice,
      volumeApplied: null,
      requiresInfra: false,
      note: null,
    };
  }

  const volume = volumes[volumeKey];
  if (typeof volume !== "number" || !Number.isFinite(volume)) {
    return {
      ...base,
      basis: "missing_volume",
      monthlyEur: 0,
      unitPriceEur: unitPrice,
      volumeApplied: null,
      requiresInfra: false,
      note: `Volume manquant : ajustez le slider "${volumeKey}".`,
    };
  }

  return {
    ...base,
    basis,
    monthlyEur: unitPrice * volume,
    unitPriceEur: unitPrice,
    volumeApplied: volume,
    requiresInfra: false,
    note: null,
  };
}
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

Run: `npx vitest run lib/pricing/__tests__/estimateSolution.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/pricing/estimateSolution.ts lib/pricing/__tests__/estimateSolution.test.ts
git commit -m "feat(pricing): moteur d'agrégation pur pour estimer le coût mensuel d'une solution"
```

---

## Task 5: Parser le champ `volume_assumptions` dans `solutionForm.ts`

**Files:**
- Modify: `lib/catalogue/solutionForm.ts`
- Create: `lib/catalogue/__tests__/solutionForm.test.ts`

- [ ] **Step 1 : Écrire les tests du parser**

```ts
// lib/catalogue/__tests__/solutionForm.test.ts
import { describe, expect, it } from "vitest";
import { parseSolutionForm } from "@/lib/catalogue/solutionForm";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

function valid(extra: Record<string, string> = {}): FormData {
  return fd({
    title: "Test",
    slug: "test-solution",
    problem_statement: "Un problème",
    complexity: "easy",
    status: "draft",
    position: "0",
    ...extra,
  });
}

describe("parseSolutionForm — volume_assumptions", () => {
  it("retourne un objet vide si pas de champ", () => {
    const r = parseSolutionForm(valid());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.volume_assumptions).toEqual({});
  });

  it("parse un JSON valide", () => {
    const r = parseSolutionForm(
      valid({ volume_assumptions: '{"image_per_month": 1000}' }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.volume_assumptions).toEqual({ image_per_month: 1000 });
  });

  it("rejette un JSON malformé", () => {
    const r = parseSolutionForm(valid({ volume_assumptions: "{not json" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });

  it("rejette un JSON qui n'est pas un objet", () => {
    const r = parseSolutionForm(valid({ volume_assumptions: "[1,2,3]" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });

  it("rejette des valeurs non numériques", () => {
    const r = parseSolutionForm(
      valid({ volume_assumptions: '{"image_per_month": "mille"}' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });

  it("rejette des valeurs négatives", () => {
    const r = parseSolutionForm(
      valid({ volume_assumptions: '{"image_per_month": -10}' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });
});
```

- [ ] **Step 2 : Faire échouer les tests (les nouveaux échouent)**

Run: `npx vitest run lib/catalogue/__tests__/solutionForm.test.ts`
Expected: FAIL — soit "Cannot find module" si non existant (créer le fichier vide d'abord OK), soit `volume_assumptions` undefined.

- [ ] **Step 3 : Modifier `lib/catalogue/solutionForm.ts`**

Ajouter le helper de parsing JSON juste après `floatOrNull` :

```ts
function parseVolumeAssumptions(
  fd: FormData,
): { ok: true; value: Record<string, number> } | { ok: false; error: string } {
  const raw = str(fd, "volume_assumptions");
  if (raw === "") return { ok: true, value: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "JSON invalide." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Doit être un objet JSON { clé: nombre }." };
  }
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return { ok: false, error: `Valeur invalide pour "${k}" (nombre ≥ 0 attendu).` };
    }
    result[k] = v;
  }
  return { ok: true, value: result };
}
```

Puis dans `parseSolutionForm`, juste avant le retour des erreurs, ajouter :

```ts
const volumesParse = parseVolumeAssumptions(fd);
if (!volumesParse.ok) errors.volume_assumptions = volumesParse.error;

if (Object.keys(errors).length > 0) return { ok: false, errors };
```

Et dans l'objet `data`, ajouter (juste après `total_price_estimate_eur`) :

```ts
volume_assumptions: volumesParse.ok ? volumesParse.value : {},
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

Run: `npx vitest run lib/catalogue/__tests__/solutionForm.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5 : Vérifier typecheck global**

Run: `npm run typecheck`
Expected: 0 erreur

- [ ] **Step 6 : Commit**

```bash
git add lib/catalogue/solutionForm.ts lib/catalogue/__tests__/solutionForm.test.ts
git commit -m "feat(admin): parser volume_assumptions dans le formulaire solution"
```

---

## Task 6: Champ admin pour saisir les volumes

**Files:**
- Modify: `components/admin/SolutionForm.tsx`

- [ ] **Step 1 : Ajouter le champ après `total_price_estimate_eur`**

Localiser le bloc `<Field id="total_price_estimate_eur" ...>` (vers ligne 100) et ajouter juste après son `</Field>` fermant :

```tsx
<Field
  id="volume_assumptions"
  label="Hypothèses de volume (JSON)"
  hint='Exemple : {"image_per_month": 1000, "page_per_month": 500}'
  error={errors.volume_assumptions}
  className="col-span-full"
>
  <textarea
    id="volume_assumptions"
    name="volume_assumptions"
    rows={3}
    defaultValue={
      initial?.volume_assumptions !== undefined
        ? JSON.stringify(initial.volume_assumptions, null, 2)
        : ""
    }
    className="w-full rounded-input border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-body-sm text-on-surface focus:border-primary focus:outline-none"
    placeholder='{"image_per_month": 1000}'
  />
</Field>
```

- [ ] **Step 2 : Vérifier le typecheck**

Run: `npm run typecheck`
Expected: 0 erreur (le type `SolutionRow` a déjà `volume_assumptions` depuis Task 2)

- [ ] **Step 3 : Vérifier le lint**

Run: `npm run lint`
Expected: 0 erreur, 0 warning

- [ ] **Step 4 : Commit**

```bash
git add components/admin/SolutionForm.tsx
git commit -m "feat(admin): ajouter le champ Hypothèses de volume dans SolutionForm"
```

---

## Task 7: Client Component `SolutionEstimator`

**Files:**
- Create: `components/solutions/SolutionEstimator.tsx`
- Test: `components/solutions/__tests__/SolutionEstimator.test.tsx`

- [ ] **Step 1 : Écrire le test de rendu**

```tsx
// components/solutions/__tests__/SolutionEstimator.test.tsx
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SolutionEstimator } from "@/components/solutions/SolutionEstimator";
import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";

const BRICK_USAGE: ComponentRow = {
  id: "b-usage",
  vendor_id: "v",
  layer_id: 0,
  category_id: null,
  slug: "vision",
  name: "Claude Vision",
  tier: null,
  description: null,
  pricing_model: "usage",
  base_price_eur: 0.003,
  unit: "image",
  pricing_url: null,
  preset_fit: [],
  capabilities: {},
  source_url: null,
  last_checked_at: null,
  confidence: "high",
  status: "validated",
  notes: null,
  rfq_template: null,
  created_at: "",
  updated_at: "",
};

const STEP: SolutionStepRow = {
  id: "s1",
  solution_id: "sol",
  position: 1,
  title: "Comprendre l'image",
  description: null,
  required_category_id: null,
  recommended_brick_id: "b-usage",
  alternative_brick_ids: [],
  input_port_id: null,
  output_port_id: null,
  decision_notes: null,
  created_at: "",
  updated_at: "",
};

const RATING: BrickQualityRatingRow = {
  id: "r1",
  brick_id: "b-usage",
  use_case: "Description scène",
  score: 5,
  cost_per_op_eur: 0.003,
  cost_unit: "image",
  notes: null,
  source: "internal",
  rated_at: null,
  created_at: "",
  updated_at: "",
};

describe("SolutionEstimator", () => {
  it("affiche le total initial calculé avec les volumes par défaut", () => {
    render(
      <SolutionEstimator
        steps={[STEP]}
        bricks={[BRICK_USAGE]}
        ratings={[RATING]}
        defaultVolumes={{ image_per_month: 1000 }}
      />,
    );
    // 1000 × 0,003 = 3 €/mois
    expect(screen.getByText(/Estimation/)).toBeTruthy();
    expect(screen.getByTestId("total-monthly-eur").textContent).toContain("3");
  });

  it("recalcule le total quand on change le slider", () => {
    render(
      <SolutionEstimator
        steps={[STEP]}
        bricks={[BRICK_USAGE]}
        ratings={[RATING]}
        defaultVolumes={{ image_per_month: 1000 }}
      />,
    );
    const slider = screen.getByLabelText(/Images par mois/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "5000" } });
    // 5000 × 0,003 = 15 €/mois
    expect(screen.getByTestId("total-monthly-eur").textContent).toContain("15");
  });

  it("affiche 'Sur devis' quand au moins une ligne est contact", () => {
    const brickContact: ComponentRow = {
      ...BRICK_USAGE,
      id: "b-contact",
      slug: "contact",
      name: "Enterprise X",
      pricing_model: "contact",
      base_price_eur: 0,
      unit: "mois",
    };
    const stepContact: SolutionStepRow = {
      ...STEP,
      id: "s-contact",
      position: 2,
      recommended_brick_id: "b-contact",
    };
    render(
      <SolutionEstimator
        steps={[STEP, stepContact]}
        bricks={[BRICK_USAGE, brickContact]}
        ratings={[RATING]}
        defaultVolumes={{ image_per_month: 1000 }}
      />,
    );
    expect(screen.getByTestId("total-monthly-eur").textContent).toMatch(/devis/i);
  });

  it("n'affiche aucun slider si pas de clé de volume", () => {
    const brickFlat: ComponentRow = {
      ...BRICK_USAGE,
      pricing_model: "flat",
      base_price_eur: 25,
      unit: "mois",
    };
    render(
      <SolutionEstimator
        steps={[STEP]}
        bricks={[brickFlat]}
        ratings={[]}
        defaultVolumes={{}}
      />,
    );
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByTestId("total-monthly-eur").textContent).toContain("25");
  });
});
```

- [ ] **Step 2 : Vérifier que la dépendance `@testing-library/react` est dispo**

Run: `npm ls @testing-library/react`
Expected: présent. Si absent :

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom
```

Et vérifier que `vitest.config.ts` (ou `vite.config.ts`) déclare `environment: "jsdom"` pour les fichiers `.tsx`. Si pas le cas, ajouter au config :

```ts
test: { environment: "jsdom" }
```

- [ ] **Step 3 : Faire échouer les tests**

Run: `npx vitest run components/solutions/__tests__/SolutionEstimator.test.tsx`
Expected: FAIL avec "Cannot find module '@/components/solutions/SolutionEstimator'"

- [ ] **Step 4 : Implémenter le Client Component**

```tsx
// components/solutions/SolutionEstimator.tsx
"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { estimateSolution, type EstimateLine } from "@/lib/pricing/estimateSolution";
import {
  VOLUME_UNIT_LABELS,
  VOLUME_UNIT_SLIDER_BOUNDS,
  volumeKeyForCostUnit,
} from "@/lib/pricing/volumeUnits";
import type {
  BrickQualityRatingRow,
  ComponentRow,
  SolutionStepRow,
} from "@/lib/supabase/types";

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("fr-FR");

type Props = {
  steps: SolutionStepRow[];
  bricks: ComponentRow[];
  ratings: BrickQualityRatingRow[];
  defaultVolumes: Record<string, number>;
};

export function SolutionEstimator({
  steps,
  bricks,
  ratings,
  defaultVolumes,
}: Props): ReactElement {
  const [volumes, setVolumes] = useState<Record<string, number>>(defaultVolumes);

  // Déterminer les sliders utiles : on regarde les briques recommandées,
  // on extrait leur unit, on convertit en clé _per_month.
  const volumeKeys = useMemo(() => {
    const keys = new Set<string>();
    const bricksById = new Map(bricks.map((b) => [b.id, b]));
    for (const s of steps) {
      if (s.recommended_brick_id === null) continue;
      const b = bricksById.get(s.recommended_brick_id);
      if (b === undefined) continue;
      if (b.pricing_model !== "usage" && b.pricing_model !== "flat") continue;
      const key = volumeKeyForCostUnit(b.unit);
      if (key !== null) keys.add(key);
    }
    return Array.from(keys);
  }, [steps, bricks]);

  const estimate = useMemo(
    () => estimateSolution({ steps, bricks, ratings, volumes }),
    [steps, bricks, ratings, volumes],
  );

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-headline-sm text-on-surface">
            Estimation pour votre volume
          </h2>
          <p
            data-testid="total-monthly-eur"
            className="font-mono text-3xl text-primary"
          >
            {estimate.totalMonthlyEur === null
              ? "Sur devis"
              : `${EUR.format(estimate.totalMonthlyEur)}/mois`}
          </p>
        </div>

        {volumeKeys.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {volumeKeys.map((key) => {
              const bounds = VOLUME_UNIT_SLIDER_BOUNDS[key] ?? {
                min: 0,
                max: 100000,
                step: 1,
              };
              const label = VOLUME_UNIT_LABELS[key] ?? key;
              const value = volumes[key] ?? bounds.min;
              return (
                <label key={key} className="block space-y-1">
                  <span className="flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                    <span>{label}</span>
                    <span className="text-on-surface">{NUM.format(value)}</span>
                  </span>
                  <input
                    type="range"
                    aria-label={label}
                    min={bounds.min}
                    max={bounds.max}
                    step={bounds.step}
                    value={value}
                    onChange={(e) =>
                      setVolumes((v) => ({
                        ...v,
                        [key]: Number(e.currentTarget.value),
                      }))
                    }
                    className="w-full"
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        <details className="rounded-input border border-outline-variant bg-surface-container-lowest p-3">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-on-surface-variant">
            Détail du calcul ({estimate.lines.length} étapes)
          </summary>
          <ul className="mt-3 space-y-2">
            {estimate.lines.map((l) => (
              <EstimateLineView key={l.stepId} line={l} />
            ))}
          </ul>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Hypothèses : prix snapshot {formatHypothesis(volumes)}. Marge d&apos;incertitude
            ±30 %. Les briques self-hosted nécessitent un coût d&apos;infra séparé non
            inclus.
          </p>
        </details>
      </div>
    </Card>
  );
}

function EstimateLineView({ line }: { line: EstimateLine }): ReactElement {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 text-body-sm">
      <span>
        <span className="font-mono text-on-surface-variant">{line.stepPosition}.</span>{" "}
        <strong>{line.brickName ?? "—"}</strong>{" "}
        <Chip tone="neutral">{basisLabel(line.basis)}</Chip>
        {line.requiresInfra ? (
          <Chip tone="secondary">+ infra à prévoir</Chip>
        ) : null}
        {line.note !== null ? (
          <span className="ml-1 text-on-surface-variant">— {line.note}</span>
        ) : null}
      </span>
      <span className="font-mono text-on-surface">
        {line.monthlyEur === null
          ? "sur devis"
          : line.monthlyEur === 0
            ? "0 €"
            : `${EUR.format(line.monthlyEur)}/mois`}
      </span>
    </li>
  );
}

function basisLabel(basis: EstimateLine["basis"]): string {
  switch (basis) {
    case "free":
      return "Gratuit";
    case "flat_monthly":
      return "Forfait mensuel";
    case "usage_rated":
      return "À l’usage (rating)";
    case "usage_base":
      return "À l’usage (prix de base)";
    case "missing_volume":
      return "Volume manquant";
    case "self_host":
      return "Self-hosted";
    case "contact":
      return "Sur devis";
    case "no_brick":
      return "Sans brique";
  }
}

function formatHypothesis(volumes: Record<string, number>): string {
  const entries = Object.entries(volumes);
  if (entries.length === 0) return "aucun volume";
  return entries
    .map(([k, v]) => `${NUM.format(v)} ${VOLUME_UNIT_LABELS[k] ?? k}`)
    .join(", ");
}
```

- [ ] **Step 5 : Vérifier que tous les tests passent**

Run: `npx vitest run components/solutions/__tests__/SolutionEstimator.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6 : Vérifier typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 erreur, 0 warning

- [ ] **Step 7 : Commit**

```bash
git add components/solutions/SolutionEstimator.tsx components/solutions/__tests__/SolutionEstimator.test.tsx
git commit -m "feat(solutions): composant SolutionEstimator avec sliders de volume"
```

---

## Task 8: Brancher l'estimator sur `/solutions/[slug]`

**Files:**
- Modify: `app/solutions/[slug]/page.tsx`

- [ ] **Step 1 : Remplacer l'affichage statique du prix**

Localiser le bloc (lignes 136-145) :

```tsx
<div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-body-sm text-on-surface-variant">
  {solution.audience !== null ? <span>👥 {solution.audience}</span> : null}
  {solution.total_price_estimate_eur !== null ? (
    <span>≈ {EUR.format(solution.total_price_estimate_eur)}/mois</span>
  ) : null}
  {solution.estimated_setup_minutes !== null ? (
    <span>⏱ ~{solution.estimated_setup_minutes} min de setup</span>
  ) : null}
  <span>{steps.length} étapes</span>
</div>
```

Le remplacer par (suppression de la ligne `total_price_estimate_eur`, l'estimator détaillé prendra le relais en-dessous) :

```tsx
<div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-body-sm text-on-surface-variant">
  {solution.audience !== null ? <span>👥 {solution.audience}</span> : null}
  {solution.estimated_setup_minutes !== null ? (
    <span>⏱ ~{solution.estimated_setup_minutes} min de setup</span>
  ) : null}
  <span>{steps.length} étapes</span>
</div>
```

- [ ] **Step 2 : Ajouter l'import du composant**

En haut du fichier, ajouter :

```tsx
import { SolutionEstimator } from "@/components/solutions/SolutionEstimator";
```

- [ ] **Step 3 : Insérer l'estimator entre le header et le workflow**

Juste avant la `<section>` du workflow (`<h2>Le workflow</h2>`, vers ligne 150), ajouter :

```tsx
<section className="mx-auto max-w-5xl px-container-margin pb-4">
  <SolutionEstimator
    steps={steps}
    bricks={bricksRes.data}
    ratings={ratingsRes.data}
    defaultVolumes={solution.volume_assumptions}
  />
</section>
```

- [ ] **Step 4 : Lancer le dev server et vérifier visuellement**

Run (dans un terminal séparé, pas dans Claude Code) :

```bash
nohup npm run dev > /tmp/mnemo-dev.log 2>&1 &
sleep 12
```

Puis :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/solutions/memo-image
```

Expected: `200`

Aller sur http://localhost:3000/solutions/memo-image dans le navigateur, vérifier :
1. Le bloc "Estimation pour votre volume" apparaît
2. Un slider "Images par mois" est présent avec valeur 1000
3. Bouger le slider met à jour le total en direct
4. Le détail du calcul est ouvrable (`<details>`)

Arrêter :

```bash
pkill -f "next dev"
```

- [ ] **Step 5 : Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 erreur, 0 warning

- [ ] **Step 6 : Commit**

```bash
git add app/solutions/\[slug\]/page.tsx
git commit -m "feat(solutions): brancher SolutionEstimator sur la page publique"
```

---

## Task 9: Adapter la home pour utiliser l'estimation calculée

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1 : Charger les données nécessaires en plus des solutions**

Remplacer le bloc actuel (lignes 22-31) :

```tsx
export default async function HomePage(): Promise<ReactElement> {
  const supabase = createAdminClient();

  const { data: solutions, error } = await supabase
    .from("solutions")
    .select("*")
    .eq("status", "validated")
    .order("position", { ascending: true });

  if (error !== null) throw error;
```

Par :

```tsx
export default async function HomePage(): Promise<ReactElement> {
  const supabase = createAdminClient();

  const { data: solutions, error } = await supabase
    .from("solutions")
    .select("*")
    .eq("status", "validated")
    .order("position", { ascending: true });
  if (error !== null) throw error;

  // Pour chaque solution validée on charge ses étapes + briques recommandées
  // + ratings, et on calcule l'estimation par défaut à afficher sur la card.
  const solutionIds = solutions.map((s) => s.id);
  const { data: steps, error: stepsErr } =
    solutionIds.length > 0
      ? await supabase.from("solution_steps").select("*").in("solution_id", solutionIds)
      : { data: [], error: null as null };
  if (stepsErr !== null) throw stepsErr;

  const recommendedBrickIds = Array.from(
    new Set(
      steps
        .map((s) => s.recommended_brick_id)
        .filter((id): id is string => id !== null),
    ),
  );

  const [bricksRes, ratingsRes] = await Promise.all([
    recommendedBrickIds.length > 0
      ? supabase.from("components").select("*").in("id", recommendedBrickIds)
      : Promise.resolve({ data: [], error: null as null }),
    recommendedBrickIds.length > 0
      ? supabase
          .from("brick_quality_ratings")
          .select("*")
          .in("brick_id", recommendedBrickIds)
      : Promise.resolve({ data: [], error: null as null }),
  ]);
  if (bricksRes.error !== null) throw bricksRes.error;
  if (ratingsRes.error !== null) throw ratingsRes.error;

  const stepsBySolution = new Map<string, typeof steps>();
  for (const s of steps) {
    const arr = stepsBySolution.get(s.solution_id) ?? [];
    arr.push(s);
    stepsBySolution.set(s.solution_id, arr);
  }
```

- [ ] **Step 2 : Ajouter l'import du moteur**

En haut du fichier :

```tsx
import { estimateSolution } from "@/lib/pricing/estimateSolution";
```

- [ ] **Step 3 : Remplacer l'affichage du prix dans la card**

Localiser le bloc (lignes 83-91) :

```tsx
<div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs text-on-surface-variant">
  {s.audience !== null ? <span>👥 {s.audience}</span> : null}
  {s.total_price_estimate_eur !== null ? (
    <span>≈ {EUR.format(s.total_price_estimate_eur)}/mois</span>
  ) : null}
  {s.estimated_setup_minutes !== null ? (
    <span>⏱ ~{s.estimated_setup_minutes} min de setup</span>
  ) : null}
</div>
```

Remplacer par :

```tsx
{(() => {
  const est = estimateSolution({
    steps: stepsBySolution.get(s.id) ?? [],
    bricks: bricksRes.data,
    ratings: ratingsRes.data,
    volumes: s.volume_assumptions,
  });
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs text-on-surface-variant">
      {s.audience !== null ? <span>👥 {s.audience}</span> : null}
      <span>
        ≈{" "}
        {est.totalMonthlyEur === null
          ? "sur devis"
          : `${EUR.format(est.totalMonthlyEur)}/mois`}
      </span>
      {s.estimated_setup_minutes !== null ? (
        <span>⏱ ~{s.estimated_setup_minutes} min de setup</span>
      ) : null}
    </div>
  );
})()}
```

- [ ] **Step 4 : Lancer le dev server et vérifier**

Run (dans un terminal séparé) :

```bash
nohup npm run dev > /tmp/mnemo-dev.log 2>&1 &
sleep 12
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: `200`

Aller sur `http://localhost:3000/` et vérifier que les 4 cards affichent un prix calculé (pas forcément le même que `total_price_estimate_eur` saisi à la main — c'est le but).

Valeurs attendues approximatives avec les volumes seedés :
- `memo-image` (1000 images/mois × 0,003 €) ≈ 3 €/mois (mais self_host Qdrant, n8n... → certaines lignes à 0 + infra)
- `memo-pdf` (500 pages/mois × 0,001 € Mistral OCR alt) — la reco est Marker (free) → faible
- `memo-meeting` (240 minutes × 0,0037 € AssemblyAI) ≈ 0,89 €/mois — mais Plaud (flat) à 14 € si c'est la reco
- `search-base` → dépend des briques

**C'est volontairement différent des chiffres ronds saisis avant. La vraie valeur d'usage du plan, c'est cette honnêteté.**

Si un total semble aberrant, c'est probablement parce qu'une brique recommandée a `pricing_model='usage'` sans rating matching → fallback sur `base_price_eur` × volume, et le `base_price_eur` peut être faux. Vérifier via `/admin/components`.

```bash
pkill -f "next dev"
```

- [ ] **Step 5 : Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 erreur, 0 warning

- [ ] **Step 6 : Commit**

```bash
git add app/page.tsx
git commit -m "feat(home): afficher l'estimation calculée au lieu de total_price_estimate_eur"
```

---

## Task 10: Vérification finale + e2e smoke

**Files:** (aucun nouveau)

- [ ] **Step 1 : Build complet**

Run: `npm run build`
Expected: termine sans erreur, liste les routes compilées dont `/`, `/solutions/[slug]`, `/admin/solutions/[id]/edit`.

- [ ] **Step 2 : Tests complets**

Run: `npm test`
Expected: tous les tests passent (178 existants + ~22 nouveaux Vitest)

- [ ] **Step 3 : Smoke test runtime des routes touchées**

```bash
nohup npm run dev > /tmp/mnemo-dev.log 2>&1 &
sleep 12

for path in / /solutions/memo-image /solutions/memo-pdf /solutions/memo-meeting /solutions/search-base; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  printf "%-35s %s\n" "$path" "$code"
done

pkill -f "next dev"
```

Expected: tous à 200.

- [ ] **Step 4 : Vérification visuelle dans le navigateur (golden path)**

1. Ouvrir http://localhost:3000/
2. Constater que chaque card affiche un prix (différent ou égal à l'ancien — peu importe)
3. Cliquer sur `memo-image`
4. Voir le bloc "Estimation pour votre volume" avec slider
5. Bouger le slider de 1000 → 5000 et vérifier que le total se met à jour
6. Déplier "Détail du calcul" et vérifier que chaque ligne du workflow a son basis et son coût

- [ ] **Step 5 : Commit du log d'avancement**

Mettre à jour `.ralph/progress.md` avec une ligne :

```
- 2026-05-26 — Estimateur de prix dynamique (Task 1-10) : volume_assumptions + moteur d'agrégation pur + sliders. Remplace total_price_estimate_eur saisi à la main.
```

Run:

```bash
git add .ralph/progress.md
git commit -m "chore(progress): journaliser l'arrivée de l'estimateur de prix dynamique"
```

---

## Self-Review

**Spec coverage** (depuis l'échange initial avec l'utilisateur) :
- ✅ "Volumes-types par solution" → Task 1 (migration) + Task 5/6 (admin)
- ✅ "Moteur d'agrégation pur dans `lib/pricing/`" → Task 4
- ✅ "Slider de volume sur `/solutions/[slug]`" → Task 7 + Task 8
- ✅ "Détail ligne par ligne" → SolutionEstimator avec `<details>`
- ✅ "Hypothèses explicites" → la note de bas de bloc dans SolutionEstimator
- ✅ "Self-hosted = afficher '+ infra à prévoir'" → flag `requiresInfra` dans la ligne
- ✅ Cohérence home / page détail → Task 9
- ⚠️ Coût d'infra séparé pour les briques `self_host` : explicitement hors scope (note dans Hors scope du header). Sera traité dans un futur plan.

**Placeholder scan :** aucun TBD, aucun "implement later", chaque step a son code complet.

**Type consistency :**
- `EstimateBasis` est défini en Task 4 et réutilisé dans Task 7 (`EstimateLine["basis"]`).
- `SolutionRow.volume_assumptions` est ajouté en Task 2 et utilisé en Task 4, 7, 8, 9.
- `volumeKeyForCostUnit` exporté en Task 3 et utilisé en Task 4 (moteur) et Task 7 (composant).
- `VOLUME_UNIT_LABELS` / `VOLUME_UNIT_SLIDER_BOUNDS` exportés en Task 3 et utilisés en Task 7.

Tout est cohérent.
