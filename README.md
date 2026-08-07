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
