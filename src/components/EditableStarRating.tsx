"use client";
import { useState } from "react";

export function EditableStarRating({
  cardNumber,
  leaderContext,
  initialStars,
  initialIsManualOverride,
}: {
  cardNumber: string;
  leaderContext: string;
  initialStars: number;
  initialIsManualOverride: boolean;
}) {
  const [stars, setStars] = useState(initialStars);
  const [isManualOverride, setIsManualOverride] = useState(initialIsManualOverride);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function setRating(value: number) {
    setBusy(true);
    setStars(value);
    setIsManualOverride(true);
    await fetch(`/api/cards/${cardNumber}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderContext, stars: value }),
    });
    setBusy(false);
  }

  async function resetToAuto() {
    setBusy(true);
    await fetch(`/api/cards/${cardNumber}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderContext, reset: true }),
    });
    setIsManualOverride(false);
    setBusy(false);
  }

  const displayed = hover ?? stars;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-0.5" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            disabled={busy}
            onMouseEnter={() => setHover(i)}
            onClick={() => setRating(i)}
            className="star text-lg leading-none disabled:opacity-50"
          >
            <span className={i <= Math.round(displayed) ? "filled" : ""}>★</span>
          </button>
        ))}
      </div>
      <span className="text-xs font-mono text-ivory">{stars.toFixed(1)}</span>
      {isManualOverride ? (
        <button onClick={resetToAuto} disabled={busy} className="text-[10px] text-gold hover:underline">
          Corrigée manuellement — réinitialiser
        </button>
      ) : (
        <span className="text-[10px] text-textMuted">Clique une étoile pour corriger</span>
      )}
    </div>
  );
}
