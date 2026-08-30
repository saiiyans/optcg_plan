"use client";
import { useEffect, useState } from "react";

interface LearnArticle {
  id: string;
  url: string;
  source: "opdecks" | "tcgprotectors" | "shonentcg";
  sourceLabel: string;
  title: string;
  summary: string | null;
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
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-xl border p-4 transition-colors duration-150 hover:border-flame/60 ${
        pillar ? "border-flame/40 bg-flame/5" : "border-line bg-panel2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-ivory leading-snug">{a.title}</h4>
        {pillar && <span className="badge badge-gold shrink-0 text-[10px]">Pilier</span>}
      </div>
      {a.summary && <p className="text-xs text-textMuted mt-1.5 leading-relaxed">{a.summary}</p>}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-steel/70 font-mono">
        {a.durationMinutes && <span>⏱ {a.durationMinutes} min</span>}
        {date && <span>📅 {date}</span>}
        <span className="ml-auto text-flame/80">Lire →</span>
      </div>
    </a>
  );
}

export default function LearnPage() {
  const [articles, setArticles] = useState<LearnArticle[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
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

  const refresh = async () => {
    setBusy(true);
    try {
      const res: Response = await fetch("/api/learn/refresh", { method: "POST" });
      const data: any = await res.json();
      setRefreshSummary(data.sources ?? null);
    } finally {
      setBusy(false);
      load();
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
              Articles de fondamentaux et de stratégie OPTCG, récupérés en direct depuis plusieurs sites à chaque
              clic sur « Actualiser ». Les 4 articles « Pilier » ci-dessous sont la base de la méthodologie du
              coach (2K Rule, économie du DON!!, erreurs de débutant/défense, rôles de matchup).
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
