import Link from "next/link";
import { db } from "@/lib/db";
import { compareWithMyDeck } from "@/lib/deckCompare";
import { notFound } from "next/navigation";
import { SaveDeckButton } from "@/components/SaveDeckButton";
import { DuplicateDeckButton } from "@/components/DuplicateDeckButton";
import { CardImage } from "@/components/CardImage";

export default async function DeckDetail({ params }: { params: { id: string } }) {
  const deck = await db.tournamentDeck.findUnique({ where: { id: params.id }, include: { cards: true } });
  if (!deck) notFound();

  const comparison = compareWithMyDeck(deck.cards.map((c) => ({ cardNumber: c.cardNumber, quantity: c.quantity })));

  // Jointure avec la Green Card Library pour récupérer l'image + le nom de
  // chaque carte, quand elle a déjà été importée. Une carte pas encore
  // importée s'affiche simplement sans image plutôt que de casser la page.
  const libraryCards = await db.card.findMany({
    where: { cardNumber: { in: deck.cards.map((c) => c.cardNumber) } },
    select: { cardNumber: true, imageUrl: true, name: true },
  });
  const imageByCard = new Map(libraryCards.map((c) => [c.cardNumber, c]));
  const missingCount = deck.cards.filter((c) => !imageByCard.has(c.cardNumber)).length;

  // Parties du Journal associées comme testant/s'inspirant de ce deck
  // gagnant — jamais de fausse conclusion : le composant AssociatedMatches
  // affiche juste le décompte réel, sans winrate garanti fiable si
  // l'échantillon est trop petit.
  const associatedMatches = await db.match.findMany({
    where: { inspiredByDeckId: deck.id, deletedAt: null },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="card-tile p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-steel/60">{deck.leaderCardNumber} · {deck.format}</div>
            <h2 className="text-[26px] sm:text-3xl font-display font-bold text-white">
              {deck.deckName} — {deck.player} <span className="text-steel/60 text-lg sm:text-xl">· {deck.date}</span>
            </h2>
            <div className="text-sm font-mono text-steel/80 mt-1">
              {deck.tournamentType} · {deck.country} · {deck.host}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {deck.status === "winner" && <span className="badge badge-gold">Winner</span>}
            {deck.undefeated && <span className="badge badge-green">Undefeated ({deck.wins}-{deck.losses})</span>}
            {deck.status === "top_performer" && <span className="badge">Top Cut</span>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <SaveDeckButton deckId={deck.id} initialSaved={deck.savedToMyDecks} />
          <DuplicateDeckButton deckId={deck.id} asTest={false} label="⎘ Dupliquer dans Mes Decks" />
          <DuplicateDeckButton deckId={deck.id} asTest={true} label="🧪 Créer une version de test" />
        </div>
        <div className="mt-3 text-xs font-mono text-steel/60 break-all">
          Source : <a href={deck.sourceUrl} className="underline">{deck.sourceUrl}</a> · Importé le {new Date(deck.importedAt).toLocaleDateString("fr-FR")}
        </div>
      </div>

      <div className="card-tile p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
          Liste complète ({deck.cardCountNonLeader} cartes hors Leader)
        </h3>
        {missingCount > 0 && (
          <div className="text-xs font-mono text-steel/60 mb-3 bg-panel2 rounded-lg p-3">
            {missingCount} carte{missingCount > 1 ? "s" : ""} sans image — pas encore importée{missingCount > 1 ? "s" : ""} dans la Bibliothèque :{" "}
            <span className="text-white">
              {deck.cards.filter((c) => !imageByCard.has(c.cardNumber)).map((c) => c.cardNumber).join(", ")}
            </span>
            . Va sur l'onglet Bibliothèque et clique "3. Importer" — la Synchronisation ne fait qu'un aperçu, seul l'import complet les récupère vraiment.
          </div>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {deck.cards.map((c) => {
            const lib = imageByCard.get(c.cardNumber);
            return (
              <Link
                key={c.id}
                href={`/cards/${c.cardNumber}`}
                className="card-tile p-1.5 block hover:border-emerald transition-colors"
              >
                <div className="relative w-full aspect-[5/7] bg-panel2 rounded-sm overflow-hidden">
                  <CardImage
                    src={lib?.imageUrl}
                    alt={lib?.name ?? c.cardNumber}
                    fallbackLabel={c.cardNumber}
                    sizes="140px"
                    loading="lazy"
                  />
                  <span className="absolute top-1 right-1 bg-emerald-dim text-emerald-bright text-[10px] font-mono px-1.5 py-0.5 rounded">
                    x{c.quantity}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-steel/60 mt-1 truncate">{c.cardNumber}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card-tile p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
          Comparaison avec ma decklist
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
          <div className="bg-panel2 rounded-lg p-2.5">
            <div className="text-lg font-mono text-emerald-bright">{comparison.identicalCount}</div>
            <div className="text-[10px] text-steel/60">identiques</div>
          </div>
          <div className="bg-panel2 rounded-lg p-2.5">
            <div className="text-lg font-mono text-gold">{comparison.differentQuantityCount}</div>
            <div className="text-[10px] text-steel/60">quantités à ajuster</div>
          </div>
          <div className="bg-panel2 rounded-lg p-2.5">
            <div className="text-lg font-mono text-emerald-bright">+{comparison.exemplairesToAdd}</div>
            <div className="text-[10px] text-steel/60">exemplaires à ajouter</div>
          </div>
          <div className="bg-panel2 rounded-lg p-2.5">
            <div className="text-lg font-mono text-red-400">-{comparison.exemplairesToRemove}</div>
            <div className="text-[10px] text-steel/60">exemplaires à retirer</div>
          </div>
        </div>
        <div className="text-sm text-white mb-4">
          Similarité : <b className="text-gold">{comparison.similarityPercent}%</b>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {comparison.differentQuantity.length > 0 && (
            <div className="md:col-span-2">
              <div className="text-[11px] font-mono uppercase text-gold mb-1">Quantité différente</div>
              {comparison.differentQuantity.map((r) => (
                <div key={r.cardNumber} className="text-xs font-mono text-steel/80">
                  {r.cardNumber} — Mon deck : {r.myQuantity} · Deck gagnant : {r.winningQuantity} · {r.difference > 0 ? `Ajouter ${r.difference}` : `Retirer ${-r.difference}`}
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="text-[11px] font-mono uppercase text-emerald-bright mb-1">Présentes uniquement dans ce deck gagnant</div>
            {comparison.onlyInWinningDeck.length === 0 ? (
              <div className="text-xs text-steel/50">Aucune.</div>
            ) : (
              comparison.onlyInWinningDeck.map((r) => (
                <div key={r.cardNumber} className="text-xs font-mono text-steel/80">{r.cardNumber} — Ajouter {r.winningQuantity}</div>
              ))
            )}
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-red-400 mb-1">Présentes uniquement dans mon deck</div>
            {comparison.onlyInMyDeck.length === 0 ? (
              <div className="text-xs text-steel/50">Aucune.</div>
            ) : (
              comparison.onlyInMyDeck.map((r) => (
                <div key={r.cardNumber} className="text-xs font-mono text-steel/80">{r.cardNumber} — Retirer {r.myQuantity}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card-tile p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
          Parties associées du Journal ({associatedMatches.length})
        </h3>
        <p className="text-xs text-steel/60 mb-3">
          Parties que tu as marquées comme testant les idées de ce deck gagnant — coche cette option en enregistrant une partie dans le Journal.
        </p>
        {associatedMatches.length === 0 ? (
          <div className="text-xs font-mono text-steel/60">Aucune partie associée pour l'instant.</div>
        ) : (
          <>
            <div className="text-sm text-white mb-2">
              {associatedMatches.filter((m) => m.result === "Victoire").length} victoire(s) sur {associatedMatches.length} partie(s) testées
              {associatedMatches.length < 5 && <span className="text-steel/50"> — échantillon encore petit, à prendre avec prudence.</span>}
            </div>
            <div className="space-y-1">
              {associatedMatches.map((m) => (
                <div key={m.id} className="text-xs font-mono text-steel/80 flex justify-between">
                  <span>{m.date} — vs {m.opponentLeader}</span>
                  <span className={m.result === "Victoire" ? "text-emerald-bright" : "text-red-400"}>{m.result}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
