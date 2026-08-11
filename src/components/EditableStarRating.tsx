"use client";
import { useState } from "react";

/**
 * Étoiles cliquables avec support des demi-points (0.5 à 5, par pas de
 * 0.5) — clique sur la moitié gauche d'une étoile pour un demi-point,
 * la moitié droite pour le point plein.
 */
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

  function positionFromEvent(e: React.MouseEvent<HTMLButtonElement>, i: number): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    return isLeftHalf ? i - 0.5 : i;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-0.5" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fillPct = Math.max(0, Math.min(1, displayed - (i - 1))) * 100;
          return (
            <button
              key={i}
              type="button"
              disabled={busy}
              onMouseMove={(e) => setHover(positionFromEvent(e, i))}
              onClick={(e) => setRating(positionFromEvent(e, i))}
              title={`${i - 0.5} ou ${i} étoiles`}
              className="star relative text-lg leading-none disabled:opacity-50"
              style={{ width: "1em", display: "inline-block" }}
            >
              <span className="block">☆</span>
              <span
                className="filled absolute inset-0 overflow-hidden"
                style={{ width: `${fillPct}%` }}
              >
                ★
              </span>
            </button>
          );
        })}
      </div>
      <span className="text-xs font-mono text-ivory">{stars.toFixed(1)}</span>
      {isManualOverride ? (
        <button onClick={resetToAuto} disabled={busy} className="text-[10px] text-gold hover:underline">
          Corrigée manuellement — réinitialiser
        </button>
      ) : (
        <span className="text-[10px] text-textMuted">Clique la moitié gauche/droite d'une étoile pour un demi-point</span>
      )}
    </div>
  );
}
