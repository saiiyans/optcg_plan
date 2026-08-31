"use client";

import { useEffect, useState } from "react";

export type QuizLanguage = "fr" | "en" | "bilingue";
const STORAGE_KEY = "optcg-quiz-language";

/** Lit la préférence de langue sauvegardée, sans jamais planter si localStorage est indisponible (navigation privée, etc.). */
export function readStoredQuizLanguage(): QuizLanguage {
  if (typeof window === "undefined") return "fr";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "en" || v === "bilingue" || v === "fr" ? v : "fr";
  } catch {
    return "fr";
  }
}

const OPTIONS: { value: QuizLanguage; label: string }[] = [
  { value: "fr", label: "FR" },
  { value: "en", label: "EN" },
  { value: "bilingue", label: "FR + EN" },
];

export function QuizLanguageToggle({ value, onChange }: { value: QuizLanguage; onChange: (v: QuizLanguage) => void }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // navigation privée / storage désactivé — la préférence ne survivra
      // juste pas au rechargement, sans jamais casser le quiz.
    }
  }, [value]);

  return (
    <div className="inline-flex rounded-full border border-[var(--quiz-line-strong)] p-0.5 gap-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
            value === o.value ? "bg-[var(--quiz-gold-dim)] text-[var(--quiz-gold)]" : "text-[var(--quiz-steel)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
