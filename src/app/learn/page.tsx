"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ADMIN_HEADERS } from "@/lib/adminHeaders";

interface LearnArticle {
  id: string;
  url: string;
  source: "opdecks" | "tcgprotectors" | "shonentcg";
  sourceLabel: string;
  title: string;
  summary: string | null;
  titleFr: string | null;
  summaryFr: string | null;
  durationMinutes: number | null;
  publishedAt: string | null;
  isPillar: boolean;
  order: number;
  capturedAt: string;
}

interface SourceRefreshResult {
  source: string;
  ok: boolean;
  count: number;
  error: string | null;
}

const SOURCE_TITLE: Record<string, string> = {
  opdecks: "opdecks.xyz — Autres articles",
  tcgprotectors: "tcgprotectors.com — Guides One Piece TCG",
  shonentcg: "shonentcg.com — Actus & guides (filtré One Piece)",
};
const SOURCE_ORDER = ["opdecks", "tcgprotectors", "shonentcg"];

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ArticleCard({ a, pillar }: { a: LearnArticle; pillar?: boolean }) {
  const date = formatDate(a.publishedAt);
  const hasFr = !!a.titleFr;
  const displayTitle = a.titleFr ?? a.title;
  const displaySummary = a.summaryFr ?? a.summary;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors duration-150 ${
        pillar ? "border-flame/40 bg-flame/5" : "border-line bg-panel2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-ivory leading-snug">{displayTitle}</h4>
        {pillar && <span className="badge badge-gold shrink-0 text-[10px]">Pilier</span>}
      </div>
      {displaySummary && <p className="text-xs text-textMuted mt-1.5 leading-relaxed">{displaySummary}</p>}
      {!hasFr && (
        <p className="text-[10px] text-steel/50 mt-1.5 italic">Traduction française en cours de génération...</p>
      )}

      <div className="mt-2.5 pt-2 border-t border-line/60">
        {/* Lire → ouvre la page détail DANS l'app (traduite en français,
            voir /learn/[id]) — la source anglaise originale reste indiquée
            séparément juste en dessous, jamais cachée (demandé le 30/08/2026). */}
        <div className="flex items-center gap-2">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-steel/70 hover:text-flame transition-colors duration-150"
          >
            🇬🇧 Source : {a.sourceLabel.split(" — ")[0] ?? a.sourceLabel}
          </a>
          {hasFr && a.title !== displayTitle && <span className="truncate italic text-[11px] text-steel/50">« {a.title} »</span>}
          <Link
            href={`/learn/${a.id}`}
            className="ml-auto shrink-0 text-[11px] text-steel/70 hover:text-flame transition-colors duration-150"
          >
            Lire →
          </Link>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-steel/50 font-mono">
          {a.durationMinutes && <span>⏱ {a.durationMinutes} min</span>}
          {date && <span>📅 {date}</span>}
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  const [articles, setArticles] = useState<LearnArticle[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [refreshSummary, setRefreshSummary] = useState<SourceRefreshResult[] | null>(null);

  const load = () => {
    setState("loading");
    fetch("/api/learn")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error("Échec du chargement.");
        setArticles(d.articles ?? []);
        setCapturedAt(d.capturedAt ?? null);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(load, []);

  // Traduit en boucle (petits lots) tous les articles pas encore traduits —
  // déclenché automatiquement après un "Actualiser", jamais un bouton
  // séparé (demandé explicitement). S'arrête proprement si GEMINI_API_KEY
  // n'est pas configurée : les articles restent visibles en anglais.
  const translateAll = async () => {
    let guard = 0;
    while (guard < 20) {
      guard++;
      const res: Response = await fetch("/api/admin/learn-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ADMIN_HEADERS },
        body: JSON.stringify({ limit: 5 }),
      });
      const data: any = await res.json();
      if (!data.ok) {
        setStatusText(`Traduction interrompue : ${data.error}`);
        return;
      }
      if (data.processed > 0) {
        setStatusText(`Traduction en cours... ${data.remaining} article(s) restant(s).`);
        load();
      }
      if (data.done) {
        setStatusText("");
        return;
      }
    }
  };

  const refresh = async () => {
    setBusy(true);
    setStatusText("Récupération des sources...");
    try {
      const res: Response = await fetch("/api/learn/refresh", { method: "POST" });
      const data: any = await res.json();
      setRefreshSummary(data.sources ?? null);
      load();
      setStatusText("Traduction en français...");
      await translateAll();
    } finally {
      setBusy(false);
    }
  };

  const pillars = articles.filter((a) => a.isPillar).sort((a, b) => a.order - b.order);
  const bySource = (src: string) => articles.filter((a) => a.source === src && !a.isPillar).sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="card-tile p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-ivory">📚 Apprentissage</h1>
            <p className="text-xs text-textMuted mt-1 max-w-2xl">
              Articles de fondamentaux et de stratégie OPTCG, récupérés en direct depuis plusieurs sites et traduits
              automatiquement en français à chaque clic sur « Actualiser » — la source originale (en anglais) reste
              toujours indiquée sous chaque article. Les 4 articles « Pilier » ci-dessous sont la base de la
              méthodologie du coach (2K Rule, économie du DON!!, erreurs de débutant/défense, rôles de matchup).
            </p>
            {capturedAt && (
              <p className="text-[11px] text-steel/60 mt-1.5 font-mono">
                Actualisé le {new Date(capturedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à{" "}
                {new Date(capturedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <button onClick={refresh} disabled={busy} className="btn btn-primary text-xs shrink-0">
            {busy ? "Actualisation..." : "🔄 Actualiser"}
          </button>
        </div>

        {statusText && <div className="mt-2 text-[11px] text-steel/70 font-mono">{statusText}</div>}

        {refreshSummary && (
          <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-2 text-[11px]">
            {refreshSummary.map((r) => (
              <span
                key={r.source}
                className={`font-mono px-2 py-1 rounded-md ${r.ok ? "bg-emerald/10 text-emerald" : "bg-danger/10 text-danger"}`}
                title={r.error ?? undefined}
              >
                {r.ok ? "✓" : "✗"} {r.source} ({r.count})
              </span>
            ))}
          </div>
        )}
      </div>

      {state === "loading" && (
        <div className="card-tile p-5">
          <div className="skeleton h-40" />
        </div>
      )}
      {state === "error" && (
        <div className="card-tile p-5 text-xs text-danger">Impossible de charger les articles.</div>
      )}

      {state === "ready" && (
        <>
          {pillars.length > 0 && (
            <div className="card-tile p-5">
              <h3 className="text-sm font-semibold text-ivory uppercase tracking-wide mb-3">
                Les 4 fondamentaux du coach
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {pillars.map((a) => (
                  <ArticleCard key={a.id} a={a} pillar />
                ))}
              </div>
            </div>
          )}

          {SOURCE_ORDER.map((src) => {
            const list = bySource(src);
            if (list.length === 0) return null;
            return (
              <div key={src} className="card-tile p-5">
                <h3 className="text-sm font-semibold text-ivory uppercase tracking-wide mb-3">{SOURCE_TITLE[src]}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((a) => (
                    <ArticleCard key={a.id} a={a} />
                  ))}
                </div>
              </div>
            );
          })}

          {articles.length === 0 && (
            <div className="card-tile p-5 text-xs text-textMuted">
              Aucun article en base pour l&rsquo;instant — clique sur « Actualiser » pour lancer la première
              récupération.
            </div>
          )}
        </>
      )}
    </div>
  );
}
