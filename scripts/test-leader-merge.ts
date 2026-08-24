import { suggestLeaderMerges, type LeaderSummary } from "../src/lib/leaderMerge";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

function leader(id: string, displayName: string, matchCount = 1): LeaderSummary {
  return { id, displayName, rawNames: [displayName], matchCount };
}

// --- Même nom, préfixe couleur différent -> suggéré ---
{
  const leaders = [leader("1", "Purple Enel"), leader("2", "Red/Black Enel")];
  const suggestions = suggestLeaderMerges(leaders);
  assert(suggestions.length === 1, `same base name across color prefixes is suggested (got ${suggestions.length})`);
}

// --- Orthographe très proche -> suggéré ---
{
  const leaders = [leader("1", "Rocks D Xebec"), leader("2", "Rocks D Xebek")];
  const suggestions = suggestLeaderMerges(leaders);
  assert(suggestions.length === 1, "near-identical spelling is suggested");
}

// --- Leaders clairement différents -> jamais suggéré ---
{
  const leaders = [leader("1", "Enel"), leader("2", "Kaido")];
  const suggestions = suggestLeaderMerges(leaders);
  assert(suggestions.length === 0, "clearly different leaders are never suggested");
}

// --- Noms trop courts -> pas de faux positif ---
{
  const leaders = [leader("1", "Ace"), leader("2", "Law")];
  const suggestions = suggestLeaderMerges(leaders);
  assert(suggestions.length === 0, "short unrelated names never falsely flagged");
}

// --- Jamais de fusion automatique — cette fonction ne fait QUE suggérer ---
{
  const leaders = [leader("1", "Purple Enel"), leader("2", "Red/Black Enel")];
  const before = JSON.stringify(leaders);
  suggestLeaderMerges(leaders);
  assert(JSON.stringify(leaders) === before, "suggestLeaderMerges never mutates its input");
}

if (failures > 0) {
  console.error(`\n${failures} test(s) échoué(s).`);
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED (leaderMerge.ts)");
}
