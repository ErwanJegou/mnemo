// Décode le paramètre `?errors=...` (JSON encodé URI) renvoyé par les server
// actions sur échec de validation. Tolère un paramètre absent ou mal formé.

export function parseSearchErrors(raw: string | undefined): Record<string, string> {
  if (raw === undefined || raw === "") return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
