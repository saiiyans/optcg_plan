"use client";
import { useState } from "react";
import { CardThumb } from "@/components/CardThumb";

export default function Compare() {
  const [inputs, setInputs] = useState(["", "", "", ""]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCompare() {
    setLoading(true);
    const numbers = inputs.map((s) => s.trim().toUpperCase()).filter(Boolean);
    const results = await Promise.all(
      numbers.map((n) => fetch(`/api/cards?q=${encodeURIComponent(n)}`).then((r) => r.json()))
    );
    setCards(results.map((r) => r.cards?.find((c: any) => c.cardNumber === (r.cards[0]?.cardNumber))).filter(Boolean));
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="card-tile rounded-sm p-4">
        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-3">
          Comparer jusqu'à 4 cartes (par numéro officiel)
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {inputs.map((v, i) => (
            <input
              key={i}
              className="input sm:w-40"
              placeholder={`ex: OP14-0${20 + i}`}
              value={v}
              onChange={(e) => setInputs((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
            />
          ))}
          <button onClick={loadCompare} disabled={loading} className="btn btn-primary col-span-2 sm:col-span-1">Comparer</button>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Carte", (c: any) => <CardThumb cardNumber={c.cardNumber} imageUrl={c.imageUrl} size={72} />],
                ["Nom", (c: any) => c.name],
                ["Catégorie", (c: any) => c.category],
                ["Coût", (c: any) => c.cost ?? "—"],
                ["Puissance", (c: any) => c.power ?? "—"],
                ["Counter", (c: any) => (c.counter ? `+${c.counter}` : "—")],
                ["Attribut", (c: any) => c.attribute ?? "—"],
                ["Rôle / effet", (c: any) => c.officialText ?? "—"],
                ["Note Mihawk", (c: any) => (c.rating ? `${c.rating.stars} ★` : "—")],
                ["Quantité recommandée", (c: any) => c.rating?.recommendedCount ?? "—"],
                ["Dans mon deck", (c: any) => (c.deckQuantity > 0 ? `x${c.deckQuantity}` : "Non")],
              ].map(([label, get]: any) => (
                <tr key={label} className="border-b border-line">
                  <td className="py-2 pr-4 text-[11px] font-mono uppercase tracking-wider text-steel/60 whitespace-nowrap">{label}</td>
                  {cards.map((c) => (
                    <td key={c.cardNumber} className="py-2 pr-6 text-white align-top">{get(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
