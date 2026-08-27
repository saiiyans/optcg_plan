"use client";
import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import Link from "next/link";
import { WEEKS, MY_DECKS, TOURNAMENT_DATE } from "@/lib/planningData";
import { useOpponentLeaders } from "@/lib/useOpponentLeaders";
import { MATCHUP_GUIDES, OPTCG_RESOURCES } from "@/lib/matchupGuide";
import { LeaderImage } from "@/components/LeaderImage";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";
import { CoachBilanSection, MatchesOverview, PersonalStatsSection } from "@/components/PerformanceStats";
import { QUICK_MISTAKES } from "@/lib/coachDiagnostic";
import { MISTAKE_CATEGORIES } from "@/lib/defeatAnalysis";
import { TrainingPriorityCard, MistakeTrendSection, MatchDefeatPanel } from "@/components/DefeatAnalysis";
import {
  MIHAWK_MULLIGAN,
  MIHAWK_TURN_GUIDE,
  MIHAWK_PRINCIPLES,
  MIHAWK_CORE_CARDS,
  MIHAWK_MATCHUP_NOTES,
} from "@/lib/mihawkGamePlan";
import { CardThumb } from "@/components/CardThumb";

type Tab = "planning" | "stats" | "objectifs";

export default function PrepPage() {
  const [tab, setTab] = useState<Tab>("planning");
  const daysLeft = useMemo(() => {
    const diff = Math.ceil((new Date(TOURNAMENT_DATE).getTime() - Date.now()) / 86400000);
    return diff >= 0 ? diff : 0;
  }, []);

  return (
    <div className="space-y-6">
      {/* EN-TÊTE (refonte — style Nakama Companion, cohérent avec
          Cartes/Matchups/Tier List) */}
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Préparation</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Prépare <span className="text-flame-gradient italic">le tournoi.</span>
        </h1>
      </div>

      <div className="card-tile rounded-sm p-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Préparation tournoi</div>
          <div className="text-white text-sm flex items-center gap-2 flex-wrap">
            Leader engagé :
            <span className="badge badge-green inline-flex items-center gap-1.5">
              <LeaderImage leaderKey="mihawk" size={18} /> Mihawk OP14-020
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-gold">{daysLeft}</div>
          <div className="text-[10px] uppercase tracking-wider text-steel/60">jours avant le 20 sept.</div>
        </div>
      </div>

      <div className="text-xs font-mono text-steel/60 bg-panel2 border border-line rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
        📓 Le Journal (parties, analyse du coach, mission en cours) a sa propre page maintenant.
        <Link href="/journal" className="text-emerald-bright hover:underline">Aller au Journal →</Link>
        {" · "}
        <Link href="/matchups" className="text-emerald-bright hover:underline">Matchups →</Link>
        {" · "}
        <Link href="/revisions" className="text-emerald-bright hover:underline">Révisions →</Link>
      </div>

      <nav className="flex gap-1 border-b border-line overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {(["planning", "stats", "objectifs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 whitespace-nowrap shrink-0 ${
              tab === t ? "text-gold border-gold" : "text-steel/60 border-transparent hover:text-white"
            }`}
          >
            {{ planning: "Planning", stats: "Statistiques", objectifs: "Objectifs" }[t]}
          </button>
        ))}
      </nav>

      {tab === "planning" && <PlanningTab />}
      {tab === "stats" && <StatsTab />}
      {tab === "objectifs" && <ObjectifsTab />}
    </div>
  );
}

function PlanningTab() {
  return (
    <div className="space-y-3">
      {WEEKS.map((w) => (
        <div key={w.n} className="card-tile rounded-sm p-4">
          <div className="text-[11px] font-mono text-steel/60 uppercase tracking-wider">Semaine {w.n} · {w.range}</div>
          <p className="text-sm text-white mt-1 mb-3">{w.focus}</p>
          <div className="flex gap-6 font-mono text-xs">
            <div><span className="text-gold text-lg block">{w.sim}</span><span className="text-steel/60">Simulateur</span></div>
            <div><span className="text-gold text-lg block">{w.bout}</span><span className="text-steel/60">Boutique</span></div>
            <div><span className="text-gold text-lg block">{w.sim + w.bout}</span><span className="text-steel/60">Total visé</span></div>
          </div>
          <div className={`mt-2 pt-2 border-t border-line text-xs font-mono ${w.warn ? "text-red-400" : "text-emerald-bright"}`}>{w.milestone}</div>
        </div>
      ))}
    </div>
  );
}

function StatsTab() {
  return (
    <div className="space-y-6">
      <CoachBilanSection />
      <MatchesOverview />
      <PersonalStatsSection />
    </div>
  );
}

function ObjectifsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [infos, setInfos] = useState<Record<number, string>>({});
  const [addText, setAddText] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [oRes, iRes] = await Promise.all([fetch("/api/objectives"), fetch("/api/weekly-infos")]);
    const oData = await oRes.json();
    const iData = await iRes.json();
    setItems(oData.items ?? []);
    const map: Record<number, string> = {};
    (iData.infos ?? []).forEach((i: any) => (map[i.weekNumber] = i.content));
    setInfos(map);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string, done: boolean) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done } : it)));
    await fetch(`/api/objectives/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
  }

  async function addCustom(category: string) {
    const text = addText[category]?.trim();
    if (!text) return;
    await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, text }) });
    setAddText((f) => ({ ...f, [category]: "" }));
    load();
  }

  async function saveInfo(weekNumber: number, content: string) {
    setInfos((prev) => ({ ...prev, [weekNumber]: content }));
    await fetch("/api/weekly-infos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekNumber, content }) });
  }

  const categories: { key: string; label: string }[] = [
    { key: "meta", label: "Connaissance de la méta" },
    { key: "cartes", label: "Cartes clés à connaître" },
    { key: "strat", label: "Stratégies / menaces à surveiller" },
    { key: "matchups", label: "Matchups à travailler" },
  ];

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat.key} className="card-tile rounded-sm p-5">
          <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">{cat.label}</h3>
          <ul className="space-y-1.5">
            {items.filter((it) => it.category === cat.key).map((it) => (
              <li key={it.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={it.done} onChange={(e) => toggle(it.id, e.target.checked)} className="mt-1" />
                <span className={it.done ? "text-steel/50 line-through" : "text-white"}>{it.text}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            <input className="input flex-1" placeholder="Ajouter un objectif..." value={addText[cat.key] ?? ""} onChange={(e) => setAddText((f) => ({ ...f, [cat.key]: e.target.value }))} />
            <button onClick={() => addCustom(cat.key)} className="btn btn-primary">Ajouter</button>
          </div>
        </div>
      ))}

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">5 infos importantes par semaine</h3>
        {WEEKS.map((w) => (
          <div key={w.n} className="mb-3">
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Semaine {w.n} — {w.range}</label>
            <textarea
              className="input w-full"
              rows={3}
              placeholder={"1. ...\n2. ...\n3. ...\n4. ...\n5. ..."}
              value={infos[w.n] ?? ""}
              onChange={(e) => setInfos((prev) => ({ ...prev, [w.n]: e.target.value }))}
              onBlur={(e) => saveInfo(w.n, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
