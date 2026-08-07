function ratingLabel(stars: number): { text: string; color: string } {
  if (stars >= 4.5) return { text: "Essential", color: "text-gold" };
  if (stars >= 3.5) return { text: "Strong", color: "text-emerald-bright" };
  if (stars >= 2.5) return { text: "Flexible", color: "text-ivory" };
  if (stars >= 1) return { text: "Situational", color: "text-orange-400" };
  return { text: "Avoid", color: "text-textMuted" };
}

export function StarRating({ stars, leaderLabel, compact }: { stars: number; leaderLabel?: string; compact?: boolean }) {
  const label = ratingLabel(stars);
  return (
    <div className="flex items-center gap-1.5" title={`${stars} / 5 — compatibilité ${leaderLabel ?? "Mihawk"}`}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`star ${compact ? "text-sm" : "text-base"} ${i <= Math.round(stars) ? "filled" : ""}`}>
            ★
          </span>
        ))}
      </div>
      <span className="text-xs font-mono text-ivory">{stars.toFixed(1)}</span>
      {!compact && <span className={`text-[10px] font-medium uppercase tracking-wider ${label.color}`}>{label.text}</span>}
    </div>
  );
}
