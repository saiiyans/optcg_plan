"use client";
import { useState } from "react";

export function CopyDecklistButton({
  leaderCardNumber,
  cards,
}: {
  leaderCardNumber: string;
  cards: { cardNumber: string; quantity: number }[];
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = [`1n${leaderCardNumber}`, ...cards.map((c) => `${c.quantity}n${c.cardNumber}`)].join("a");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Impossible de copier automatiquement — sélectionne le texte manuellement.");
    }
  }

  return (
    <button onClick={copy} className="btn">
      {copied ? "✓ Copié dans le presse-papier" : "📋 Copier la decklist"}
    </button>
  );
}
