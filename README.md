# Green Card Library — compatibilité Mihawk OP14-020

Application locale (Next.js + TypeScript + Tailwind + Prisma/SQLite) pour consulter,
filtrer et noter les cartes vertes anglaises du One Piece Card Game, avec un focus
sur leur compatibilité avec le Leader **Dracule Mihawk OP14-020**.

## 1. Installation

Prérequis : Node.js 18+.

```bash
npm install
cp .env.example .env
npm run db:push      # crée la base SQLite locale (prisma/dev.db) à partir du schéma
npm run dev
```

Ouvre http://localhost:3000. La base est vide au premier lancement — voir
section 3 pour l'importation.

## 2. Ce qui a été vérifié avant de coder (étapes 1 à 3 de la méthode demandée)

**Faisabilité technique** : les pages de Limitless (`onepiece.limitlesstcg.com`)
sont rendues côté serveur — j'ai vérifié en récupérant plusieurs pages réelles
(liste filtrée + 5 fiches détaillées) : tout le contenu utile est déjà présent
dans le HTML brut, sans JavaScript nécessaire. L'importateur utilise donc un
simple `fetch` + `cheerio` (pas de navigateur headless / Playwright requis).

**Faisabilité "légale"** : je n'ai pas pu récupérer `robots.txt` depuis mon
environnement de conversation (restriction technique de mes outils, pas du
site). Le pied de page de Limitless indique : *"This website is supported by
ads"* et un copyright explicite sur les textes/images de cartes
(Eiichiro Oda/Shueisha/Toei/Bandai — Limitless précise ne pas être affilié).
**Avant de lancer un import complet, vérifie toi-même** :
- https://onepiece.limitlesstcg.com/robots.txt
- https://limitlesstcg.com/about et https://limitlesstcg.com/legal

L'importateur est conçu pour rester respectueux dans tous les cas : requêtes
HTTP classiques (pas de contournement d'anti-bot), délai de 700 ms entre
chaque requête, User-Agent explicite identifiant un usage personnel non
commercial, et **aucune image n'est copiée localement** — seules les URL
distantes du CDN de Limitless sont stockées, avec lazy-loading côté
interface (voir `next.config.js`).

**Nombre de pages à parcourir** : la recherche filtrée renvoie
**688 cartes vertes** (Character + Event + Stage, anglais), réparties sur
**14 pages** de résultats. L'importateur les parcourt automatiquement.

## 3. Test sur 5 cartes (étape 7 de la méthode demandée)

Avant d'écrire l'importateur, j'ai vérifié manuellement 5 cartes réelles de
la première page de résultats pour valider la structure du HTML et éviter
toute donnée inventée. Le résultat exact est dans `data/sample-cards.json` :

| Carte | Numéro | Coût | Puissance | Attribut | Counter |
|---|---|---|---|---|---|
| Cavendish | EB01-012 | 5 | 6000 | Slash | +1000 |
| Kouzuki Hiyori | EB01-013 | 4 | 0 | Wisdom | +1000 |
| Sanji | EB01-014 | 4 | 5000 | Strike | +2000 |
| Scratchmen Apoo | EB01-015 | 1 | 1000 | Special | +2000 |
| Bingoh | EB01-016 | 1 | 0 | Wisdom | +1000 |

Aucune erreur rencontrée sur cet échantillon. Une fois l'app lancée, tu peux
reproduire ce test toi-même sans rien écrire en base via le bouton
**"2. Tester sur 5 cartes"** sur la page d'accueil (appelle
`GET /api/import/preview?mode=test5`).

## 4. Lancer l'import complet

Dans l'app, section "Importation depuis Limitless" :
1. **Compter les cartes** — vérifie que le nombre trouvé correspond bien à 688
   (ou au nombre affiché sur Limitless si ça a changé depuis).
2. **Tester sur 5 cartes** — relance la vérification en conditions réelles.
3. **Importer (confirmation requise)** — demande une confirmation navigateur
   avant d'écrire quoi que ce soit en base. Cette étape prend plusieurs
   minutes (688 requêtes espacées de 700 ms ≈ 8 minutes).

