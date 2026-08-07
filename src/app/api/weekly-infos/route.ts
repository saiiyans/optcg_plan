import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";

export async function GET() {
  const infos = await db.weeklyInfo.findMany({ orderBy: { weekNumber: "asc" } });
  return NextResponse.json({ ok: true, infos });
}

/** PUT { weekNumber, content } — upsert du texte libre d'une semaine. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { weekNumber, content } = body;
  if (typeof weekNumber !== "number") {
    return NextResponse.json({ ok: false, error: "weekNumber requis (nombre)." }, { status: 400 });
  }
  const info = await db.weeklyInfo.upsert({
    where: { weekNumber },
    update: { content: content ?? "" },
    create: { weekNumber, content: content ?? "" },
  });
  return NextResponse.json({ ok: true, info });
}
