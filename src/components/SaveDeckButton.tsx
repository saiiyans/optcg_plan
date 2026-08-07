"use client";
import { useState } from "react";

export function SaveDeckButton({ deckId, initialSaved }: { deckId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/tournament-decks/${deckId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: !saved }),
    });
    if (res.ok) setSaved((s) => !s);
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy} className={saved ? "btn btn-primary" : "btn"}>
      {saved ? "✓ Dans Mes Decks" : "+ Ajouter à Mes Decks"}
    </button>
  );
}