Un `ImportLog` est créé à chaque exécution (succès, erreurs, compteurs) —
consultable via `npm run db:studio`.

**Bouton "Synchroniser les cartes vertes"** : ne détecte que les nouvelles
cartes absentes de la base (utile après la sortie d'un nouveau set). Il ne
touche jamais aux cartes déjà importées.

**Corrections manuelles** : si tu modifies un champ à la main (dans Prisma
Studio ou une future UI d'édition), ajoute son nom au champ JSON
`manuallyEditedFields` de la carte — l'importateur ne l'écrasera plus jamais
lors d'une resynchronisation.

## 5. Système de notation Mihawk

Chaque carte reçoit une note automatique 0-5 (`src/lib/mihawkRating.ts`),
calculée à partir de critères objectifs : attribut Slash, coût ≤5,
jouable par Mihawk ST32-003, capacité à reposer une carte/un adversaire,
réactivation de DON!!, pioche/recherche, Counter +2000, puissance,
protection, synergie Perona/Coffin Boat, légalité Standard. Une carte
illégale en Standard reçoit automatiquement 0 étoile.

La note est éditable à tout moment (table `PersonalRating`,
`isManualOverride: true`) — une fois corrigée à la main, elle n'est plus
jamais recalculée automatiquement lors d'une resynchronisation.

## 6. Ma decklist de référence

`src/lib/deckReference.ts` contient la liste exacte que tu as fournie
(50 cartes + Leader). Elle sert uniquement à poser le badge "Dans mon deck"
sur la bibliothèque — pour la modifier, édite ce fichier directement.

## 7. Limites connues de cette première version

- Les filtres avancés par mot-clé d'effet (On Play, Blocker, Rush, Banish...)
  fonctionnent via la recherche texte libre, mais ne sont pas encore des
  cases à cocher dédiées — à ajouter si besoin dans `src/app/page.tsx`.
- Pas encore de vue "Full" / "Compact" / "Liste" séparée : la grille actuelle
  fait office de vue principale.
- Le regroupement des impressions alternatives (`CardPrint`) est prévu dans
  le schéma mais l'importateur actuel se concentre sur la carte de base ; le
  scraping des variantes (`?v=1`, `?v=2`...) peut être ajouté dans
  `scrapeCardDetail` en itérant sur les liens `?v=`.
- Pas de champ prix (USD/EUR) importé, bien que Limitless l'affiche — à
  ajouter si tu veux suivre le coût d'achat.

## 9. Winning Mihawk Decks (nouvelle catégorie)

Cette catégorie récupère les decklists de tournoi Mihawk (Leader OP14-020,
profil `op14mihawk`, couleur Green) depuis :
https://onepiecetopdecks.com/deck-list/japan-op16-deck-list-the-time-of-battle/

**Format source** : chaque ligne de la page contient une decklist compacte
du type `1nOP14-020a4nEB01-015a4nOP12-034a...`, où chaque entrée est
`{quantité}n{numéro de carte}` séparée par `a`. Le parseur
(`src/lib/deckParser.ts`) découpe cette chaîne, vérifie qu'il y a
exactement 1 Leader et exactement 50 cartes hors Leader, et marque la liste
`needs_review` si ce n'est pas le cas — sans jamais corriger une quantité
inventée.

**Définition stricte d'un "Winner"** : uniquement les placements commençant
par "1st" / "1st Place". Les Top 4 / Top 8 / 2nd sont classés séparément
comme "Top Performers" et ne comptent jamais pour le badge "utilisée dans
un deck gagnant". Un résultat invaincu (ex: "5-0") ajoute en plus le badge
"Undefeated".

### Vérification effectuée avant tout code (méthode identique à la Green Card Library)

J'ai récupéré manuellement la page source et vérifié 3 decklists Mihawk
réelles pour valider le parseur avant d'écrire l'importateur :

| Joueur | Date | Placement | Cartes hors Leader | Validation |
|---|---|---|---|---|
| Kana | 8/2/2026 | 1st (8-1) | 50 | ✓ Valide |
| Mitsu | 7/22/2026 | 1st (4-0) — invaincu | 50 | ✓ Valide |
| Taiki | 7/18/2026 | 1st Place | 50 | ✓ Valide |

Les trois se sont vérifiées à exactement 50 cartes hors Leader, avec un
Leader unique OP14-020. Au total, **au moins 11 decklists Mihawk gagnantes
ou Top Cut** étaient visibles rien que sur la portion de page récupérée
(la page complète en contient probablement davantage — l'import réel
comptera le total exact).

### Utilisation

Sur `/decks` :
1. **Tester sur 3 decklists** — reproduit la vérification ci-dessus en direct.
2. **Importer (confirmation requise)** — importe toutes les decklists
   `op14mihawk` trouvées, avec dédoublonnage automatique.
3. **Mettre à jour les résultats OP16** — détecte les nouvelles decklists
   sans jamais toucher aux anciennes, même si elles disparaissent de la
   page source.

Chaque carte verte affiche désormais, sur sa fiche détaillée, une section
**"Mihawk Tournament Results"** calculée uniquement à partir des decklists
réellement importées (taux d'utilisation, quantité moyenne, listes
invaincues, pays, tournois) — jamais une estimation. Tant qu'aucun import
n'a eu lieu, toutes les cartes affichent "No Winning Data".

## 11. Préparation Tournoi (fusion de l'artefact HTML initial)

Le premier outil de préparation (planning, journal de matchs, statistiques,
objectifs) a été fusionné dans cette application sous `/prep`, avec les
mêmes données que l'artefact HTML d'origine — plus de fichier séparé, tout
vit maintenant dans la même base SQLite (tables `Match`, `ObjectiveItem`,
`WeeklyInfo`).

- **Planning** : les 7 semaines jusqu'au 20 septembre, en dur dans
  `src/lib/planningData.ts` (pas de table dédiée, ce sont des données de
  référence comme la decklist Mihawk).
- **Journal de matchs** : formulaire + historique filtrable, table `Match`.
- **Statistiques** : calculées côté client à partir des matchs enregistrés
  (winrate global, par deck, par leader adverse — triés du pire au meilleur
  matchup).
- **Objectifs** : checklists méta / cartes / stratégies / matchups, semées
  une fois depuis `DEFAULT_OBJECTIVES` puis stockées en base
  (`ObjectiveItem`) — cochables, et tu peux en ajouter d'autres. Le bloc
  "5 infos importantes par semaine" est sauvegardé dans `WeeklyInfo`.

## 13. Design mobile & refonte visuelle

L'app est maintenant pensée mobile en premier :
- **Barre de navigation fixe en bas de l'écran** sur téléphone (Cartes / Decks /
  Prépa / Comparer / Stats), comme une vraie app — plus de menu tassé en haut.
  Sur desktop, la navigation reste en haut, horizontale.
- **Filtres empilés proprement** en grille sur petit écran au lieu de menus
  déroulants tassés sur une seule ligne.
- **Tableaux défilables horizontalement** (`.table-scroll`) plutôt que cassés
  ou illisibles sur un écran étroit.
- **Boutons d'action empilés** en pleine largeur sur mobile, en ligne sur
  desktop.
- Coins plus doux, légères ombres, transitions au tap — rendu plus "app
  moderne" que la première version.

## 15. Import manuel ponctuel (scripts/seed-mihawk-decks.js)

Si le scraping en direct depuis l'app pose problème (site qui bloque, réseau,
etc.), `scripts/seed-mihawk-decks.js` insère directement un lot de decks
Mihawk connus dans la base, sans passer par le site. Chaque decklist vient
d'un lien fourni manuellement — rien n'est inventé, et une ligne mal formée
est marquée `needs_review` plutôt que corrigée automatiquement.

