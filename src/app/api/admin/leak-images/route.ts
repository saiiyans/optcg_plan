import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/admin/leak-images
 * Body: { cardNumber: string, dataUrl: string }
 *
 * BUG STRUCTUREL (30/08/2026) : les images des cartes leak OP18/EB05
 * (imageUrl = https://cdn.cardkaizoku.com/cards_en/...) ne s'affichent
 * jamais dans l'app ("Image indisponible" partout) — vérifié : le blocage
 * anti-bot de cdn.cardkaizoku.com touche AUSSI les images, pas seulement
 * leurs fichiers JSON (403 même avec Referer usurpé, depuis le serveur ET
 * quand le NAVIGATEUR DE L'UTILISATEUR charge l'image depuis notre propre
 * domaine — un hotlink-protection qui bloque toute origine autre que
 * cardkaizoku.com lui-même). Impossible à contourner par une simple URL ou
 * un proxy Vercel (le serveur est bloqué pareil). Solution : Claude
 * récupère l'image depuis un vrai navigateur (jamais bloqué) et la stocke
 * ICI en base, encodée en data URL — Card.imageUrl accepte déjà n'importe
 * quelle chaîne, un data: URI fonctionne partout sans dépendre du CDN
 * cardkaizoku.com. Ne touche qu'à isLeak=true (les cartes normales restent
 * sur leur URL Limitless habituelle, jamais remplacées ici) et respecte
 * manuallyEditedFields comme tout le reste de l'app.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.cardNumber || !body?.dataUrl || typeof body.dataUrl !== "string" || !body.dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ ok: false, error: "Corps invalide : { cardNumber, dataUrl } attendu, dataUrl doit être un data:image/... URI." }, { status: 400 });
  }

  const card = await db.card.findUnique({ where: { cardNumber: body.cardNumber } });
  if (!card) return NextResponse.json({ ok: false, error: `Carte ${body.cardNumber} introuvable.` }, { status: 404 });
  if (!card.isLeak) {
    return NextResponse.json({ ok: false, error: `${body.cardNumber} n'est pas une carte leak — route réservée aux cartes leak.` }, { status: 400 });
  }
  const lockedFields: string[] = card.manuallyEditedFields ? JSON.parse(card.manuallyEditedFields) : [];
  if (lockedFields.includes("imageUrl")) {
    return NextResponse.json({ ok: false, error: `imageUrl verrouillé manuellement sur ${body.cardNumber} — pas touché.` });
  }

  await db.card.update({ where: { cardNumber: body.cardNumber }, data: { imageUrl: body.dataUrl } });
  return NextResponse.json({ ok: true, cardNumber: body.cardNumber, bytes: body.dataUrl.length });
}
