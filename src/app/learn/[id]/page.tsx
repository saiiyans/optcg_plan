"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface LearnArticleDetail {
  id: string;
  url: string;
  source: string;
  sourceLabel: string;
  title: string;
  summary: string | null;
  content: string | null;
  titleFr: string | null;
  summaryFr: string | null;
  contentFr: string | null;
  durationMinutes: number | null;
  isPillar: boolean;
}

// --- Page détail d'un article Apprentissage (demandée le 30/08/2026) —
// l'article est lu ET traduit en français DANS l'app plutôt que d'envoyer
// l'utilisateur lire l'anglais sur le site d'origine. GET /api/learn/[id]
// s'occupe de récupérer/traduire à la demande (voir ce fichier) ; ici on
// n'affiche que le résultat, avec la source originale toujours indiquée en
// bas (jamais caché, même une fois traduit).
function renderContent(text: string) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h3 key={i} className="text-base font-bold text-ivory mt-5 mb-1.5">
          {block.slice(3)}
        </h3>
      );
    }
    if (block.startsWith("> ")) {
      return (
        <blockquote key={i} className="border-l-2 border-flame/50 pl-3 my-3 text-sm italic text-steel/90">
          {block.slice(2)}
        </blockquote>
      );
    }
    return (
      <p key={i} className="text-sm text-steel/90 leading-relaxed mb-3">
        {block}
      </p>
    );
  });
}

export default function LearnArticleDetailPage({ params }: { params: { id: string } }) {
  const [article, setArticle] = useState<LearnArticleDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Chargement en 2 temps (corrigé le 30/08/2026, voir le commentaire dans
  // /api/learn/[id]/route.ts) : le texte anglais s'affiche dès que GET
  // répond (rapide, aucun appel Gemini) ; la traduction est demandée
  // séparément juste après, en arrière-plan — plus d'écran vide pendant que
  // Gemini répond (ou échoue).
  useEffect(() => {
    setState("loading");
    setArticle(null);
    setTranslationError(null);
    fetch(`/api/learn/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error ?? "Erreur");
        setArticle(d.article);
        setState("ready");
        if (d.article.content && !d.article.contentFr) {
          setTranslating(true);
          fetch(`/api/learn/${params.id}`, { method: "POST" })
            .then((r) => r.json())
            .then((t) => {
              if (t.ok) {
                setArticle((prev) => (prev ? { ...prev, titleFr: t.titleFr, summaryFr: t.summaryFr, contentFr: t.contentFr } : prev));
                setTranslationError(t.translationError ?? null);
              }
            })
            .catch(() => setTranslationError("Erreur réseau lors de l'appel à Gemini."))
            .finally(() => setTranslating(false));
        }
      })
      .catch(() => setState("error"));
  }, [params.id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link href="/learn" className="text-xs text-steel/60 hover:text-flame transition-colors duration-150">
        ← Retour à Apprentissage
      </Link>

      {state === "loading" && (
        <div className="card-tile p-5">
          <div className="skeleton h-6 w-2/3 mb-3" />
          <div className="skeleton h-40" />
          <p className="text-[11px] text-steel/50 mt-2 text-center">Chargement de l&rsquo;article...</p>
        </div>
      )}

      {state === "error" && (
        <div className="card-tile p-5 text-xs text-danger">Impossible de charger cet article.</div>
      )}

      {state === "ready" && article && (
        <div className="card-tile p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
            <h1 className="text-lg font-bold text-ivory leading-snug">{article.titleFr ?? article.title}</h1>
            {article.isPillar && <span className="badge badge-gold shrink-0 text-[10px]">Pilier</span>}
          </div>
          {article.durationMinutes && (
            <div className="text-[11px] font-mono text-steel/50 mb-3">⏱ {article.durationMinutes} min de lecture (article original)</div>
          )}

          {article.content ? (
            <div className="mt-2">
              {renderContent(article.contentFr ?? article.content)}
              {!article.contentFr && (
                <p className="text-[10px] text-steel/50 italic mt-2">
                  {translating
                    ? "Traduction française en cours..."
                    : translationError
                      ? `Traduction indisponible : ${translationError}`
                      : "Traduction française non disponible — lis la version anglaise ci-dessus en attendant."}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 text-sm text-steel/80 space-y-2">
              <p>{article.summaryFr ?? article.summary ?? "Pas de résumé disponible."}</p>
              <p className="text-xs text-steel/50 italic">
                Le contenu intégral de cet article n'a pas pu être récupéré automatiquement (structure du site source non
                reconnue) — lis-le directement à la source ci-dessous.
              </p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-line/60">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] text-steel/70 hover:text-flame transition-colors duration-150"
            >
              <span className="font-mono">🇬🇧 Source originale : {article.sourceLabel.split(" — ")[0] ?? article.sourceLabel}</span>
              <span className="ml-auto shrink-0">Voir l&rsquo;original →</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