```bash
node scripts/seed-mihawk-decks.js
```

Nécessite `DATABASE_URL` dans `.env` (le même que pour `npm run db:push`).

## 16. Commandes utiles

```bash
npm run db:studio     # explorateur de base de données (localhost:5555)
npm run build          # build de production
```

## 17. Journal — Analyse du coach (défaites)

Le Journal transforme chaque défaite enregistrée en analyse structurée
(cause principale, terme technique, meilleure ligne probable, leçon,
exercice) — voir `src/lib/defeatAnalysis.ts` pour toute la logique
(déterministe, sans appel à une IA externe : elle croise uniquement les
cases cochées et champs renseignés par le joueur avec un référentiel de
vocabulaire compétitif OPTCG).

Règles non négociables, respectées partout dans ce module :
- "Ma raison initiale" (texte du joueur) n'est **jamais** écrasée ni
  réécrite par l'analyse — elle vit dans `Match.lossReason`, modifiable
  seulement à la main.
- Chaque régénération de l'analyse crée une **nouvelle** ligne
  `CoachInsight` (jamais un update en place) : l'historique reste
  consultable dans le Journal.
- Aucune classification n'est annoncée sans au moins une case cochée qui
  la soutient ; à défaut, la partie est classée "Informations
  insuffisantes" plutôt que de deviner.

