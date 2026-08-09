"use client";
import { useState } from "react";

/**
 * Bloc de texte cliquable pour éditer — traduction FR, explications Coach.
 * Même logique que EditableStarRating : clique, modifie, enregistre via
 * PATCH /api/cards/[cardNumber]/text. Jamais utilisé pour officialText
 * (texte officiel anglais), qui reste en lecture seule ailleurs sur la page.
 */
export function EditableText({
  cardNumber,
  field,
  initialValue,
  placeholder,
  emptyLabel,
}: {
  cardNumber: string;
  field: "officialTextFr" | "coachExplanationFr" | "mihawkAnalysisFr" | "opponentMatchupNote";
  initialValue: string | null;
  placeholder?: string;
  emptyLabel: string;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/cards/${cardNumber}/text`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value: draft }),
    });
    if (res.ok) {
      setValue(draft);
      setEditing(false);
    }
    setBusy(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          className="input w-full text-sm"
          rows={4}
          autoFocus
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={save} disabled={busy} className="btn btn-primary text-xs py-1.5 px-3">
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button onClick={cancel} disabled={busy} className="btn text-xs py-1.5 px-3">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group cursor-pointer -m-1.5 p-1.5 rounded-lg hover:bg-panel2 transition-colors"
      title="Cliquer pour modifier"
    >
      {value ? (
        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-sm text-steel/60 italic">{emptyLabel}</p>
      )}
      <span className="text-[10px] text-textMuted opacity-0 group-hover:opacity-100 transition-opacity">✎ Cliquer pour modifier</span>
    </div>
  );
}
