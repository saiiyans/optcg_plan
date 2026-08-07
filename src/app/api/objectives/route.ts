import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { DEFAULT_OBJECTIVES } from "@/lib/planningData";

/**
 * GET /api/objectives
 * Sème les objectifs par défaut une seule fois (si la table est vide),
 * puis retourne tous les objectifs groupés par catégorie.
 */
export async function GET() {
  const count = await db.objectiveItem.count();
  if (count === 0) {
    await db.objectiveItem.createMany({
      data: DEFAULT_OBJECTIVES.map((o) => ({ category: o.category, text: o.text, order: o.order, isDefault: true })),
    });
  }

  const items = await db.objectiveItem.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] });
  return NextResponse.json({ ok: true, items });
}

/** POST /api/objectives  { category, text } — ajoute un objectif personnalisé. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { category, text } = body;
  if (!category || !text?.trim()) {
    return NextResponse.json({ ok: false, error: "category et text requis." }, { status: 400 });
  }
  const maxOrder = await db.objectiveItem.aggregate({ where: { category }, _max: { order: true } });
  const item = await db.objectiveItem.create({
    data: { category, text: text.trim(), isDefault: false, order: (maxOrder._max.order ?? 0) + 1 },
  });
  return NextResponse.json({ ok: true, item });
}
