import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin — Mnémo",
  description: "Espace d'administration du catalogue de composants Mnémo.",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/connexion");
  }

  if (!isAdminEmail(user.email, getAdminEmails())) {
    // Non admin : on renvoie vers l'espace personnel avec un message explicite
    // (pas de 404 pour éviter la confusion ; l'utilisateur sait pourquoi).
    redirect("/espace?erreur=" + encodeURIComponent("Accès admin réservé."));
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-on-surface/10 bg-surface-container">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-container-margin py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="font-display text-headline-sm text-on-surface hover:text-primary"
            >
              Admin Mnémo
            </Link>
            <Chip tone="primary">{user.email ?? "admin"}</Chip>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-body-sm text-on-surface-variant">
            <Link href="/admin" className="hover:text-primary">Tableau de bord</Link>
            <Link href="/admin/solutions" className="hover:text-primary">Solutions</Link>
            <Link href="/admin/components" className="hover:text-primary">Briques</Link>
            <Link href="/admin/categories" className="hover:text-primary">Catégories</Link>
            <Link href="/admin/vendors" className="hover:text-primary">Vendors</Link>
            <Link href="/admin/infra" className="hover:text-primary">Infra</Link>
            <Link href="/admin/hardware" className="hover:text-primary">Hardware</Link>
            <Link href="/admin/ports" className="hover:text-primary">Ports</Link>
            <Link href="/admin/ratings" className="hover:text-primary">Ratings</Link>
            <Link href="/espace" className="hover:text-primary">Mon espace</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-container-margin py-section-padding">
        {children}
      </main>
    </div>
  );
}
