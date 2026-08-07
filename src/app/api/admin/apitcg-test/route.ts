import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/apitcg-test
 *
 * Étape de vérification avant de construire l'import complet : récupère
 * une seule page de cartes vertes depuis apitcg.com et renvoie la réponse
 * brute, pour qu'on puisse voir les vrais noms de champs avant d'écrire le
 * mapping définitif. Ne touche à aucune donnée en base.
 */
export async function GET() {
  const apiKey = process.env.APITCG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "APITCG_API_KEY manquante — ajoute-la dans .env (local) et dans les variables d'environnement Vercel (production)." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://apitcg.com/api/one-piece/cards?color=Green", {
      headers: { "x-api-key": apiKey },
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, error: "Réponse non-JSON reçue.", status: res.status, rawPreview: text.slice(0, 500) });
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      // On ne renvoie qu'un échantillon (2 cartes) + les clés du niveau
      // racine, pour inspecter la forme des données sans noyer la réponse.
      topLevelKeys: Object.keys(json),
      sampleCards: Array.isArray(json?.data) ? json.data.slice(0, 2) : Array.isArray(json) ? json.slice(0, 2) : json,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
