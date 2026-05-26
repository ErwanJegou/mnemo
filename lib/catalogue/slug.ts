// Génération de slug kebab-case ASCII (utilisé pour les inserts vendors et
// composants quand l'admin n'en saisit pas un manuellement).

/** Slug ASCII : minuscules, accents retirés, espaces → "-", caractères hors [a-z0-9-] strippés. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "") // retire les diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
}

/** Vrai si le slug ne contient que [a-z0-9-] sans bordure '-'. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug);
}