Ce module ajoute des champs au modèle `Match` (raison initiale, état du
board au moment critique, cartes de main de départ, Life restantes) et
étend `CoachInsight` — **exécute `npm run db:push` après avoir récupéré
ces changements** pour que la base de données (Neon) ait les nouvelles
colonnes ; comme pour tout le reste du schéma, tous ces champs sont
facultatifs et n'affectent aucune partie déjà enregistrée.

Tests de la logique pure (sans base de données) :

```bash
npx tsx scripts/test-defeat-analysis.ts
```

## 18. Espace de coaching, d'entraînement et de motivation (Journal v2)

Cette mise à jour transforme l'app en un vrai espace d'entraînement
compétitif, sans reconstruire ni supprimer l'existant. Résumé technique —
voir le message de livraison pour le résumé fonctionnel complet.

### Phase d'entraînement (test vs officiel)

- `Match.trainingPhase` ("test" | "official_training") — le défaut Prisma
  `"test"` ne sert QUE de backfill automatique pour les parties déjà
  enregistrées lors du `db push` ; toute nouvelle partie (saisie manuelle
  ou import Kaizoku) passe explicitement `"official_training"` côté API.
  Aucune partie existante n'est jamais supprimée ni modifiée par ce
  changement — voir `src/app/api/matches/route.ts` et `src/lib/kaizokuSync.ts`.
- `AppSettings.officialTrainingStartDate` (ligne singleton) — date de
  départ de l'entraînement officiel, modifiable via `PATCH /api/settings`.

### Compteur quotidien, séries, semaine (`src/lib/trainingPhase.ts`)

Moteur pur (testable sans Prisma) qui calcule le jour civil en Asia/Bangkok
(UTC+7 fixe), le compteur `X/4` du jour, la série en cours / record, la
progression hebdomadaire et les jours avant le tournoi. Consommé par
`GET /api/coach/daily-progress`, affiché par le widget d'en-tête
(`HeaderTrainingCounter`, visible sur toutes les pages) et par la zone
"Entraînement du jour" en tête de `/journal`. Un jour manqué ne crée
jamais de dette ni ne supprime de partie — seul le compteur affiché
repart à 0/4 le lendemain.

Tests : `npx tsx scripts/test-training-phase.ts`

### Mission d'entraînement unique (`src/lib/missionEngine.ts`)

