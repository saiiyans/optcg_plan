"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { OPPONENT_LEADERS } from "@/lib/planningData";
import { CardImage } from "@/components/CardImage";
import { opColorHex } from "@/lib/opColors";
import { useConfirm } from "@/components/ConfirmDialogProvider";

// Petit cache mémoire pour ne pas refaire la requête si le même numéro de
// carte apparaît plusieurs fois pendant la session — même logique que
// CardThumb, mais volontairement autonome ici : la tier list a besoin d'un
// rendu compact sans lien cliquable ni libellé, pour ne pas gêner le
// glisser-déposer.
const tierImageCache = new Map<string, string | null>();
async function resolveTierImage(cardNumber: string): Promise<string | null> {
  if (tierImageCache.has(cardNumber)) return tierImageCache.get(cardNumber) ?? null;
  try {
    const res = await fetch(`/api/cards?q=${encodeURIComponent(cardNumber)}&limit=5&color=all`);
    const data = await res.json();
    const match = (data.cards ?? []).find((c: any) => c.cardNumber === cardNumber);
    const url = match?.imageUrl || null;
    tierImageCache.set(cardNumber, url);
    return url;
  } catch {
    return null;
  }
}

function TierCardImage({ cardNumber, label }: { cardNumber: string; label: string }) {
  const [url, setUrl] = useState<string | null>(tierImageCache.get(cardNumber) ?? null);
  useEffect(() => {
    let cancelled = false;
    if (tierImageCache.has(cardNumber)) return;
    resolveTierImage(cardNumber).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [cardNumber]);

  return (
    <CardImage
      src={url}
      alt={label}
      fallbackLabel={label}
      sizes="64px"
      fallbackTextClassName="text-[8px] font-mono text-steel/60 leading-tight line-clamp-3"
    />
  );
}

const TIERS = ["S", "A", "B", "C", "D"] as const;

// Couleurs de bande façon TierMaker — sobres mais lisibles, cohérentes
// avec le reste de l'app (pas de couleurs criardes).
const TIER_BAND_STYLE: Record<string, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
  B: "bg-[#ffdf7f]",
  C: "bg-[#bfff7f]",
  D: "bg-[#7fbfff]",
};

