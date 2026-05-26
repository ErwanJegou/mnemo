import type { ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { buildRfq, type RfqInput } from "@/lib/rfq/buildMailto";

type Props = RfqInput & {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
};

/** Bouton de demande de prix — server component, ouvre le client mail ou le formulaire web. */
export function RfqButton({ size = "md", variant = "secondary", ...input }: Props): ReactElement {
  const outcome = buildRfq(input);

  if (outcome.kind === "none") {
    return (
      <Button variant="ghost" size={size} disabled title={outcome.reason}>
        Demander un prix (indisponible)
      </Button>
    );
  }

  const label =
    outcome.kind === "contact_form"
      ? "Demander un prix (formulaire vendor)"
      : "Demander un prix";
  const isExternal = outcome.kind === "contact_form";

  return (
    <a
      href={outcome.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className="inline-block"
    >
      <Button variant={variant} size={size} type="button">
        {label}
      </Button>
    </a>
  );
}
