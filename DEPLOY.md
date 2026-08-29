# Déployer l'app en ligne (accessible depuis ton téléphone, partout)

Ce guide te fait passer d'une app qui tourne uniquement sur ton ordinateur à
une app accessible depuis n'importe où (boutique, 4G, etc.) via une URL
Vercel — gratuit dans les deux cas pour cet usage personnel.

Deux comptes gratuits à créer toi-même (je ne peux pas le faire à ta
place) :
- **Neon** (base de données PostgreSQL gratuite) — https://neon.tech
- **Vercel** (hébergement, gratuit) — https://vercel.com
- Un compte **GitHub** gratuit si tu n'en as pas déjà un — https://github.com

Le code est déjà prêt pour ça (schéma Prisma en PostgreSQL, scripts de
build corrects). Il te reste juste à créer les comptes et suivre ces
étapes.

## Étape 1 — Créer la base de données (Neon)

1. Va sur https://neon.tech, crée un compte gratuit (avec Google/GitHub, c'est le plus rapide).
2. Crée un nouveau projet (n'importe quel nom, ex. "optcg").
3. Sur le tableau de bord du projet, trouve la **connection string** —
   Neon en propose deux : une "pooled" (recommandée pour ce genre d'app)
   et une directe. Prends la **pooled connection string**, elle ressemble à :
   ```
   postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
   ```
4. Copie-la quelque part, tu en auras besoin deux fois (étape 3 et étape 4).

## Étape 2 — Mettre le code sur GitHub

1. Décompresse `optcg-green-library.zip` si ce n'est pas déjà fait.
2. Va sur https://github.com/new, crée un nouveau dépôt (privé si tu
   préfères que le code ne soit pas public — le contenu n'a rien de
   sensible mais autant garder ça pour toi).
3. Suis les instructions GitHub affichées après la création ("...or push
   an existing repository from the command line") depuis le dossier du
   projet :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/optcg-green-library.git
   git push -u origin main
   ```

## Étape 3 — Créer les tables dans la base Neon

Depuis ton ordinateur, dans le dossier du projet :

```bash
npm install
```

Puis crée un fichier `.env` (ou modifie celui existant) avec la
connection string Neon de l'étape 1 :

```
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require"
```

Puis lance :

```bash
npm run db:push
```

Ça crée toutes les tables (Cards, Match, TournamentDeck, etc.) directement
dans ta base Neon. Tu ne le refais qu'à chaque fois que tu modifies
`prisma/schema.prisma`.

## Étape 4 — Déployer sur Vercel

1. Va sur https://vercel.com, connecte-toi avec ton compte GitHub.
2. Clique "Add New..." → "Project", choisis le dépôt GitHub que tu viens
   de créer.
3. Vercel détecte automatiquement Next.js — ne change rien aux réglages
   de build.
4. Avant de cliquer "Deploy", ouvre la section **Environment Variables**
   et ajoute :
   - Nom : `DATABASE_URL`
   - Valeur : la même connection string Neon que ci-dessus
5. Clique "Deploy". Ça prend 1 à 2 minutes.
6. Une fois terminé, Vercel te donne une URL du type
   `https://optcg-green-library-xxxx.vercel.app`.

## Sécuriser les routes d'administration (ADMIN_SECRET)

Les routes `/api/admin/*` (import de cartes leak, correctifs ponctuels,
génération de contenu Coach...) ne sont plus ouvertes à tout le monde —
elles exigent un secret partagé, comme la synchronisation Kaizoku
(`CRON_SECRET`) le fait déjà. **Sans ce réglage, ces routes refusent tout
le monde, y compris toi** — donc à faire avant d'utiliser les boutons
correspondants dans l'app (ex. "Générer le contenu Coach" sur /cards,
"Résoudre les leaders manquants" sur /leaders).

1. Génère une valeur aléatoire (dans un terminal : `openssl rand -hex 32`,
   ou n'importe quelle longue chaîne aléatoire).
2. Sur Vercel → ton projet → **Settings → Environment Variables**, ajoute
   DEUX variables avec la MÊME valeur :
   - `ADMIN_SECRET` (lue côté serveur)
   - `NEXT_PUBLIC_ADMIN_SECRET` (la même valeur, utilisée par les boutons
     de l'app pour s'authentifier automatiquement — c'est normal qu'elle
     soit publique, ce n'est qu'une barrière contre les robots/scanners,
     pas un vrai mot de passe personnel)
3. Redéploie (Vercel → Deployments → ⋯ sur le dernier déploiement →
   Redeploy, ou repousse simplement un commit).

## Étape 5 — Ouvrir sur ton téléphone

Ouvre cette URL Vercel dans le navigateur de ton téléphone (Safari,
Chrome...). Ça marche depuis n'importe quel réseau — Wi-Fi de la
boutique, 4G/5G, peu importe.

**Astuce** : ajoute la page à ton écran d'accueil (menu "Partager" →
"Sur l'écran d'accueil" sur iPhone, ou menu ⋮ → "Ajouter à l'écran
d'accueil" sur Android) pour l'ouvrir comme une vraie app d'un tap.

## Mettre à jour l'app après un changement

Si je te redonne du code modifié plus tard :
1. Remplace les fichiers dans ton dossier local par les nouveaux.
2. `git add . && git commit -m "update" && git push`
3. Vercel redéploie automatiquement à chaque push sur `main` — rien
   d'autre à faire.
4. Si le schéma de base de données a changé, relance `npm run db:push`
   (avec le `.env` pointant vers Neon) pour mettre à jour les tables.

## Coûts

Neon et Vercel ont tous les deux un plan gratuit largement suffisant pour
un usage personnel comme celui-ci (une poignée d'utilisateurs, peu de
trafic). Tu n'as besoin de rien payer.
