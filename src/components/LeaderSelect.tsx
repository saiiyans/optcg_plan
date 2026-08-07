"use client";

import { useState, useRef, useEffect } from "react";
import { OPPONENT_LEADERS } from "@/lib/planningData";
import styles from "./LeaderSelect.module.css";

/**
 * Champ "Leader adverse" avec autocomplétion sur les 89 leaders OPTCG,
 * navigable au clavier (flèches + Entrée), fermeture au clic extérieur.
 *
 * Réutilise OPPONENT_LEADERS (src/lib/planningData.ts) comme source unique
 * de la liste des leaders plutôt qu'un fichier JSON séparé — pour ne
 * jamais avoir deux listes qui divergent l'une de l'autre.
 *
 * Alternative au <datalist> natif déjà utilisé dans l'onglet Prépa
 * (rendu par le navigateur, pas stylable) : ce composant garde le thème
 * sombre/vert de l'app et un rendu identique sur tous les navigateurs.
 * Pas branché à la place du datalist pour l'instant — les deux
 * coexistent, à toi de choisir lequel utiliser où.
 *
 * Utilisation :
 *   <LeaderSelect value={leader} onChange={setLeader} />
 */

interface LeaderSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LeaderSelect({ value = "", onChange, placeholder }: LeaderSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? OPPONENT_LEADERS.filter((l) => l.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 30)
    : OPPONENT_LEADERS.slice(0, 30);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(leader: string) {
    onChange(leader);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        pick(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        type="text"
        className={styles.input}
        value={value}
        placeholder={placeholder || "ex. Enel, Luffy Vert/Bleu..."}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <div className={styles.list}>
          {filtered.map((l, i) => (
            <div
              key={l}
              className={i === activeIndex ? `${styles.item} ${styles.active}` : styles.item}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(l);
              }}
            >
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