Une seule mission active à la fois (table `TrainingMission`), sélectionnée
parmi 12 priorités (`TRAINING_PRIORITIES` dans `defeatAnalysis.ts`, dont 2
nouvelles : "Gérer le crackback" et "Choisir correctement entre attaquer
la Life et le board"). Chaque nouvelle partie officielle compte dans la
progression `X/3` de la mission active ; à 3/3, l'utilisateur choisit
"continuer" / "valider" / "priorité suivante" via
`POST /api/coach/missions/:id/decide`. Ne sélectionne jamais une priorité
sous le seuil minimum de données.

Tests : `npx tsx scripts/test-mission-engine.ts`

### Scores de compétence (section 14)

`computeSkillScores` (`defeatAnalysis.ts`) — 6 indicateurs (Sequencing,
Counter management, Curve, Tempo, Board control, Lethal calculation),
directement issus des classifications déjà produites par l'analyse du
coach. "Données insuffisantes" sous 5 défaites documentées ; au-delà,
chaque compétence est "en progression" / "stable" / "en baisse" /
"priorité actuelle" selon sa fréquence récente vs précédente — jamais basé
sur le seul winrate. Affiché dans `/journal` via `SkillScoresSection`.

### Fiabilité des statistiques (sections 12/13)

`computePersonalStats(myDeck?, phase)` (`src/lib/personalStats.ts`)
accepte désormais un filtre de phase (`official_training` par défaut,
`test`, ou `all`), et retourne `documented` (nombre de parties avec une
analyse renseignée) en plus de `total` — pour ne jamais présenter une
statistique calculée sur une fraction des parties comme si elle portait
sur le total. `GET /api/stats/personal?phase=...`.

### /journal — page unique (section 5/6)

Nouvelle page `/journal` (top-level, nav) : zone "Entraînement du jour",
saisie rapide (<20s : résultat, deck, adversaire avec image, premier/second,
raison initiale, moment critique), une seule bascule "Ajouter une analyse
détaillée" pour tout le reste, historique filtrable (phase, résultat,
premier/second, source, deck, mode) avec rendu en cartes sur mobile,
édition d'une partie existante, suppression douce avec "Annuler" immédiat,
et le résumé de suivi (bilan coach, scores de compétence, évolution des
erreurs, statistiques). L'ancien onglet "Journal" de `/prep` a été retiré
(remplacé par un lien) ; les onglets "Matchups" et "Révisions" sont
devenus les pages `/matchups` et `/revisions`.

### Suppression douce (section 18 du cahier des charges)

`Match.deletedAt` — `DELETE /api/matches/:id` ne fait que poser cette date
(rien n'est jamais réellement supprimé depuis l'app) ; `POST
/api/matches/:id/restore` l'annule. Toutes les statistiques et le
compteur quotidien excluent les parties supprimées.

### Outil de normalisation des leaders (section 11)

Nouvelle page `/leaders` : liste toutes les fiches `OpponentLeader` avec
leurs variantes de texte brut connues, suggère des paires probablement
identiques (`suggestLeaderMerges` dans `src/lib/leaderMerge.ts` — jamais
de fusion automatique, seulement une suggestion), permet de fusionner
manuellement (`POST /api/opponent-leaders/merge`) et de renseigner un
identifiant canonique basé sur le numéro de carte (`OpponentLeader.cardNumber`,
ex. "OP17-039 — Rocks.D.Xebec"). Le bouton "Résoudre les parties non
normalisées" relie les anciennes parties à une fiche leader.

Tests : `npx tsx scripts/test-leader-merge.ts`

### Migration

Comme pour le reste du schéma, tous les nouveaux champs sont facultatifs
ou ont un défaut sûr — **exécute `npm run db:push`** après avoir récupéré
ces changements pour que Neon ait les nouvelles colonnes/tables
(`Match.trainingPhase/decisionQuality/resultReading/deckId/deckVersionNumber/deckNameAtLog/deletedAt`,
`DeckVersion.versionNumber`, `Deck.matches`, `OpponentLeader.cardNumber`,
`AppSettings`, `TrainingMission`). Aucune partie existante n'est
supprimée, renommée ou déplacée par cette migration.

## 19. Grille de méta actuelle — matchups leader vs leader

