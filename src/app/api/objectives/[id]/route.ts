import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const item = await db.objectiveItem.update({ where: { id: params.id }, data: { done: !!body.done } });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await db.objectiveItem.findUnique({ where: { id: params.id } });
  if (item?.isDefault) {
    return NextResponse.json({ ok: false, error: "Les objectifs par défaut ne peuvent pas être supprimés, seulement décochés." }, { status: 400 });
  }
  await db.objectiveItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
