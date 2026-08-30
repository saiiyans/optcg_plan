import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchKaizokuLeakCards, LEAK_SET_CODES, LEAK_SOURCE_LABEL, LEAK_SOURCE_PAGE_URL } from "@/lib/cardKaizokuLeakScraper";

export const dynamic = "force-dynamic";

/**
 * POST /api/leaks/refresh
 *
 * Relit EN DIRECT card_data.json (cardkaizoku.com/spoilers) et :
 * 1. Upsert toutes les cartes des sets actuellement en reveal
 *    (LEAK_SET_CODES) dans la table Card canonique, isLeak=true — jamais
 *    d'écrasement d'un champ verrouillé manuellement (manuallyEditedFields,
 *    même garde-fou que /api/import/batch).
 * 2. Repasse isLeak=false sur toute carte qui était marquée leak mais dont
 *    le set n'est PLUS dans LEAK_SET_CODES (le set est sorti officiellement
 *    depuis — ex. OP17 le 28/08/2026) : ne supprime ni ne touche à aucun
 *    autre champ de ces cartes, juste le statut.
 *
 * Jamais de suppression de carte ici : une fois qu'une carte leak a rejoint
 * la table canonique, elle y reste pour toujours (leak d'abord, puis
 * confirmée à la sortie officielle par le prochain import Limitless via
 * /api/import/preview-set, qui écrasera ses champs avec les données
 * définitives — cette route ne fait que gérer le statut isLeak).
 */
interface ExistingCardRow {
  cardNumber: string;
  setCode: string;
  isLeak: boolean;
  manuallyEditedFields: string | null;
}

export async function POST() {
  try {
    const result = await fetchKaizokuLeakCards();

    let created = 0;
    let updated = 0;
    let skippedLocked = 0;

    for (const c of result.cards) {
      const existing: ExistingCardRow | null = await db.card.findUnique({
        where: { cardNumber: c.cardNumber },
        select: { cardNumber: true, setCode: true, isLeak: true, manuallyEditedFields: true },
      });

      const lockedFields: string[] = existing?.manuallyEditedFields ? JSON.parse(existing.manuallyEditedFields) : [];

      const data: Record<string, any> = {
        name: c.name,
        category: c.category,
        color: c.color,
        setCode: c.setCode,
        rarity: c.rarity,
        cost: c.cost,
        power: c.power,
        life: c.life,
        counter: c.counter,
        attribute: c.attribute,
        types: c.types,
        officialText: c.officialText,
        imageUrl: c.imageUrl ?? "",
        cardUrl: "",
        sourceUrl: `${LEAK_SOURCE_LABEL} — ${LEAK_SOURCE_PAGE_URL}`,
        block: c.block,
        isLeak: true,
        language: "en",
      };
      for (const field of lockedFields) delete data[field];

      if (existing) {
        await db.card.update({ where: { cardNumber: c.cardNumber }, data });
        if (lockedFields.length > 0) skippedLocked++;
        updated++;
      } else {
        await db.card.create({ data: { cardNumber: c.cardNumber, ...data } as any });
        created++;
      }
    }

    // Démotion automatique : tout set qui n'est plus en reveal repasse
    // isLeak=false pour ses cartes déjà en base.
    const leakSetCodes = LEAK_SET_CODES.map((s) => s.toUpperCase());
    const staleLeakCards: ExistingCardRow[] = await db.card.findMany({
      where: { isLeak: true, setCode: { notIn: leakSetCodes } },
      select: { cardNumber: true, setCode: true, isLeak: true, manuallyEditedFields: true },
    });
    let demoted = 0;
    for (const row of staleLeakCards) {
      const lockedFields: string[] = row.manuallyEditedFields ? JSON.parse(row.manuallyEditedFields) : [];
      if (lockedFields.includes("isLeak")) continue;
      await db.card.update({ where: { cardNumber: row.cardNumber }, data: { isLeak: false } });
      demoted++;
    }

    return NextResponse.json({
      ok: true,
      leakSetCodes: LEAK_SET_CODES,
      totalFound: result.cards.length,
      created,
      updated,
      skippedLocked,
      demoted,
      sourceUrl: result.sourceUrl,
      sourceLabel: LEAK_SOURCE_LABEL,
      capturedAt: result.capturedAt,
      fromCache: result.fromCache,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 200 });
  }
}
