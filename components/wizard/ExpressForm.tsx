"use client";

// Formulaire Express : 5 questions sur une seule page (matrice D).
// Tous les autres champs du Profile sont déduits par buildExpressProfile.

import type { ReactElement, ReactNode } from "react";
import { RadioCards } from "@/components/wizard/RadioCards";
import {
  ACTIVITY_OPTIONS,
  BUDGET_OPTIONS,
  SENSITIVITY_OPTIONS,
  TECH_LEVEL_OPTIONS,
  VOICES_OPTIONS,
} from "@/lib/wizard/options";
import type { ExpressAnswers } from "@/lib/wizard/express";

type Props = {
  answers: ExpressAnswers;
  onChange: <K extends keyof ExpressAnswers>(key: K, value: ExpressAnswers[K]) => void;
};

function Block({ n, label, hint, children }: { n: number; label: string; hint?: string; children: ReactNode }): ReactElement {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 flex items-baseline gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label-caps uppercase text-primary">
          {n}
        </span>
        <span className="font-display text-body-lg text-on-surface">{label}</span>
      </legend>
      {hint !== undefined ? (
        <p className="mb-3 text-body-sm text-on-surface-variant">{hint}</p>
      ) : null}
      {children}
    </fieldset>
  );
}

export function ExpressForm({ answers, onChange }: Props): ReactElement {
  return (
    <div className="space-y-8">
      <Block n={1} label="Vous êtes ?" hint="Détermine la plupart des défauts (réglementations, audit, sensibilité minimale).">
        <RadioCards
          value={answers.activity}
          options={ACTIVITY_OPTIONS}
          onChange={(v) => onChange("activity", v)}
        />
      </Block>

      <Block n={2} label="Combien de personnes contribuent à la base ?" hint="Active la détection de conflits d'intérêts si plusieurs voix.">
        <RadioCards
          value={answers.voices}
          options={VOICES_OPTIONS}
          onChange={(v) => onChange("voices", v)}
        />
      </Block>

      <Block n={3} label="Vos données sont…" hint="Confidentiel et secret activent la traçabilité des corrections.">
        <RadioCards
          value={answers.sensitivity}
          options={SENSITIVITY_OPTIONS}
          onChange={(v) => onChange("sensitivity", v)}
        />
      </Block>

      <Block n={4} label="Votre budget mensuel ?" hint="Borne la stack : moins de 50 € → tout au plus simple ; plus de 500 € → on autorise les options premium.">
        <RadioCards
          value={answers.budget}
          options={BUDGET_OPTIONS}
          onChange={(v) => onChange("budget", v)}
        />
      </Block>

      <Block n={5} label="Qui va gérer techniquement la base ?" hint="« Personne de technique » masque les options qui demandent un dev.">
        <RadioCards
          value={answers.techLevel}
          options={TECH_LEVEL_OPTIONS}
          onChange={(v) => onChange("techLevel", v)}
        />
      </Block>
    </div>
  );
}
