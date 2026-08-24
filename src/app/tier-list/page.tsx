"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { OPPONENT_LEADERS } from "@/lib/planningData";
import { CardImage } from "@/components/CardImage";

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
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [addCardNumber, setAddCardNumber] = useState("");
  const [addName, setAddName] = useState("");
  const dragKey = useRef<string | null>(null);

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
    if (!confirm(`Retirer "${entry.displayName}" de la tier list ?`)) return;
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
    if (!confirm("Classer automatiquement selon les données onepiecetopdecks.com (comptage réel de decklists) ? Les leaders déjà déplacés à la main ne seront jamais touchés.")) return;
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

  return (
    <div className="space-y-6">
      <div className="card-tile p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h1 className="text-[28px] sm:text-3xl font-display font-bold text-white">Tier List de la méta</h1>
          <button onClick={autoClassify} disabled={busy} className="btn btn-primary">
            {busy ? "Classement..." : "🔄 Classer automatiquement (onepiecetopdecks.com)"}
          </button>
        </div>
        <p className="text-xs text-steel/60">
          Basé sur le nombre réel de decklists soumises par leader sur onepiecetopdecks.com (format japonais OP16) — le site n'a pas de tier list officielle, ce classement vient du comptage brut des decklists. Certains leaders récents n'ont pas encore de numéro de carte confirmé dans l'app : ils apparaissent en texte seul, marqués "à vérifier", plutôt qu'avec une image devinée.
        </p>
        {autoResult && (
          <div className="text-xs font-mono text-emerald-bright mt-2">
            {autoResult.applied} leader(s) classé(s), {autoResult.skippedManual} déjà déplacé(s) à la main donc ignoré(s), {autoResult.removed ?? 0} entrée(s) obsolète(s) nettoyée(s).
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
    </div>
  );
}