export default function TierListPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [addCardNumber, setAddCardNumber] = useState("");
  const [addName, setAddName] = useState("");
  const dragKey = useRef<string | null>(null);

  // Tier list "simulateur" (Card D. Kaizoku) — lecture seule, complètement
  // indépendante de la tier list éditable ci-dessus (pas de glisser-déposer,
  // pas de sauvegarde en base côté nous, voir /api/tier-list/simulator).
  const [simData, setSimData] = useState<any>(null);
  const [simState, setSimState] = useState<"loading" | "ready" | "error">("loading");
  const [simBusy, setSimBusy] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const loadSimulator = () => {
    setSimBusy(true);
    setSimError(null);
    fetch("/api/tier-list/simulator")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Échec de la récupération.");
        setSimData(d);
        setSimState("ready");
      })
      .catch((e) => {
        setSimError(e?.message ?? "Échec de la récupération.");
        setSimState((prev) => (prev === "ready" ? "ready" : "error"));
      })
      .finally(() => setSimBusy(false));
  };

  useEffect(loadSimulator, []);

  const load = () => {
    setState("loading");
    fetch("/api/tier-list")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setEntries(d.entries ?? []);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(load, []);

  function entryKey(e: any) {
    return e.cardNumber || e.id || e.displayName;
  }

  async function persistOrder(tier: string, orderedEntries: any[]) {
    await fetch("/api/tier-list/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, cardNumbers: orderedEntries.map((e) => e.cardNumber) }),
    });
  }

  async function moveTier(entry: any, tier: string) {
    // Déplace en fin de tier (dépôt sur la bande elle-même, pas sur une
    // carte précise) — utilisé aussi comme filet de sécurité.
    if (entry.tier === tier) return;
    const targetList = byTier[tier].filter((x) => entryKey(x) !== entryKey(entry));
    const newTargetList = [...targetList, entry];
    setEntries((prev) => prev.map((x) => (entryKey(x) === entryKey(entry) ? { ...x, tier, tierSource: "manual" } : x)));
    await fetch("/api/tier-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: entry.cardNumber || entry.displayName, tier, displayName: entry.displayName, color: entry.color }),
    });
    await persistOrder(tier, newTargetList);
  }

  // Repositionne précisément une carte à l'endroit où elle est déposée —
  // avant ou après la carte survolée, dans le même tier ou un autre.
  async function moveToPosition(entry: any, targetTier: string, targetEntry: any, before: boolean) {
    if (entryKey(entry) === entryKey(targetEntry)) return;

    const sourceTier = entry.tier;
    const changingTier = sourceTier !== targetTier;

    let newTargetList = byTier[targetTier].filter((x) => entryKey(x) !== entryKey(entry));
    const idx = newTargetList.findIndex((x) => entryKey(x) === entryKey(targetEntry));
    const insertAt = before ? idx : idx + 1;
    newTargetList = [...newTargetList.slice(0, insertAt), entry, ...newTargetList.slice(insertAt)];

    // Mise à jour optimiste immédiate — reflète tout de suite le nouvel
    // ordre calculé, sans attendre le rechargement après sauvegarde.
    const orderMap = new Map<string, number>();
    newTargetList.forEach((x, i) => orderMap.set(entryKey(x), i));
    setEntries((prev) =>
      prev.map((x) => {
        if (entryKey(x) === entryKey(entry)) {
          return { ...x, tier: targetTier, tierSource: "manual", order: orderMap.get(entryKey(entry)) ?? 0 };
        }
        if (orderMap.has(entryKey(x))) {
          return { ...x, order: orderMap.get(entryKey(x)) };
        }
        return x;
      })
    );

    if (changingTier) {
      await fetch("/api/tier-list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardNumber: entry.cardNumber || entry.displayName, tier: targetTier, displayName: entry.displayName, color: entry.color }),
      });
      const newSourceList = byTier[sourceTier].filter((x) => entryKey(x) !== entryKey(entry));
      await persistOrder(sourceTier, newSourceList);
    }
    await persistOrder(targetTier, newTargetList);
  }

  function onDragStart(entry: any) {
    dragKey.current = entryKey(entry);
  }
  function onDropOnTier(tier: string) {
    const entry = entries.find((e) => entryKey(e) === dragKey.current);
    if (entry) moveTier(entry, tier);
    dragKey.current = null;
  }
  function onDropOnCard(e: React.DragEvent, targetTier: string, targetEntry: any) {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    const entry = entries.find((x) => entryKey(x) === dragKey.current);
    if (entry) moveToPosition(entry, targetTier, targetEntry, before);
    dragKey.current = null;
  }

  async function removeEntry(entry: any) {
    if (!(await confirm(`Retirer "${entry.displayName}" de la tier list ?`))) return;
    await fetch(`/api/tier-list?cardNumber=${encodeURIComponent(entry.cardNumber || entry.displayName)}`, { method: "DELETE" });
    load();
  }

  async function addLeader() {
    if (!addName.trim()) return;
    const cardNumber = addCardNumber.trim() ? addCardNumber.trim().toUpperCase() : `CUSTOM-${addName.trim().toUpperCase().replace(/\s+/g, "-")}`;
    await fetch("/api/tier-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber, tier: "C", displayName: addName.trim() }),
    });
    setAddCardNumber("");
    setAddName("");
    load();
  }

  async function autoClassify() {
    if (!(await confirm("Classer automatiquement selon les decklists OP17 réellement soumises sur onepiecetopdecks.com (relecture en direct de la page) ? Les leaders déjà déplacés à la main ne seront jamais touchés."))) return;
    setBusy(true);
    const res = await fetch("/api/tier-list/auto-classify", { method: "POST" });
    const data = await res.json();
    setAutoResult(data);
    setBusy(false);
    load();
  }

  const byTier: Record<string, any[]> = { S: [], A: [], B: [], C: [], D: [] };
  for (const e of entries) (byTier[e.tier] ?? byTier.D).push(e);
  for (const t of TIERS) byTier[t].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Date de dernière actualisation persistée : le plus récent `updatedAt`
  // parmi les entrées "auto" — reste affiché après un rechargement de page,
  // pas seulement juste après un clic sur "Actualiser" (autoResult, lui,
  // redevient null au rechargement).
  const lastAutoUpdate = entries
    .filter((e) => e.tierSource === "auto" && e.updatedAt)
    .reduce((max: string, e) => (e.updatedAt > max ? e.updatedAt : max), "");
  const autoDisplayDate = autoResult?.capturedAt || lastAutoUpdate || null;

  const SIM_TIER_LABEL: Record<string, string> = {
    S: "Excellent",
    A: "Très bon",
    B: "Correct",
    C: "En dessous",
    D: "Faible",
  };

  return (
    <div className="space-y-6">
      {/* EN-TÊTE (refonte — style Nakama Companion "Rank the entire meta") */}
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Meta Tool</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Classe <span className="text-flame-gradient italic">toute la méta.</span>
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl">
          Glisse-dépose les leaders entre les rangs S à D, ou laisse le classement automatique s'appuyer sur les decklists réelles soumises.
        </p>
      </div>

      <div className="card-tile p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div>
            <h2 className="text-sm font-semibold text-ivory uppercase tracking-wide">Tier List de la méta — OP17</h2>
            <div className="text-[10px] font-mono text-steel/50 mt-0.5">
              {autoDisplayDate
                ? `Actualisé le ${new Date(autoDisplayDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${new Date(autoDisplayDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                : "Jamais actualisé"}
            </div>
          </div>
          <button onClick={autoClassify} disabled={busy} className="btn-flame">
            {busy ? "Classement..." : "🔄 Classer automatiquement (onepiecetopdecks.com)"}
          </button>
        </div>
        <p className="text-xs text-steel/60">
          Tier list de la méta <strong className="text-steel/80">OP17 « The World's Strongest Warriors »</strong>, calculée à chaque clic sur « Actualiser » à partir du nombre réel de decklists soumises par leader sur{" "}
          <a href="https://onepiecetopdecks.com/deck-list/english-op17-deck-list-the-worlds-strongest-warriors/" target="_blank" rel="noopener noreferrer" className="underline hover:text-steel/80">
            onepiecetopdecks.com
          </a>{" "}
          (page de decklists, comptage brut — le site n'a pas de tier list officielle). Ce format n'étant pas encore sorti en Occident, la grande majorité des decklists soumises viennent des premiers tournois/événements en ligne — pas exclusivement du Japon malgré ce qu'on pourrait attendre, le site agrège plusieurs régions (dont l'Europe). Certains leaders récents n'ont pas encore de numéro de carte confirmé dans l'app : ils apparaissent en texte seul, marqués "à vérifier", plutôt qu'avec une image devinée.
        </p>
        {autoResult && (
          <div className="text-xs font-mono text-emerald-bright mt-2">
            {autoResult.ok === false
              ? <span className="text-danger">{autoResult.error}</span>
              : <>{autoResult.applied} leader(s) classé(s), {autoResult.skippedManual} déjà déplacé(s) à la main donc ignoré(s), {autoResult.removed ?? 0} entrée(s) obsolète(s) nettoyée(s) — {autoResult.totalDecksScanned} decklists lues, {autoResult.distinctLeaders} leaders distincts.</>}
          </div>
        )}
      </div>

      <div className="card-tile p-4">
        <div className="text-[11px] font-mono uppercase text-steel/60 mb-2">Ajouter un leader à la tier list</div>
        <div className="flex flex-wrap gap-2">
          <input list="leader-suggestions" className="input flex-1 min-w-[180px]" placeholder="Nom du leader" value={addName} onChange={(e) => setAddName(e.target.value)} />
          <datalist id="leader-suggestions">
            {OPPONENT_LEADERS.map((l) => <option key={l} value={l} />)}
          </datalist>
          <input className="input w-48" placeholder="Numéro (ex. OP16-080) — facultatif" value={addCardNumber} onChange={(e) => setAddCardNumber(e.target.value)} />
          <button onClick={addLeader} className="btn">+ Ajouter (tier C par défaut)</button>
        </div>
      </div>

      {state === "loading" && <div className="card-tile p-5"><div className="skeleton h-64" /></div>}
      {state === "error" && <div className="card-tile p-5 text-xs text-danger">Impossible de charger la tier list.</div>}

      {state === "ready" && (
        <div className="card-tile p-0 overflow-hidden">
          {TIERS.map((tier) => (
            <div
              key={tier}
              className="flex border-b border-line last:border-b-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropOnTier(tier)}
            >
              <div className={`w-16 sm:w-20 shrink-0 flex items-center justify-center font-display font-bold text-2xl sm:text-3xl text-black ${TIER_BAND_STYLE[tier]}`}>
                {tier}
              </div>
              <div className="flex-1 flex flex-wrap gap-1.5 p-2 bg-panel2 min-h-[90px]">
                {byTier[tier].length === 0 && (
                  <div className="text-[10px] text-steel/40 flex items-center px-2">Glisse un leader ici</div>
                )}
                {byTier[tier].map((e) => (
                  <div
                    key={entryKey(e)}
                    draggable
                    onDragStart={() => onDragStart(e)}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={(ev) => onDropOnCard(ev, tier, e)}
                    onClick={() => {
                      if (e.cardNumber && !e.cardNumber.startsWith("CUSTOM-")) router.push(`/cards/${e.cardNumber}`);
                    }}
                    onDoubleClick={() => removeEntry(e)}
                    title={`${e.displayName}${e.deckCount ? ` — ${e.deckCount} decklists observées` : ""} — glisse sur une autre carte pour te positionner avant/après, clic pour la fiche, double-clic pour retirer`}
                    className="relative cursor-grab active:cursor-grabbing rounded overflow-hidden border border-line hover:border-emerald transition-colors bg-ink"
                    style={{ width: 72, height: 101, touchAction: "none" }}
                  >
                    {e.cardNumber && !e.cardNumber.startsWith("CUSTOM-") ? (
                      <TierCardImage cardNumber={e.cardNumber} label={e.displayName} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-center px-1">
                        <span className="text-[8px] font-mono text-steel/60 leading-tight">{e.displayName}</span>
                      </div>
                    )}
                    {/* Liseré de couleur — même code couleur (opColors.ts) que
                        les pastilles de /cards et /leaders, cohérence demandée
                        entre les trois zones. */}
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[3px]"
                      style={{ background: opColorHex(e.color) }}
                    />
                    {e.tierSource === "manual" && (
                      <span className="absolute top-0 right-0 text-[7px] bg-gold text-black px-1 rounded-bl">✎</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-steel/40">
        Glisse une carte d'une bande à l'autre pour la reclasser à la main. Double-clique une carte pour la retirer complètement de la tier list.
      </p>

      {/* ------------------------------------------------------------------
          Tier List "du simulateur" (Card D. Kaizoku) — complètement
          indépendante de la tier list éditable ci-dessus : pas de
          glisser-déposer, pas de sauvegarde côté nous. Classement basé sur
          un TAUX DE VICTOIRE réel (matchs enregistrés par les joueurs),
          alors que la tier list du dessus est basée sur un NOMBRE de
          decklists soumises — deux mesures différentes, volontairement
          présentées séparément plutôt que fusionnées.
      ------------------------------------------------------------------ */}
      <div className="pt-2">
        <span className="eyebrow-flame">✦ Deuxième source</span>
        <h2 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Tier List <span className="text-flame-gradient italic">du simulateur.</span>
        </h2>
        <p className="text-sm text-steel/70 mt-1.5 max-w-xl">
          Classement basé sur le taux de victoire réel (pas un nombre de decklists) — lecture seule, non éditable.
        </p>
      </div>

      <div className="card-tile p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-ivory uppercase tracking-wide">Tier List du simulateur — Card D. Kaizoku</h3>
            <div className="text-[10px] font-mono text-steel/50 mt-0.5">
              {simData?.statsFileDate
                ? `Données du ${new Date(simData.statsFileDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                : simState === "loading"
                ? "Chargement..."
                : "Pas encore de données"}
            </div>
          </div>
          <button onClick={loadSimulator} disabled={simBusy} className="btn">
            {simBusy ? "Actualisation..." : "🔄 Actualiser"}
          </button>
        </div>
        <p className="text-xs text-steel/60">
          Basé sur le taux de victoire pondéré ("Wtd WR") de vrais matchs enregistrés par les joueurs sur{" "}
          <a href="https://www.cardkaizoku.com/ranking" target="_blank" rel="noopener noreferrer" className="underline hover:text-steel/80">
            cardkaizoku.com/ranking
          </a>{" "}
          — une mesure de performance réelle, différente du comptage de decklists de la tier list ci-dessus. Seuls les leaders avec au moins 300 matchs enregistrés sont classés, pour éviter qu'un tout petit échantillon fausse le résultat.
        </p>
        {simError && (
          <div className="text-xs text-danger bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2 mt-2">
            {simError} {simData && "— les données ci-dessous restent celles de la dernière récupération réussie."}
          </div>
        )}
      </div>

      {simState === "loading" && !simData && <div className="card-tile p-5"><div className="skeleton h-64" /></div>}
      {simState === "error" && !simData && (
        <div className="card-tile p-5 text-xs text-danger">{simError ?? "Impossible de charger la tier list du simulateur."}</div>
      )}

      {simData?.entries && simData.entries.length > 0 && (
        <div className="card-tile p-0 overflow-hidden">
          {TIERS.map((tier) => {
            const rows = (simData.entries as any[]).filter((e) => e.tier === tier);
            return (
              <div key={tier} className="flex border-b border-line last:border-b-0">
                <div className={`w-16 sm:w-20 shrink-0 flex items-center justify-center font-display font-bold text-2xl sm:text-3xl text-black ${TIER_BAND_STYLE[tier]}`}>
                  {tier}
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5 p-2 bg-panel2 min-h-[90px]">
                  {rows.length === 0 && (
                    <div className="text-[10px] text-steel/40 flex items-center px-2">Aucun leader dans ce rang</div>
                  )}
                  {rows.map((e) => (
                    <div
                      key={e.cardNumber ?? e.displayName}
                      onClick={() => {
                        if (e.cardNumber) router.push(`/cards/${e.cardNumber}`);
                      }}
                      title={`${e.displayName} — ${e.weightedWinRatePct}% de victoires pondéré sur ${e.matches} matchs (${SIM_TIER_LABEL[tier]})`}
                      className="relative rounded overflow-hidden border border-line hover:border-emerald transition-colors bg-ink cursor-pointer"
                      style={{ width: 72, height: 101 }}
                    >
                      {e.cardNumber ? (
                        <TierCardImage cardNumber={e.cardNumber} label={e.displayName} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-center px-1">
                          <span className="text-[8px] font-mono text-steel/60 leading-tight">{e.displayName}</span>
                        </div>
                      )}
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[3px]"
                        style={{ background: opColorHex(e.color) }}
                      />
                      <span className="absolute top-0 left-0 right-0 text-center text-[7px] font-mono bg-ink/80 text-emerald-bright py-[1px]">
                        {e.weightedWinRatePct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-steel/40">
        Tier list en lecture seule — le pourcentage affiché est le taux de victoire pondéré sur le nombre de matchs indiqué au survol.
      </p>
    </div>
  );
}
