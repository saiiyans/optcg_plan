import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { requireAdminSecret } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/link-local-images
 *
 * Renseigne Card.localImagePath pour chaque carte qui a un fichier local
 * correspondant sous /public/cards/{small,large}/{CARDNUMBER}.jpg — champ
 * prévu explicitement dans le schéma pour cet usage (mise en cache locale
 * autorisée), jamais utilisé par défaut jusqu'ici.
 *
 * Ne touche à AUCUN autre champ de Card (nom, effet, couleur, image
 * distante Limitless d'origine...) — imageUrl reste inchangée et sert
 * de repli si jamais un fichier local venait à manquer. N'ajoute, ne
 * supprime et ne duplique aucune carte : seules les lignes déjà
 * existantes sont mises à jour.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  try {
    const largeDir = path.join(process.cwd(), "public", "cards", "large");
    const smallDir = path.join(process.cwd(), "public", "cards", "small");

    const largeFiles = new Set(fs.existsSync(largeDir) ? fs.readdirSync(largeDir) : []);
    const smallFiles = new Set(fs.existsSync(smallDir) ? fs.readdirSync(smallDir) : []);

    const cards = await db.card.findMany({ select: { id: true, cardNumber: true, localImagePath: true } });

    let updated = 0;
    let unchanged = 0;
    let noLocalFile = 0;

    for (const card of cards) {
      const fileName = `${card.cardNumber.toUpperCase()}.jpg`;
      let localPath: string | null = null;
      if (largeFiles.has(fileName)) localPath = `/cards/large/${fileName}`;
      else if (smallFiles.has(fileName)) localPath = `/cards/small/${fileName}`;

      if (!localPath) {
        noLocalFile++;
        continue;
      }
      if (card.localImagePath === localPath) {
        unchanged++;
        continue;
      }
      await db.card.update({ where: { id: card.id }, data: { localImagePath: localPath } });
      updated++;
    }

    return NextResponse.json({
      ok: true,
      totalCards: cards.length,
      updated,
      unchanged,
      noLocalFile,
      localSmallCount: smallFiles.size,
      localLargeCount: largeFiles.size,
    });
  } catch (e: any) {
    console.error("POST /api/admin/link-local-images failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
