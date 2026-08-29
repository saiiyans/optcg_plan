"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialogProvider";

export function DuplicateDeckButton({ deckId, asTest, label }: { deckId: string; asTest: boolean; label: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();

  async function duplicate() {
    if (!(await confirm(`Créer une copie personnelle indépendante de ce deck ${asTest ? "(marquée version test) " : ""}? Le deck gagnant original ne sera jamais modifié.`))) return;
    setBusy(true);
    const res = await fetch(`/api/tournament-decks/${deckId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asTest }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      router.push(`/my-decks/${data.newDeckId}`);
    } else {
      alert(`Erreur : ${data.error}`);
    }
  }

  return (
    <button onClick={duplicate} disabled={busy} className="btn">
      {busy ? "Copie en cours..." : label}
    </button>
  );
}
