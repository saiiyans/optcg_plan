import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { findDeckQuantity } from "@/lib/deckReference";
import { EditableStarRating } from "@/components/EditableStarRating";
import { toMihawkTier, deriveMihawkTags } from "@/lib/mihawkTier";
import { BackButton } from "@/components/BackButton";
import { computeLeaderTournamentStats } from "@/lib/leaderTournamentStats";
import { LEADERS } from "@/lib/leaders";
import { notFound } from "next/navigation";
import { CardThumb } from "@/components/CardThumb";

export default async function CardDetail({ params }: { params: { cardNumber: string } }) {
  const cardNumber = params.cardNumber.toUpperCase();
  const card = await db.card.findUnique({
    where: { cardNumber },
    include: { ratings: true, prints: true },
  });
  if (!card) notFound();

  const deckQty = findDeckQuantity(card.cardNumber);
  // Préfère l'image locale (public/cards/...) à l'URL distante Limitless,
  // sans jamais modifier imageUrl en base — voir /api/admin/link-local-images.
  const displayImageUrl = card.localImagePath || card.imageUrl;
  const leaderPanels = await Promise.all(
    LEADERS.map(async (leader) => ({
      leader,
      rating: card.ratings.find((r) => r.leaderContext === leader.leaderContext) ?? null,
      stats: await computeLeaderTournamentStats(card.cardNumber, leader.key),
    }))
  );

  return (
    <div>
      <BackButton />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
      <div className="space-y-3">
        <div className="relative w-full aspect-[5/7] card-tile overflow-hidden">
          {displayImageUrl && <Image src={displayImageUrl} alt={card.name} fill className="object-cover" />}
        </div>
        {card.prints.length > 0 && (
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Autres illustrations</div>
            <div className="grid grid-cols-3 gap-1.5">
              {card.prints.map((p) => (
                <div key={p.id} className="relative aspect-[5/7] overflow-hidden card-tile">
                  <Image src={p.imageUrl} alt={p.printLabel} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <div className="text-xs font-mono text-steel/60">{card.cardNumber} · {card.setCode} · {card.rarity ?? "—"}</div>
          <h2 className="text-2xl sm:text-3xl font-display text-white">{card.name}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="badge">{card.category}</span>
            <span className="badge">{card.color}</span>
            {card.attribute && <span className="badge">{card.attribute}</span>}
            <span className={`badge ${card.legalityStatus?.toLowerCase().includes("illegal") ? "badge-red" : "badge-green"}`}>
              {card.legalityStatus ?? "Légalité inconnue"}
            </span>
            {deckQty > 0 && <span className="badge badge-gold">x{deckQty} — Dans mon deck Mihawk</span>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat label="Coût" value={card.cost ?? "—"} />
          <Stat label="Puissance" value={card.power ?? "—"} />
          <Stat label="Counter" value={card.counter ? `+${card.counter}` : "—"} />
          <Stat label="Bloc" value={card.block ?? "—"} />
        </div>

        <div className="card-tile p-4 space-y-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">How It Works 🇬🇧</div>
            <p className="text-sm text-white leading-relaxed">
              {card.coachReviewed && card.coachExplanationEn ? card.coachExplanationEn : "Coach explanation coming soon."}
            </p>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Comment elle fonctionne 🇫🇷</div>
            <p className="text-sm text-white leading-relaxed">
              {card.coachReviewed && card.coachExplanationFr ? card.coachExplanationFr : "Explication à venir."}
            </p>
          </div>
          <div className="pt-2 border-t border-line">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1">🦅 Mihawk Analysis</div>
            {card.coachReviewed && card.mihawkAnalysisFr ? (
              <>
                <p className="text-sm text-steel/90 leading-relaxed mb-2">{card.mihawkAnalysisFr}</p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {card.mihawkPros && (
                    <div>
                      <div className="text-emerald-bright font-mono uppercase text-[10px] mb-1">Pros</div>
                      {(JSON.parse(card.mihawkPros) as string[]).map((p) => <div key={p} className="text-steel/80">✓ {p}</div>)}
                    </div>
                  )}
                  {card.mihawkCons && (
                    <div>
                      <div className="text-red-400 font-mono uppercase text-[10px] mb-1">Cons</div>
                      {(JSON.parse(card.mihawkCons) as string[]).map((c) => <div key={c} className="text-steel/80">✗ {c}</div>)}
                    </div>
                  )}
                </div>
                {card.mihawkCommonUse && (
                  <div className="mt-2 text-xs"><span className="text-gold font-mono uppercase text-[10px]">Common use — </span><span className="text-steel/80">{card.mihawkCommonUse}</span></div>
                )}
                {card.mihawkCommonMistake && (
                  <div className="mt-1 text-xs"><span className="text-gold font-mono uppercase text-[10px]">Common mistake — </span><span className="text-steel/80">{card.mihawkCommonMistake}</span></div>
                )}
                {card.mihawkSynergies && JSON.parse(card.mihawkSynergies).length > 0 && (
                  <div className="mt-2 text-xs flex items-start gap-2 flex-wrap">
                    <span className="text-gold font-mono uppercase text-[10px] pt-2">Synergies —</span>
                    {(JSON.parse(card.mihawkSynergies) as string[]).map((s) => (
                      <CardThumb key={s} cardNumber={s} size={48} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-steel/60">No Mihawk analysis available yet.</p>
            )}
          </div>
        </div>

        <div className="card-tile p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-2">Texte officiel</div>
          <p className="text-sm text-white leading-relaxed">{card.officialText ?? "Aucun effet On Play/Activate détecté."}</p>
          {card.triggerText && (
            <p className="text-sm text-emerald-bright mt-2">[Trigger] {card.triggerText}</p>
          )}
          <div className="text-xs text-steel/60 mt-3">Types : {card.types || "—"}</div>
        </div>

        {(() => {
          const tags = deriveMihawkTags(card);
          return tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="badge badge-green">{t}</span>
              ))}
            </div>
          ) : null;
        })()}

        {/* Compatibilité par leader, côte à côte */}
        <div className="grid md:grid-cols-2 gap-4">
          {leaderPanels.map(({ leader, rating, stats }) => (
            <div key={leader.key} className="card-tile p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`badge ${leader.badgeClass}`}>{leader.label}</span>
                {rating && (() => {
                  const tier = toMihawkTier(rating.stars);
                  return (
                    <span className={`text-sm font-mono font-bold ${tier.color}`}>
                      {tier.tier} <span className="text-xs text-steel/60">({tier.score10}/10)</span>
                    </span>
                  );
                })()}
              </div>

              {rating ? (
                <>
                  <EditableStarRating
                    cardNumber={card.cardNumber}
                    leaderContext={leader.leaderContext}
                    initialStars={rating.stars}
                    initialIsManualOverride={rating.isManualOverride}
                  />
                  <p className="text-sm text-steel/90">{rating.justification}</p>
                  <div className="flex gap-3 text-xs font-mono text-steel/60 flex-wrap">
                    <span>Confiance : {rating.confidence}</span>
                    <span>Qté recommandée : {rating.recommendedCount ?? "—"}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-mono text-steel/60">Pas encore de note automatique — lance l'import dans la Bibliothèque, ou fixe une note toi-même :</p>
                  <EditableStarRating
                    cardNumber={card.cardNumber}
                    leaderContext={leader.leaderContext}
                    initialStars={0}
                    initialIsManualOverride={false}
                  />
                </>
              )}

              <div className="border-t border-line pt-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-gold mb-1">Résultats en tournoi</div>
                {stats.usageCount === 0 ? (
                  <p className="text-xs text-steel/60">
                    {leader.releaseNote ?? "Aucune donnée de tournoi pour l'instant — absente des listes gagnantes importées."}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-white">
                      Dans {stats.usageCount}/{stats.totalWinningDecks} listes gagnantes ({stats.usageRate}%)
                      {stats.avgQuantity !== null && ` · en moyenne x${stats.avgQuantity}`}
                    </p>
                    <div className="text-[10px] font-mono text-steel/60 mt-1">
                      Invaincues : {stats.undefeatedCount} · Preuve : {stats.proofLevel ?? "—"}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-mono text-steel/50 space-y-0.5">
          <div>Source : <a href={card.cardUrl} className="underline">{card.cardUrl}</a></div>
          <div>Dernière vérification : {new Date(card.updatedAt).toLocaleString("fr-FR")}</div>
        </div>
      </div>
    </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-tile p-3">
      <div className="text-lg font-mono text-emerald-bright">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-steel/60">{label}</div>
    </div>
  );
}
