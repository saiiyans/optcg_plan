import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SETTINGS_ID = "singleton";

// GET /api/settings — paramètres globaux (section 1 : date de début de
// l'entraînement officiel). Crée la ligne singleton à la demande si elle
// n'existe pas encore, sans jamais la dupliquer.
export async function GET() {
  const settings = await db.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
  return NextResponse.json({ ok: true, settings });
}

// PATCH /api/settings { officialTrainingStartDate } — modifiable dans les
// paramètres, jamais recalculé automatiquement.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(body, "officialTrainingStartDate")) {
    data.officialTrainingStartDate = body.officialTrainingStartDate || null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Aucun champ modifiable fourni." }, { status: 400 });
  }
  const settings = await db.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });
  return NextResponse.json({ ok: true, settings });
}
