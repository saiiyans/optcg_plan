/**
 * SOURCE UNIQUE DE CONFIGURATION — constantes globales utilisées à
 * plusieurs endroits de l'app (objectif quotidien/hebdo, fuseau horaire,
 * seuil d'échantillon fiable, valeurs de repli). Aucune page ni route ne
 * doit redéfinir ou recalculer différemment l'une de ces valeurs — c'est
 * exactement la cause des incohérences corrigées lors de cette refonte
 * (0/4 ici, 0/3 ailleurs ; 18 ici, 28 ailleurs ; 173/114 sur un plan que
 * plus personne ne suit). Toujours importer d'ici.
 *
 * Fichier volontairement SANS accès base de données (aucun import de
 * "./db") pour rester importable depuis un contexte pur — moteurs testables
 * avec `tsx` sans Prisma Client (trainingPhase.ts), scripts de test. La
 * résolution des valeurs réellement actives (qui peuvent être surchargées
 * en base via AppSettings — date du tournoi, deck actif) vit dans
 * appConfig.ts, qui importe ces constantes comme repli.
 */

/** Parties minimum par jour. Unique définition dans toute l'app. */
export const DAILY_GOAL = 4;

/** Parties minimum par semaine — toujours DAILY_GOAL × 7, jamais un autre
 * chiffre codé en dur ailleurs (l'ancien "18" venait d'un système de
 * planning différent, retiré des compteurs officiels lors de cette refonte). */
export const WEEKLY_GOAL = DAILY_GOAL * 7;

/** Objectif total de parties d'entraînement officiel avant le tournoi
 * (demandé explicitement par le joueur le 30/08/2026 : "200 parties avant
 * le 19 septembre"). La date-limite n'est PAS un second chiffre codé en dur
 * séparé : elle se déduit toujours de la date du tournoi (veille du
 * tournoi) via computeDailyProgress() dans trainingPhase.ts — si la date du
 * tournoi change dans AppSettings, l'échéance de cet objectif suit
 * automatiquement, sans jamais désynchroniser les deux. */
export const TOTAL_GAMES_GOAL = 200;

/** En dessous de ce nombre de parties, toute statistique doit s'afficher
 * "Échantillon insuffisant" plutôt qu'une conclusion trompeuse. Reprend le
 * seuil déjà utilisé par personalStats.ts (MIN_SAMPLE) — même valeur,
 * exposée ici pour que toute nouvelle page l'utilise aussi. */
export const MIN_SAMPLE_SIZE = 5;

/** Fuseau horaire de référence pour "aujourd'hui", les séries et les
 * objectifs quotidiens — jamais UTC ni le fuseau du navigateur/serveur.
 * Voir bangkokDateString() dans trainingPhase.ts pour le calcul réel. */
export const APP_TIMEZONE = "Asia/Bangkok";

/** Repli si aucune date de tournoi n'est réglée dans AppSettings.activeTournamentDate. */
export const DEFAULT_TOURNAMENT_DATE = "2026-09-20";

/** Repli si aucun deck actif n'est réglé dans AppSettings.activeDeckName. */
export const DEFAULT_DECK_NAME = "Mihawk OP14-020";
