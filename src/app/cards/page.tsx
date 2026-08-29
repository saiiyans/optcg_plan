"use client";
import { useEffect, useState, useCallback } from "react";
import { CardTile, CardTileData } from "@/components/CardTile";
import { useRouter } from "next/navigation";
import { LEADERS } from "@/lib/leaders";
import { LeaderImage } from "@/components/LeaderImage";
import { OP_COLOR_HEX, hexToRgba } from "@/lib/opColors";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { ADMIN_HEADERS } from "@/lib/adminHeaders";

// Page entièrement pilotée par des données live (filtres, recherche,
// import en direct) — ne doit jamais être pré-générée statiquement au
// build, ce qui causait un crash au build ("Cannot read properties of
// undefined (reading 'toUpperCase')") quand Next.js tentait de
// pré-rendre la page sans contexte de requête réel.
export const dynamic = "force-dynamic";

function searchUrlForColor(color: string) {
  return `https://onepiece.limitlesstcg.com/cards/?q=${encodeURIComponent(
    `category:leader,character,event,stage color:${color} lang:en display:grid sort:id`
  )}`;
}

const ALL_IMPORT_COLORS = ["green", "red", "blue", "purple", "black", "yellow"] as const;

// Pastilles de couleur pour le filtre "Couleur" (refonte, style Nakama
// Companion) — source unique src/lib/opColors.ts, réutilisée partout
// ailleurs où une couleur OPTCG est affichée (ex. /leaders).
const COLOR_DOTS: { name: string; hex: string }[] = ["Red", "Blue", "Purple", "Black", "Yellow"].map((name) => ({
  name,
  hex: OP_COLOR_HEX[name],
}));

const EMPTY_FILTERS = {
  category: "",
  attribute: "",
  counter: "",
  maxCost: "",
  minStars: "",
  set: "",
  color: "",
  inDeckOnly: false,
  leaksOnly: false,
  reviewed: "",
  q: "",
};

