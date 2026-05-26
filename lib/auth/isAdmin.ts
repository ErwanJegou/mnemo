// Garde admin global de la zone /admin.
// Pas de table d'admins en BDD au Lot 1 : whitelist d'emails depuis la variable
// d'environnement ADMIN_EMAILS (CSV, ex. "erwan@…,chris@…"). L'écriture sur les
// tables du catalogue passe par le service role serveur, jamais par le client
// authentifié — donc cette garde sert à protéger l'accès aux pages /admin/* et
// les server actions, pas la RLS Supabase (qui bloque déjà les writes anon).

/**
 * Vrai si `email` figure dans la liste CSV `adminEmails`.
 * Insensible à la casse et aux espaces autour des entrées.
 * Retourne `false` pour tout email vide, nul ou non-string.
 */
export function isAdminEmail(
  email: string | null | undefined,
  adminEmails: string | null | undefined,
): boolean {
  if (typeof email !== "string" || email.trim() === "") return false;
  if (typeof adminEmails !== "string" || adminEmails.trim() === "") return false;

  const target = email.trim().toLowerCase();
  const list = adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== "");

  return list.includes(target);
}

/** Lit la whitelist depuis l'environnement. Vide si la variable n'est pas définie. */
export function getAdminEmails(): string {
  return process.env.ADMIN_EMAILS ?? "";
}