Nouvelle section en haut de `/matchups` (`MetaMatchupGrid.tsx`) : une
grille leader vs leader avec un pourcentage de victoire par case, pour
tous les leaders les plus joués de la méta actuelle — **distincte** des
fiches de matchup personnelles plus bas sur la même page (celles-ci
restent basées sur tes propres parties du Journal).

**Source des données** : la grille n'est jamais calculée depuis tes
propres parties (échantillon bien trop faible pour 10 leaders x 10). Elle
vient d'une source publique externe, https://opdecks.xyz/winmatrix
(données agrégées par "TCG Match Making" depuis leur simulateur en ligne
classé — des dizaines de milliers de parties). L'attribution reste
toujours visible sous la grille dans l'app.

**Fonctionnement** :
- `GET /api/meta-matchups` sert le dernier instantané en cache
  (`MetaMatchupSnapshot`, une seule ligne en base) — aucun scraping à
  chaque chargement de page.
- Le bouton **"🔄 Actualiser"** appelle `POST /api/meta-matchups/refresh`,
  qui va chercher la page source, la parse (`src/lib/metaMatchupScraper.ts`,
  cheerio) et met à jour l'instantané. La récupération n'est **jamais**
  automatique/en arrière-plan — uniquement sur clic, par respect pour le
  site source (mêmes principes que `scraper.ts` : User-Agent explicite,
  pas de contournement de protection).
- Si le site source change de structure ou est injoignable, le parseur
  échoue avec une erreur explicite plutôt que de renvoyer des données
  vides ou fabriquées ; l'ancien instantané reste affiché avec un bandeau
  d'erreur, jamais silencieusement écrasé par un échec.
- Les images des leaders sont résolues via la base de cartes déjà
  importée localement (`/api/cards`) — aucun nouveau domaine d'image
  externe ajouté à `next.config.js`.

Tests (sans réseau, fixture HTML locale) : `npx tsx scripts/test-meta-matchup-parser.ts`

Migration : nouvelle table `MetaMatchupSnapshot` — **exécute `npm run
db:push`** après avoir récupéré ces changements.

## 20. Apprentissage — articles de fondamentaux OPTCG (`/learn`)

Rubrique qui agrège en direct des articles de stratégie depuis plusieurs
sites, accessible depuis la navigation (groupe "Coach"). Jamais de contenu
écrit à la main : tout vient de `src/lib/learnScraper.ts`, une fonction par
source, chacune indépendante des autres.

**Sources actuelles** :
- `opdecks.xyz/learn` — petits articles fondamentaux évergreens. Les 4
  désignés par le joueur comme base de la méthodologie du coach (2K Rule,
  économie du DON!!, erreurs de débutant, glossaire) sont marqués "Pilier"
  (`isPillar=true`) et ne sont jamais supprimés d'une actualisation à
  l'autre, même si le scrape suivant ne les retrouve pas.
- `tcgprotectors.com` — blog dédié One Piece TCG, via son flux Atom
  standard Shopify (`/blogs/one-piece-tcg-blog.atom`) — dates de
  publication fiables, pas de devinette de structure HTML.
- `shonentcg.com/blog` — blog multi-jeux, filtré par mots-clés
  (One Piece / OPTCG / "OP-XX") faute de flux dédié ; pas de date fiable
  disponible côté liste, l'ordre d'apparition sur le site (le plus récent
  en premier) sert de tri.

**Fonctionnement** : `GET /api/learn` sert le contenu déjà en base (aucun
appel réseau au chargement) ; le bouton **"🔄 Actualiser"** appelle
`POST /api/learn/refresh`, qui relit les 3 sources en parallèle. Si une
source échoue, ses articles déjà en base restent affichés tels quels
(jamais vidés) et seule son erreur remonte dans le petit résumé sous le
bouton — les deux autres sources s'actualisent normalement.

Migration : nouvelle table `LearnArticle` — **exécute `npm run db:push`**
après avoir récupéré ces changements.