export default function CardsPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const [leaderKey, setLeaderKey] = useState<string>("mihawk");
  const leader = LEADERS.find((l) => l.key === leaderKey) ?? LEADERS[0];
  const [cards, setCards] = useState<CardTileData[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 60;
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [importStatus, setImportStatus] = useState<string>("");
  const [importErrors, setImportErrors] = useState<{ cardNumber: string; error: string }[]>([]);
  const [importBusy, setImportBusy] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);

  const buildParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    params.set("leader", leaderKey);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    return params;
  }, [filters, leaderKey]);

  const [cardsError, setCardsError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setCardsError(null);
    try {
      let offset = 0;
      let all: any[] = [];
      let total = 0;
      let more = true;
      let pagesFetched = 0;
      while (more) {
        const res = await fetch(`/api/cards?${buildParams(offset).toString()}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data?.error ?? `Erreur ${res.status}`);
        all = all.concat(data.cards ?? []);
        total = data.total ?? 0;
        more = !!data.hasMore;
        offset += (data.cards ?? []).length;
        pagesFetched++;
        // Affichage progressif, mais pas à chaque page — sur Safari iPad,
        // des mises à jour trop rapprochées provoquaient des ré-affichages
        // en rafale qui perturbaient le chargement des images (lazy
        // loading). Une mise à jour toutes les 3 pages reste fluide sans
        // saccader le rendu.
        if (pagesFetched % 3 === 0 || !more) {
          setCards([...all]);
          setTotalFiltered(total);
        }
        if ((data.cards ?? []).length === 0) break; // sécurité anti-boucle infinie
      }
      setHasMore(false);
    } catch (e: any) {
      // Avant ce correctif : une réponse 500 à corps vide faisait planter
      // res.json() (SyntaxError "Unexpected end of JSON input"), l'erreur
      // n'était jamais rattrapée, et setLoading(false) n'était donc jamais
      // appelé — les cases de cartes restaient vides indéfiniment sans
      // aucun message. Le catch corrige à la fois le blocage et le silence.
      setCardsError(e?.message ?? "Impossible de charger les cartes.");
      setCards([]);
      setTotalFiltered(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/cards?${buildParams(cards.length).toString()}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error ?? `Erreur ${res.status}`);
      setCards((prev) => [...prev, ...(data.cards ?? [])]);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setCardsError(e?.message ?? "Impossible de charger la suite des cartes.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Stats du bandeau — désormais calculées entièrement côté base de
  // données (voir /api/library-stats), plus besoin de charger toutes les
  // cartes juste pour les compter.
  const [libraryTotal, setLibraryTotal] = useState<number | null>(null);
  const [libraryTotalAllColors, setLibraryTotalAllColors] = useState<number | null>(null);
  const [leaderStats, setLeaderStats] = useState<{ fiveStarCount: number; inDeckCount: number } | null>(null);
  const [coachProgress, setCoachProgress] = useState<{ deckReviewed: number; deckTotal: number; libraryReviewed: number; libraryTotal: number } | null>(null);
  const [statsError, setStatsError] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsError(false);
    try {
      const res = await fetch(`/api/library-stats?leader=${leaderKey}`);
      const d = await res.json();
      if (!d.ok) throw new Error();
      setLibraryTotal(d.library.totalGreenCards);
      setLibraryTotalAllColors(d.library.totalAllCards);
      setLeaderStats(d.leaderStats);
      setCoachProgress(d.coachProgress);
    } catch {
      setStatsError(true);
    }
  }, [leaderKey]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importColors, setImportColors] = useState<string[]>(["green"]);
  const [colorProgress, setColorProgress] = useState<{ color: string; index: number; total: number } | null>(null);

  // --- Génération de contenu Coach (traduction + explications) ---
  const COACH_COLOR_ORDER = ["Green", "Red", "Purple", "Yellow", "Black"];
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachStatus, setCoachStatus] = useState("");
  const [coachColorIdx, setCoachColorIdx] = useState<number | null>(null);
  const [coachDone, setCoachDone] = useState(0);
  const [coachErrors, setCoachErrors] = useState<{ cardNumber: string; error: string }[]>([]);

  async function runCoachGeneration() {
    if (!(await confirm("Générer le contenu Coach (traduction FR + explications) pour toutes les couleurs, dans l'ordre Vert → Rouge → Violet → Jaune → Noir ? Ça appelle l'API Gemini (gratuite) et peut prendre longtemps vu le volume de cartes."))) return;
    setCoachBusy(true);
    setCoachDone(0);
    setCoachErrors([]);
    let totalDone = 0;

    for (let i = 0; i < COACH_COLOR_ORDER.length; i++) {
      const color = COACH_COLOR_ORDER[i];
      setCoachColorIdx(i);
      let remaining = 1;
      while (remaining > 0) {
        setCoachStatus(`[${color}] Génération en cours... ${totalDone} carte(s) traitée(s) au total.`);
        const res = await fetch("/api/admin/generate-coach-content", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...ADMIN_HEADERS },
          body: JSON.stringify({ color, limit: 5 }),
        });
        const data = await res.json();
        if (!data.ok) {
          setCoachStatus(`[${color}] Erreur : ${data.error} — passage à la couleur suivante.`);
          break;
        }
        totalDone += data.processed ?? 0;
        setCoachDone(totalDone);
        if (data.results) {
          const errs = data.results.filter((r: any) => !r.ok).map((r: any) => ({ cardNumber: r.cardNumber, error: r.error }));
          if (errs.length) setCoachErrors((prev) => [...prev, ...errs]);
        }
        remaining = data.remaining ?? 0;
        if (data.processed === 0) break; // rien traité, on évite une boucle infinie
      }
    }

    setCoachColorIdx(null);
    setCoachStatus(`Génération terminée. ${totalDone} carte(s) traitée(s) au total.`);
    setCoachBusy(false);
  }

  function toggleImportColor(color: string) {
    setImportColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]));
  }

  async function runPreview() {
    setImportBusy(true);
    setImportStatus(`Comptage des cartes ${importColors[0] ?? "green"} sur Limitless...`);
    const res = await fetch(`/api/import/preview?mode=count&url=${encodeURIComponent(searchUrlForColor(importColors[0] ?? "green"))}`);
    const data = await res.json();
    setPreviewResult(data);
    setImportStatus(data.ok ? "" : `Erreur : ${data.error}`);
    setImportBusy(false);
  }

  async function runTest5() {
    setImportBusy(true);
    setImportStatus(`Test de l'importateur sur 5 cartes ${importColors[0] ?? "green"} réelles...`);
    const res = await fetch(`/api/import/preview?mode=test5&url=${encodeURIComponent(searchUrlForColor(importColors[0] ?? "green"))}`);
    const data = await res.json();
    setTestResult(data);
    setImportStatus(data.ok ? "Test terminé — vérifie les résultats ci-dessous." : `Erreur : ${data.error}`);
    setImportBusy(false);
  }

  // Import découpé en petits lots : chaque appel réseau traite ~15 cartes,
  // ce qui reste largement sous la limite de temps d'exécution d'une
  // fonction Vercel. L'ancienne approche (tout en une seule requête) se
  // faisait couper avant la fin sur un gros volume — ce n'était pas un
  // problème de contenu, juste un dépassement de temps.
  //
  // Pour plusieurs couleurs à la fois : même logique, répétée une couleur
  // après l'autre (jamais en parallèle) — scraper les 6 couleurs en une
  // seule requête de comptage dépasserait très largement les limites de
  // temps (~30s pour une couleur × 6 ≈ plusieurs minutes d'un coup), donc
  // chaque couleur reste une étape courte et sûre à elle seule, comme
  // avant.
  async function runFullImport() {
    if (importColors.length === 0) {
      alert("Sélectionne au moins une couleur à importer.");
      return;
    }
    const colorLabel = importColors.length === ALL_IMPORT_COLORS.length ? "toutes les couleurs" : importColors.join(", ");
    if (!(await confirm(`Importer les cartes ${colorLabel} (leaders compris) trouvées sur Limitless ? Avec plusieurs couleurs, cela peut prendre plusieurs minutes au total — tu peux garder l'onglet ouvert sans crainte de blocage.`))) return;

    setImportBusy(true);
    setImportErrors([]);

    let grandTotalImported = 0, grandTotalUpdated = 0, grandTotalSkipped = 0;
    const allErrorsAcrossColors: { cardNumber: string; error: string }[] = [];

    for (let colorIdx = 0; colorIdx < importColors.length; colorIdx++) {
      const color = importColors[colorIdx];
      setColorProgress({ color, index: colorIdx + 1, total: importColors.length });
      setImportStatus(`[${color}] Récupération de la liste complète des cartes...`);

      const url = searchUrlForColor(color);
      const listRes = await fetch(`/api/import/preview?mode=count&url=${encodeURIComponent(url)}`);
      const listData = await listRes.json();
      if (!listData.ok) {
        setImportStatus(`[${color}] Erreur : ${listData.error} — passage à la couleur suivante.`);
        continue;
      }
      const allNumbers: string[] = listData.allNumbers ?? [];
      const BATCH_SIZE = 15;
      const batches: string[][] = [];
      for (let i = 0; i < allNumbers.length; i += BATCH_SIZE) batches.push(allNumbers.slice(i, i + BATCH_SIZE));

      let logId: string | null = null;
      setImportProgress({ done: 0, total: allNumbers.length });

      for (let i = 0; i < batches.length; i++) {
        const isLast = i === batches.length - 1;
        const res: Response = await fetch("/api/import/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numbers: batches[i], sourceUrl: url, logId, finish: isLast }),
        });
        const data: any = await res.json();
        if (!data.ok) {
          setImportStatus(`[${color}] Erreur sur un lot : ${data.error} — les lots précédents restent importés, passage à la couleur suivante.`);
          break;
        }
        logId = data.logId;
        grandTotalImported += data.imported;
        grandTotalUpdated += data.updated;
        grandTotalSkipped += data.skipped;
        if (data.errors?.length) allErrorsAcrossColors.push(...data.errors);
        setImportProgress({ done: Math.min((i + 1) * BATCH_SIZE, allNumbers.length), total: allNumbers.length });
        setImportStatus(`[${color}] Import en cours... ${Math.min((i + 1) * BATCH_SIZE, allNumbers.length)} / ${allNumbers.length} cartes traitées.`);
      }
    }

    setImportStatus(`Import terminé (${colorLabel}) : ${grandTotalImported} ajoutées, ${grandTotalUpdated} mises à jour, ${grandTotalSkipped} erreurs.`);
    setImportErrors(allErrorsAcrossColors);
    setImportProgress(null);
    setColorProgress(null);
    setImportBusy(false);
    loadCards();
  }

  async function runSync() {
    setImportBusy(true);
    setImportStatus(`Recherche de nouvelles cartes ${importColors[0] ?? "green"}...`);
    const res = await fetch("/api/import/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: searchUrlForColor(importColors[0] ?? "green") }),
    });
    const data = await res.json();
    setImportStatus(
      data.ok ? `${data.newCardsDetected} nouvelle(s) carte(s) détectée(s) sur ${data.totalFoundOnSite}.` : `Erreur : ${data.error}`
    );
    setImportBusy(false);
  }

  async function runSeedCoach() {
    setImportBusy(true);
    setImportStatus("Chargement du contenu Coach rédigé à la main...");
    const res = await fetch("/api/admin/coach-content/seed", { method: "POST", headers: ADMIN_HEADERS });
    const data = await res.json();
    setImportStatus(
      data.ok
        ? `Contenu Coach chargé pour ${data.updated} carte(s). ${data.note ?? ""}`
        : `Erreur : ${data.error}`
    );
    setImportBusy(false);
    loadStats();
  }

  // --- Chips actifs, pour affichage + suppression individuelle ---
  const activeChips: { key: keyof typeof filters; label: string }[] = [];
  if (filters.category) activeChips.push({ key: "category", label: filters.category });
  if (filters.attribute) activeChips.push({ key: "attribute", label: filters.attribute });
  if (filters.counter) activeChips.push({ key: "counter", label: `Counter ${filters.counter === "none" ? "aucun" : "+" + filters.counter}` });
  if (filters.maxCost) activeChips.push({ key: "maxCost", label: `Cost ≤${filters.maxCost}` });
  if (filters.minStars) activeChips.push({ key: "minStars", label: `${filters.minStars}★+` });
  if (filters.set) activeChips.push({ key: "set", label: `Set ${filters.set}` });
  if (filters.color) activeChips.push({ key: "color", label: filters.color === "all" ? "Toutes couleurs" : `Couleur ${filters.color}` });
  if (filters.inDeckOnly) activeChips.push({ key: "inDeckOnly", label: "In My Deck" });
  if (filters.leaksOnly) activeChips.push({ key: "leaksOnly", label: "🔥 Leaks" });
  if (filters.reviewed) activeChips.push({ key: "reviewed", label: filters.reviewed === "true" ? "Coach Reviewed" : "Not Reviewed" });
  if (filters.q) activeChips.push({ key: "q", label: `"${filters.q}"` });

  function clearFilter(key: keyof typeof filters) {
    setFilters((f) => ({ ...f, [key]: key === "inDeckOnly" ? false : "" }));
  }

  function toggle(key: keyof typeof filters, value: string | boolean) {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? (typeof value === "boolean" ? false : "") : value }));
  }

  return (
    <div className="space-y-6">
      {/* EN-TÊTE (refonte — style Nakama Companion : eyebrow + titre gradient + sous-titre) */}
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece Card Game</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory">
          Bibliothèque de <span className="text-flame-gradient italic">cartes</span>
        </h1>
        <p className="text-sm text-steel/70 mt-1.5 max-w-xl">
          Toutes les cartes importées, filtrables par couleur, coût, catégorie et deck — base utilisée par le coach pour ses analyses.
        </p>
      </div>

      {/* SÉLECTEUR DE LEADER */}
      <div className="flex items-center gap-2 flex-wrap">
        {LEADERS.map((l) => (
          <button key={l.key} onClick={() => setLeaderKey(l.key)} className={`${leaderKey === l.key ? "btn btn-primary" : "btn"} flex items-center gap-2`}>
            <LeaderImage leaderKey={l.key} size={22} />
            {l.label}
          </button>
        ))}
        {leader.releaseNote && <span className="text-xs text-textMuted">{leader.releaseNote}</span>}
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsError ? (
          <div className="col-span-2 md:col-span-4">
            <RetryStats onRetry={loadStats} />
          </div>
        ) : (
          <>
            <StatTile value={libraryTotal ?? "…"} label="Green Cards" />
            <StatTile value={libraryTotalAllColors ?? "…"} label="Toutes couleurs" />
            <StatTile value={leaderKey === "mihawk" ? `${leaderStats?.inDeckCount ?? "…"}` : "—"} label="Cards In My Deck" />
            <StatTile value={leaderStats?.fiveStarCount ?? "…"} label={`5★ ${leader.label.split(" ")[0]}`} accent />
            <StatTile value={totalFiltered} label="Résultats filtrés" />
          </>
        )}
      </div>

      {/* COACH KNOWLEDGE BASE */}
      {coachProgress && (
        <div className="card-tile p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-2">🦅 Coach Knowledge Base</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono">
            <span>Deck cards reviewed : <span className={coachProgress.deckReviewed === coachProgress.deckTotal ? "text-emerald-bright" : "text-gold"}>{coachProgress.deckReviewed} / {coachProgress.deckTotal}</span> {coachProgress.deckReviewed === coachProgress.deckTotal && "✅"}</span>
            <span>Full library : <span className="text-steel/80">{coachProgress.libraryReviewed} / {coachProgress.libraryTotal}</span></span>
          </div>
        </div>
      )}
      <div className="card-tile p-4">
        <button onClick={() => setShowImport((s) => !s)} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-medium text-ivory">Update card database</span>
          <span className="text-textMuted text-xs">{showImport ? "Masquer ▲" : "Ouvrir ▼"}</span>
        </button>
        {showImport && (
          <div className="mt-4 pt-4 border-t border-line">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-textMuted mr-1">Couleur(s) à importer :</span>
              {ALL_IMPORT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleImportColor(c)}
                  disabled={importBusy}
                  className={`chip ${importColors.includes(c) ? "chip-active" : ""}`}
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => setImportColors(importColors.length === ALL_IMPORT_COLORS.length ? [] : [...ALL_IMPORT_COLORS])}
                disabled={importBusy}
                className="chip"
              >
                {importColors.length === ALL_IMPORT_COLORS.length ? "Aucune" : "Toutes"}
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3 text-xs text-textMuted flex-wrap">
              <StepPill n={1} label="Compter" />
              <span>→</span>
              <StepPill n={2} label="Tester" />
              <span>→</span>
              <StepPill n={3} label="Importer" />
              <span>→</span>
              <StepPill n={4} label="Synchroniser" />
            </div>
            {colorProgress && (
              <div className="text-xs font-mono text-emerald-bright mb-2">
                Couleur {colorProgress.index} / {colorProgress.total} : {colorProgress.color}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 mb-3">
              <button onClick={runPreview} disabled={importBusy} className="btn">1. Compter les cartes</button>
              <button onClick={runTest5} disabled={importBusy} className="btn">2. Tester sur 5 cartes</button>
              <button onClick={runFullImport} disabled={importBusy} className="btn btn-primary">3. Importer (confirmation requise)</button>
              <button onClick={runSync} disabled={importBusy} className="btn">4. Synchroniser les nouveautés</button>
              <button onClick={runSeedCoach} disabled={importBusy} className="btn btn-primary">🦅 Charger le contenu Coach (deck actuel)</button>
            </div>
            <div className="text-xs text-textMuted mb-2">
              L'import calcule la note de chaque carte pour Mihawk.
            </div>
            {importProgress && (
              <div className="mb-2">
                <div className="w-full h-2 bg-panel2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-dim transition-all"
                    style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-textMuted mt-1">{importProgress.done} / {importProgress.total} cartes</div>
              </div>
            )}
            {importStatus && <div className="text-xs text-steel">{importStatus}</div>}

            {importErrors.length > 0 && (
              <div className="mt-3 text-xs">
                <div className="text-danger mb-1">
                  {importErrors.length} carte(s) en erreur — messages groupés (jusqu'à 5 exemples par type) :
                </div>
                <div className="bg-panel2 p-3 rounded-lg font-mono max-h-64 overflow-y-auto space-y-2">
                  {Object.entries(
                    importErrors.reduce<Record<string, string[]>>((acc, e) => {
                      (acc[e.error] ??= []).push(e.cardNumber);
                      return acc;
                    }, {})
                  ).map(([message, cardNumbers]) => (
                    <div key={message}>
                      <div className="text-danger">{message} <span className="text-steel/60">({cardNumbers.length} carte(s))</span></div>
                      <div className="text-steel/60">{cardNumbers.slice(0, 5).join(", ")}{cardNumbers.length > 5 ? "…" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewResult && (
              <div className="mt-3 text-xs font-mono bg-panel2 p-3 rounded-lg">
                <div>Cartes trouvées sur le site : <b className="text-emerald-bright">{previewResult.totalFoundOnSite}</b></div>
                <div>Numéros collectés après pagination : <b>{previewResult.totalCollected}</b></div>
                <div>Correspondance : {previewResult.matches ? "✓ OK" : "⚠ à vérifier avant import"}</div>
              </div>
            )}

            {testResult && (
              <div className="mt-3">
                <div className="text-xs text-textMuted mb-2">
                  Aperçu — {testResult.sample?.length ?? 0} carte(s) testée(s) sur {testResult.totalFoundOnSite} trouvées. {testResult.errors?.length ? `${testResult.errors.length} erreur(s).` : "Aucune erreur."}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {testResult.sample?.map((c: any) => (
                    <div key={c.cardNumber} className="bg-panel2 p-2.5 rounded-lg text-xs">
                      <div className="text-ivory font-medium">{c.name} — <span className="font-mono">{c.cardNumber}</span></div>
                      <div className="text-textMuted mt-0.5">{c.category} · Cost {c.cost} · {c.power} Pwr · {c.attribute} · Ctr +{c.counter}</div>
                    </div>
                  ))}
                </div>
                {!!testResult.errors?.length && (
                  <div className="mt-2 text-xs text-danger">
                    {testResult.errors.map((e: any) => `${e.cardNumber}: ${e.error}`).join(" | ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GÉNÉRATION CONTENU COACH — traduction + explications, via API Gemini (gratuite) */}
      <div className="card-tile p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ivory">Contenu Coach (traduction FR + explications)</h3>
        </div>
        <p className="text-xs text-textMuted mt-1 mb-3">
          Génère automatiquement, pour chaque carte pas encore traitée : traduction française du texte officiel, explication pédagogique, et — selon la couleur — analyse Mihawk ou impact matchup. Ordre : Vert → Rouge → Violet → Jaune → Noir.
        </p>
        <button onClick={runCoachGeneration} disabled={coachBusy} className="btn btn-primary">
          {coachBusy ? "Génération en cours..." : "Générer le contenu Coach (toutes couleurs)"}
        </button>
        {coachColorIdx !== null && (
          <div className="text-xs font-mono text-emerald-bright mt-2">
            Couleur {coachColorIdx + 1} / {COACH_COLOR_ORDER.length} : {COACH_COLOR_ORDER[coachColorIdx]}
          </div>
        )}
        {coachStatus && <div className="text-xs text-steel mt-2">{coachStatus}</div>}
        {coachErrors.length > 0 && (
          <div className="mt-3 text-xs">
            <div className="text-danger mb-1">{coachErrors.length} carte(s) en erreur :</div>
            <div className="bg-panel2 p-3 rounded-lg font-mono max-h-48 overflow-y-auto space-y-1">
              {coachErrors.slice(0, 20).map((e, i) => (
                <div key={i} className="text-steel/70">{e.cardNumber} : <span className="text-danger">{e.error}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RECHERCHE — style relevé à l'identique sur
          nakamacompanion.com/collection (fond translucide 5%, bordure 16%,
          coins 10px : voir .input dans globals.css). */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted text-sm">⌕</span>
        <input
          placeholder="Search by name, card number or effect…"
          className="input w-full pl-9"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
      </div>

      {/* CHIPS RAPIDES */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => toggle("category", "Character")} className={`chip ${filters.category === "Character" ? "chip-active" : ""}`}>Character</button>
        <button onClick={() => toggle("category", "Event")} className={`chip ${filters.category === "Event" ? "chip-active" : ""}`}>Event</button>
        <button onClick={() => toggle("category", "Stage")} className={`chip ${filters.category === "Stage" ? "chip-active" : ""}`}>Stage</button>
        <button onClick={() => toggle("attribute", "Slash")} className={`chip ${filters.attribute === "Slash" ? "chip-active" : ""}`}>Slash</button>
        <button onClick={() => toggle("counter", "2000")} className={`chip ${filters.counter === "2000" ? "chip-active" : ""}`}>Counter +2000</button>
        <button onClick={() => toggle("maxCost", "5")} className={`chip ${filters.maxCost === "5" ? "chip-active" : ""}`}>Cost ≤5</button>
        {leaderKey === "mihawk" && (
          <button onClick={() => toggle("inDeckOnly", true)} className={`chip ${filters.inDeckOnly ? "chip-active" : ""}`}>In My Deck</button>
        )}
        <button onClick={() => toggle("leaksOnly", true)} className={`chip ${filters.leaksOnly ? "chip-active" : ""}`}>🔥 Leaks</button>
        <button onClick={() => toggle("reviewed", "true")} className={`chip ${filters.reviewed === "true" ? "chip-active" : ""}`}>✓ Coach Reviewed</button>
        <button onClick={() => toggle("reviewed", "false")} className={`chip ${filters.reviewed === "false" ? "chip-active" : ""}`}>○ Not Reviewed</button>
        <button onClick={() => setShowAdvanced((s) => !s)} className="chip ml-auto">
          All filters {activeChips.length > 0 && <span className="text-emerald-bright">({activeChips.length})</span>}
        </button>
      </div>

      {/* FILTRE PAR SET (OP16, ST32, EB01...) — se combine avec tous les autres */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-textMuted mr-1">Set :</span>
        {["OP", "ST", "EB", "PRB", "OP17"].map((prefix) => (
          <button key={prefix} onClick={() => toggle("set", prefix)} className={`chip ${filters.set === prefix ? "chip-active" : ""}`}>
            {prefix}
          </button>
        ))}
        <input
          className="input text-xs py-1.5 px-2.5 w-28"
          placeholder="ex. OP16, ST32"
          value={filters.set}
          onChange={(e) => setFilters((f) => ({ ...f, set: e.target.value }))}
        />
      </div>

      {/* FILTRE PAR COULEUR — pastilles relevées à l'identique sur
          nakamacompanion.com/collection : pilule avec point de 12px, et à
          l'état actif un fond teinté à 15% de la couleur + bordure pleine +
          texte blanc gras (pas la pilule emerald générique de .chip-active,
          chaque couleur garde SA teinte quand elle est sélectionnée).
          "Vert" reste le comportement par défaut de l'app (deck Mihawk) ;
          "Toutes" retire le filtre couleur côté API. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-textMuted mr-1">Couleur :</span>
        <ColorChip label="Vert (défaut)" hex={OP_COLOR_HEX.Green} active={filters.color === ""} onClick={() => setFilters((f) => ({ ...f, color: "" }))} />
        {COLOR_DOTS.map(({ name, hex }) => (
          <ColorChip key={name} label={name} hex={hex} active={filters.color === name} onClick={() => toggle("color", name)} />
        ))}
        <button onClick={() => setFilters((f) => ({ ...f, color: "all" }))} className={`chip ${filters.color === "all" ? "chip-active" : ""}`}>
          Toutes
        </button>
      </div>

      {/* FILTRE ÉTOILES — 1 à 5, se combine avec tous les autres */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-textMuted mr-1">{leader.label.split(" ")[0]} :</span>
        {["1", "2", "3", "4", "5"].map((n) => (
          <button key={n} onClick={() => toggle("minStars", n)} className={`chip ${filters.minStars === n ? "chip-active" : ""}`}>
            {n}★+
          </button>
        ))}
      </div>

      {/* PANNEAU DE FILTRES AVANCÉS */}
      {showAdvanced && (
        <div className="card-tile p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-textMuted block mb-1">Attribute</label>
            <select className="input w-full" value={filters.attribute} onChange={(e) => setFilters((f) => ({ ...f, attribute: e.target.value }))}>
              <option value="">Tout attribut</option>
              <option value="Slash">Slash</option>
              <option value="Strike">Strike</option>
              <option value="Wisdom">Wisdom</option>
              <option value="Special">Special</option>
              <option value="Ranged">Ranged</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-textMuted block mb-1">Counter</label>
            <select className="input w-full" value={filters.counter} onChange={(e) => setFilters((f) => ({ ...f, counter: e.target.value }))}>
              <option value="">Tout Counter</option>
              <option value="2000">Counter +2000</option>
              <option value="1000">Counter +1000</option>
              <option value="none">Sans Counter</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-textMuted block mb-1">Cost</label>
            <select className="input w-full" value={filters.maxCost} onChange={(e) => setFilters((f) => ({ ...f, maxCost: e.target.value }))}>
              <option value="">Tout coût</option>
              <option value="5">Coût 5 ou moins</option>
              <option value="3">Coût 3 ou moins</option>
              <option value="1">Coût 1</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-textMuted block mb-1">{leader.label.split(" ")[0]} rating</label>
            <select className="input w-full" value={filters.minStars} onChange={(e) => setFilters((f) => ({ ...f, minStars: e.target.value }))}>
              <option value="">Toute note</option>
              <option value="4">4-5 étoiles</option>
              <option value="3">3+ étoiles</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-textMuted block mb-1">Set</label>
            <input className="input w-full" placeholder="ex. OP14, EB01, ST32" value={filters.set} onChange={(e) => setFilters((f) => ({ ...f, set: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-textMuted block mb-1">Card type</label>
            <select className="input w-full" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
              <option value="">Toutes catégories</option>
              <option value="Leader">Leader</option>
              <option value="Character">Character</option>
              <option value="Event">Event</option>
              <option value="Stage">Stage</option>
            </select>
          </div>
        </div>
      )}

      {/* CHIPS ACTIFS + CLEAR ALL */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeChips.map((c) => (
            <button key={c.key} onClick={() => clearFilter(c.key)} className="chip chip-active">
              {c.label} <span className="ml-1">✕</span>
            </button>
          ))}
          <button onClick={() => setFilters({ ...EMPTY_FILTERS })} className="text-xs text-textMuted hover:text-ivory underline">
            Clear all
          </button>
        </div>
      )}

      {/* GRILLE */}
      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="skeleton w-full aspect-[5/7]" style={{ borderRadius: 10 }} />
          ))}
        </div>
      ) : cardsError ? (
        <div className="card-tile p-8 text-center">
          <div className="text-danger font-medium mb-1">Impossible de charger les cartes</div>
          <div className="text-sm text-textMuted mb-3">{cardsError}</div>
          <button onClick={loadCards} className="btn text-xs py-1.5 px-3">Réessayer</button>
        </div>
      ) : cards.length === 0 ? (
        <div className="card-tile p-8 text-center">
          <div className="text-ivory font-medium mb-1">Aucune carte trouvée</div>
          <div className="text-sm text-textMuted">
            Aucune carte en base pour ce filtre. Ouvre "Update card database" ci-dessus et lance l'import complet pour commencer.
          </div>
        </div>
      ) : (
        <>
          {/* Grille relevée à l'identique sur nakamacompanion.com/collection
              (voir .card-grid dans globals.css : auto-fill, pas de paliers
              fixes par breakpoint). */}
          <div className="card-grid">
            {cards.map((c) => (
              <CardTile key={c.cardNumber} card={c} onSelect={(n) => router.push(`/cards/${n}`)} />
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="text-xs text-textMuted">{cards.length} / {totalFiltered} cartes affichées</div>
            {hasMore && (
              <button onClick={loadMore} disabled={loadingMore} className="btn">
                {loadingMore ? "Chargement..." : "Charger plus"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="stat-tile">
      <div className={`text-2xl font-semibold ${accent ? "text-gold" : "text-ivory"}`}>{value}</div>
      <div className="text-[11px] text-textMuted mt-0.5">{label}</div>
    </div>
  );
}

function RetryStats({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="stat-tile flex items-center justify-between">
      <span className="text-xs text-danger">Impossible de charger les statistiques.</span>
      <button onClick={onRetry} className="btn text-xs py-1.5 px-3">Réessayer</button>
    </div>
  );
}

// Pastille de filtre couleur — relevée à l'identique sur
// nakamacompanion.com/collection : point de 12px + libellé, et à l'état actif
// un fond teinté à 15% de SA couleur (pas la teinte emerald générique des
// autres chips) avec bordure pleine et texte blanc gras.
function ColorChip({ label, hex, active, onClick }: { label: string; hex: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-sm px-3.5 py-2 rounded-full inline-flex items-center gap-1.5 whitespace-nowrap transition-colors duration-150"
      style={
        active
          ? { background: hexToRgba(hex, 0.15), border: `0.8px solid ${hex}`, color: "#fff", fontWeight: 600 }
          : { background: "transparent", border: "0.8px solid rgba(255,255,255,0.16)", color: "#a0a0a0", fontWeight: 500 }
      }
    >
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: hex }} />
      {label}
    </button>
  );
}

function StepPill({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-4 rounded-full bg-panel2 border border-line flex items-center justify-center text-[9px]">{n}</span>
      {label}
    </span>
  );
}
