"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

// --- Boîte de confirmation partagée — remplace window.confirm() partout
// dans l'app. Le confirm() natif du navigateur est bloquant, sans thème
// (fond blanc, police système), et particulièrement inadapté sur iPad en
// plein tournoi. Un seul composant ici, monté une fois dans layout.tsx,
// évite d'avoir à reconstruire une modale dans chacun des ~10 fichiers qui
// avaient leur propre confirm().
//
// Usage : const confirm = useConfirm(); puis
//   if (!(await confirm("Supprimer ce deck ?", { destructive: true }))) return;

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean; // bouton de confirmation en rouge plutôt qu'en vert (action irréversible/destructive)
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (v: boolean) => void;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve, ...options });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      state?.resolve(result);
      setState(null);
    },
    [state]
  );

  // Échap = annuler, comme le confirm() natif qu'on remplace.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={state.title ?? "Confirmation"}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative card-tile w-full max-w-sm p-5 space-y-4">
            {state.title && <h2 className="text-ivory font-bold text-base">{state.title}</h2>}
            <p className="text-sm text-steel/80 leading-relaxed whitespace-pre-line">{state.message}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => close(false)} autoFocus className="btn min-h-[44px]">
                {state.cancelLabel ?? "Annuler"}
              </button>
              <button
                onClick={() => close(true)}
                className={`min-h-[44px] rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                  state.destructive
                    ? "bg-red-950 border border-red-800 text-red-400 hover:border-red-600"
                    : "bg-emerald-dim border border-emerald text-emerald-bright hover:brightness-110"
                }`}
              >
                {state.confirmLabel ?? "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Filet de sécurité — ne devrait jamais arriver puisque le provider est
    // monté à la racine dans layout.tsx, mais on retombe sur le confirm()
    // natif plutôt que de planter la page si jamais un composant est rendu
    // hors de l'arbre (ex. test isolé).
    return (message: string) => Promise.resolve(window.confirm(message));
  }
  return ctx;
}
