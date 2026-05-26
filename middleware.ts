// Middleware racine : rafraîchit la session Supabase à chaque navigation
// (cookies httpOnly). Exclut les assets statiques pour ne pas surcharger.

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest): ReturnType<typeof updateSession> {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
