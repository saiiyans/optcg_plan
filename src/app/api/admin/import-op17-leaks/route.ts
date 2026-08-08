import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import confirmedData from "@/lib/data/op17-confirmed.json";
import pendingData from "@/lib/data/op17-pending.json";

export const dynamic = "force-dynamic";

interface OP17Confirmed {
  id: string;
  name: string;
  cardType: string;
  color: string;
  rarity: string | null;
  cost: number | null;
  power: number | null;
  life: number | null;
  counter: number | null;
  attribute: string | null;
  traits: string | null;
  effect: string | null;
  imageUrl: string | null;
}

interface OP17Pending {
  temp_id: string;
  name: string;
  card_type?: string;
  color?: string;
  reason: string;
}

/**
 * POST /api/admin/import-op17-leaks
 *
 * Import ponctuel (à lancer une fois) des cartes OP17 leak/reveal
 * actuellement connues, sourcées et vérifiées manuellement (spellmana.com,
 * onepiecetopdecks.com, croisées avec le seed fourni). Ne touche à AUCUNE
 * carte existante d'un autre set — upsert strictement par cardNumber exact,
 * jamais de déduction de numéro manquant, jamais de fusion par nom.
 *
 * - 68 cartes à numéro confirmé -> table Card, isLeak=true
 * - ~33 cartes à ID ou couleur non fiable -> table PendingLeakCard (hors
 *   des filtres normaux, jamais dans la bibliothèque canonique)
 *
 * Idempotent : relancer plusieurs fois ne crée aucun doublon (upsert sur
 * cardNumber pour les confirmées, sur tempId pour les pending).
 */
export async function POST() {
  try {
    const confirmed = confirmedData as OP17Confirmed[];
    const pending = pendingData as OP17Pending[];

    let inserted = 0;
    let skippedExisting = 0;
    const conflicts: { cardNumber: string; reason: string }[] = [];

    for (const card of confirmed) {
      const existing = await db.card.findUnique({ where: { cardNumber: card.id } });

      if (existing) {
        // Ne jamais écraser une carte déjà présente (règle explicite du
        // projet) — on signale juste le cas, on ne touche à rien.
        skippedExisting++;
        if (existing.setCode !== "OP17") {
          conflicts.push({
            cardNumber: card.id,
            reason: `Existe déjà avec setCode=${existing.setCode} (attendu OP17) — non modifié.`,
          });
        }
        continue;
      }

      await db.card.create({
        data: {
          cardNumber: card.id,
          name: card.name,
          category: card.cardType,
          color: card.color,
          setCode: "OP17",
          rarity: card.rarity,
          cost: card.cost,
          power: card.power,
          life: card.life,
          counter: card.counter,
          attribute: card.attribute,
          types: card.traits ?? "",
          officialText: card.effect,
          imageUrl: card.imageUrl ?? "",
          cardUrl: "",
          sourceUrl: "spellmana.com / onepiecetopdecks.com (leak OP17, vérifié manuellement)",
          isLeak: true,
          language: "en",
        },
      });
      inserted++;
    }

    let pendingInserted = 0;
    let pendingSkipped = 0;
    for (const p of pending) {
      const existing = await db.pendingLeakCard.findUnique({ where: { tempId: p.temp_id } });
      if (existing) {
        pendingSkipped++;
        continue;
      }
      await db.pendingLeakCard.create({
        data: {
          tempId: p.temp_id,
          name: p.name,
          setCode: "OP17",
          cardType: p.card_type ?? null,
          color: p.color ?? null,
          reason: p.reason,
        },
      });
      pendingInserted++;
    }

    return NextResponse.json({
      ok: true,
      confirmed: { total: confirmed.length, inserted, skippedExisting },
      pending: { total: pending.length, inserted: pendingInserted, skipped: pendingSkipped },
      conflicts,
    });
  } catch (e: any) {
    console.error("POST /api/admin/import-op17-leaks failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
