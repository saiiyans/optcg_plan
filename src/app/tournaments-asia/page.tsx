"use client";
import { useEffect, useState } from "react";
import {
  COUNTRY_FLAG,
  COUNTRY_ORDER,
  type MajorTournament,
  type MajorTournamentCountry,
} from "@/lib/majorTournaments";

// --- /tournaments-asia — "Tournois Majeurs Asie" (demandé le 30/08/2026).
// Rubrique indépendante : ne partage aucune donnée avec /tournament-day
// (mode "Jour de Tournoi", qui logue des parties en boutique locale) ni
// avec le reste de l'app. Voir majorTournaments.ts pour la note complète
// sur la nature des données (liste organisée manuellement, pas un scraper
// Bandai TCG+ en direct).

type TabFilter = "all" | "top";
type CountryFilter = "all" | MajorTournamentCountry;

const STATUS_BADGE: Record<string, string> = {
  Ouvert: "badge-green",
  "Bientôt disponible": "badge-gold",
  "Réservé Invités": "badge-gray",
};

function formatRefreshedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function TournamentCard({
  t,
  isExpanded,
  onToggle,
}: {
  t: MajorTournament;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusClass = STATUS_BADGE[t.registration.status] ?? "badge-gray";
  const hasPrizes = t.prizes.participation || t.prizes.top_cut || t.prizes.champion;

  return (
    <div className="card-tile p-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-steel/70 font-medium">
          <span className="text-base leading-none">{COUNTRY_FLAG[t.country_code]}</span>
          {t.city} · {t.country_name}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {t.is_top_tier && <span className="badge badge-gold text-[10px]">⭐ Top Tier</span>}
          <span className={`badge ${statusClass} text-[10px]`}>{t.registration.status}</span>
        </div>
      </div>

      <h3 className="text-sm font-bold text-ivory leading-snug mt-2">{t.title}</h3>
      <p className="text-xs text-steel/60 mt-0.5">{t.location}</p>

      <div className="mt-3 space-y-1 text-xs text-steel/80 font-mono">
        <div>📅 {t.event_date}</div>
        <div>📝 Inscriptions : {t.registration.registration_dates}</div>
        <div>💰 {t.entry_fee}</div>
      </div>

      <button
        onClick={onToggle}
        className="mt-3 w-full text-left text-[11px] font-semibold text-steel/70 hover:text-flame transition-colors duration-150 pt-2.5 border-t border-line/60 flex items-center justify-between"
      >
        Prize Pool &amp; conditions d&rsquo;accès
        <span className={`inline-block transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}>▾</span>
      </button>

      {isExpanded && (
        <div className="mt-2.5 space-y-3">
          {hasPrizes && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wide text-steel/50 mb-1">Prize Pool</div>
              <div className="space-y-1 text-xs text-steel/90">
                {t.prizes.participation && (
                  <div>
                    <span className="text-steel/50">Participation : </span>
                    {t.prizes.participation}
                  </div>
                )}
                {t.prizes.top_cut && (
                  <div>
                    <span className="text-steel/50">Top Cut : </span>
                    {t.prizes.top_cut}
                  </div>
                )}
                {t.prizes.champion && (
                  <div>
                    <span className="text-steel/50">Champion : </span>
                    {t.prizes.champion}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wide text-steel/50 mb-1">
              Conditions d&rsquo;accès
            </div>
            <ul className="space-y-1 text-xs text-steel/90">
              {t.conditions.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-bright shrink-0">✓</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <a
        href={t.registration_url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary text-xs w-full text-center mt-3 block"
      >
        S&rsquo;inscrire via TCG+ →
      </a>
    </div>
  );
}

export default function TournamentsAsiaPage() {
  const [tournaments, setTournaments] = useState<MajorTournament[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("all");
  const [country, setCountry] = useState<CountryFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async (isRefresh = false) => {
    if (isRefresh) setBusy(true);
    else setState("loading");
    try {
      const res = await fetch("/api/tournaments-asia");
      const data = await res.json();
      if (!data.ok) throw new Error("Échec du chargement.");
      setTournaments(data.tournaments ?? []);
      setRefreshedAt(data.refreshedAt ?? null);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      if (isRefresh) setBusy(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = tournaments
    .filter((t) => tab === "all" || t.is_top_tier)
    .filter((t) => country === "all" || t.country_code === country);

  const countriesPresent = COUNTRY_ORDER.filter((c) => tournaments.some((t) => t.country_code === c));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="card-tile p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-ivory">🌏 Tournois Majeurs Asie</h1>
            <p className="text-xs text-textMuted mt-1 max-w-2xl">
              Calendrier des grands tournois officiels One Piece Card Game en Asie (Region 2 Bandai TCG+) —
              distinct du mode « Jour de Tournoi » qui sert à loguer tes propres parties en boutique. Liste
              organisée à partir des annonces officielles TCG+, pas un flux Bandai en direct (leur portail n&rsquo;a
              pas d&rsquo;API publique).
            </p>
            {refreshedAt && (
              <p className="text-[11px] text-steel/60 mt-1.5 font-mono">Actualisé le {formatRefreshedAt(refreshedAt)}</p>
            )}
          </div>
          <button onClick={() => load(true)} disabled={busy} className="btn btn-primary text-xs shrink-0">
            {busy ? "Actualisation..." : "🔄 Actualiser via Bandai TCG+"}
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-line flex flex-wrap gap-2">
          <button onClick={() => setTab("all")} className={`chip ${tab === "all" ? "chip-active" : ""}`}>
            Tous les Tournois
          </button>
          <button onClick={() => setTab("top")} className={`chip ${tab === "top" ? "chip-active" : ""}`}>
            ⭐ Les Meilleurs / Top Tiers
          </button>
        </div>

        {countriesPresent.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => setCountry("all")} className={`chip ${country === "all" ? "chip-active" : ""}`}>
              Tous pays
            </button>
            {countriesPresent.map((c) => (
              <button key={c} onClick={() => setCountry(c)} className={`chip ${country === c ? "chip-active" : ""}`}>
                {COUNTRY_FLAG[c]} {tournaments.find((t) => t.country_code === c)?.country_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {state === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card-tile p-5">
            <div className="skeleton h-40" />
          </div>
          <div className="card-tile p-5">
            <div className="skeleton h-40" />
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="card-tile p-5 text-xs text-danger">Impossible de charger le calendrier des tournois.</div>
      )}

      {state === "ready" && (
        <>
          {filtered.length === 0 ? (
            <div className="card-tile p-5 text-xs text-textMuted">Aucun tournoi ne correspond à ce filtre.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((t) => (
                <TournamentCard key={t.id} t={t} isExpanded={expanded.has(t.id)} onToggle={() => toggleExpanded(t.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
