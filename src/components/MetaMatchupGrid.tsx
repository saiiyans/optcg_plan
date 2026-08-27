"use client";

import { useCallback, useEffect, useState } from "react";
import { CardImage } from "@/components/CardImage";

/**
 * Grille "méta actuelle" (section demandée : tous les leaders de la méta,
 * avec un bouton qui va chercher les infos et calcule un pourcentage).
 *
 * Différent des fiches de /matchups basées sur les propres parties du
 * joueur : ceci vient d'une source externe publique (voir
 * src/lib/metaMatchupScraper.ts), jamais mélangé aux statistiques
 * personnelles. La récupération n'est déclenchée que par un clic manuel
 * sur "Actualiser" — jamais automatique.
 */

interface MetaLeader {
  name: string;
  cardNumber: string;
}
interface MetaMatchupData {
  leaders: MetaLeader[];
  matrix: Record<string, Record<string, number | null>>;
  sourceLabel: string;
  sourceUrl: string;
  totalGamesLabel: string | null;
}

function cellClass(pct: number | null) {
  if (pct == null) return "bg-panel2 text-steel/30";
  if (pct >= 55) return "bg-emerald-950/50 text-emerald-300 border border-emerald-800/40";
  if (pct <= 44.9) return "bg-red-950/50 text-red-300 border border-red-800/40";
  return "bg-gold/10 text-gold border border-gold/20";
}

function LeaderThumb({
  cardNumber,
  name,
  imageUrl,
  size = 26,
}: {
  cardNumber: string;
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5" title={`${name} (${cardNumber})`}>
      <span
        className="relative rounded overflow-hidden border border-line shrink-0"
        style={{ width: size, height: Math.round(size * 1.4) }}
      >
        <CardImage
          src={imageUrl}
          alt={name}
          fallbackLabel={cardNumber}
          sizes={`${size}px`}
          fallbackTextClassName="text-[6px] font-mono text-steel/50 leading-tight"
        />
      </span>
      <span className="text-[9px] text-steel/60 max-w-[46px] truncate">{name}</span>
    </span>
  );
}

export function MetaMatchupGrid() {
  const [data, setData] = useState<MetaMatchupData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meta-matchups");
      const json = await res.json();
      if (json.ok && json.hasData) {
        setData(json.data);
        setFetchedAt(json.fetchedAt);
        setStale(json.stale);
      }
    } catch {
      // silencieux — l'état "pas de données" gère déjà ce cas côté UI
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Résout l'image de chaque leader via la base de cartes déjà importée
  // localement (jamais un nouveau domaine d'images externe) — repli sur le
  // texte seul si la carte n'a pas encore été importée (comportement de
  // CardImage, jamais d'erreur bloquante).
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        data.leaders.map(async (l) => {
          try {
            const res = await fetch(`/api/cards?q=${encodeURIComponent(l.cardNumber)}&limit=5&color=all`);
            const json = await res.json();
            const match = (json.cards ?? []).find((c: any) => c.cardNumber === l.cardNumber);
            return [l.cardNumber, match?.imageUrl ?? null] as const;
          } catch {
            return [l.cardNumber, null] as const;
          }
        })
      );
      if (!cancelled) setImages(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/meta-matchups/refresh", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        setFetchedAt(json.fetchedAt);
        setStale(false);
      } else {
        setError(json.error ?? "Échec de la récupération — réessaie plus tard.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Échec de la récupération — réessaie plus tard.");
    }
    setRefreshing(false);
  }

  return (
    <div className="card-tile rounded-sm p-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-gold">
            Méta actuelle — matchups leader vs leader
          </div>
          <div className="text-[11px] text-steel/50 mt-0.5">
            {fetchedAt
              ? `Mis à jour le ${new Date(fetchedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
              : "Jamais récupéré"}
            {stale && " — données anciennes, actualise"}
            {data?.totalGamesLabel ? ` • ${data.totalGamesLabel}` : ""}
          </div>
        </div>
        <button onClick={refresh} disabled={refreshing} className="btn-flame text-xs py-2 px-4">
          {refreshing ? "Actualisation..." : "🔄 Actualiser"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2 mb-3">
          {error} {data && "— les données ci-dessous restent celles de la dernière récupération réussie."}
        </div>
      )}

      {loading ? (
        <div className="skeleton h-32" />
      ) : !data ? (
        <div className="text-sm text-steel/60">Pas encore de données de méta. Clique sur « Actualiser » pour les récupérer.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="text-center border-separate border-spacing-0.5 text-xs mx-auto">
              <thead>
                <tr>
                  <th className="text-left text-[10px] text-steel/50 pr-2 pb-2 align-bottom">Leader ↓ vs →</th>
                  {data.leaders.map((l) => (
                    <th key={l.cardNumber} className="px-1 pb-2 font-normal align-bottom">
                      <LeaderThumb cardNumber={l.cardNumber} name={l.name} imageUrl={images[l.cardNumber]} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.leaders.map((row) => (
                  <tr key={row.cardNumber}>
                    <th className="text-left pr-2 py-1 font-normal whitespace-nowrap">
                      <LeaderThumb cardNumber={row.cardNumber} name={row.name} imageUrl={images[row.cardNumber]} size={22} />
                    </th>
                    {data.leaders.map((col) => {
                      const pct = data.matrix[row.cardNumber]?.[col.cardNumber] ?? null;
                      return (
                        <td
                          key={col.cardNumber}
                          className={`px-1.5 py-2 rounded font-mono tabular-nums min-w-[52px] ${cellClass(pct)}`}
                        >
                          {pct == null ? "—" : `${pct.toFixed(1)}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4 mt-3 text-[10px] text-steel/50 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950/50 border border-emerald-800/40" /> Favorable ≥55%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gold/10 border border-gold/20" /> Équilibré 45–54,9%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-950/50 border border-red-800/40" /> Défavorable ≤44,9%
            </span>
          </div>

          <div className="text-[10px] text-steel/40 mt-2">
            Source :{" "}
            <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-steel/70">
              {data.sourceLabel}
            </a>{" "}
            — données communautaires externes (ladder en ligne), pas tes propres parties.
          </div>
        </>
      )}
    </div>
  );
}
