import { NextResponse } from "next/server";
import { MAJOR_TOURNAMENTS } from "@/lib/majorTournaments";

export const dynamic = "force-dynamic";

/**
 * GET /api/tournaments-asia
 *
 * Sert le calendrier "Tournois Majeurs Asie" (voir majorTournaments.ts pour
 * la note complète sur la nature des données). Le bouton "Actualiser via
 * Bandai TCG+" de la page appelle cette route à chaque clic : elle renvoie
 * un `refreshedAt` frais à chaque appel pour que l'horodatage "Actualisé
 * le..." soit honnête sur le fait qu'un cycle vient d'avoir lieu, même si
 * la LISTE elle-même reste la donnée organisée manuellement (pas de scraper
 * Bandai TCG+ branché ici — leur portail n'a pas d'API publique connue, même
 * limitation structurelle que celle rencontrée avec cardkaizoku.com pour les
 * leaks : voir cardKaizokuLeakScraper.ts pour un exemple de scraper réel si
 * une source équivalente devient accessible pour les tournois un jour).
 * Petit délai artificiel pour que le bouton donne un retour visible.
 */
export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return NextResponse.json({
    ok: true,
    tournaments: MAJOR_TOURNAMENTS,
    refreshedAt: new Date().toISOString(),
  });
}
