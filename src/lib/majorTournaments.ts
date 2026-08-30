/**
 * Rubrique "Tournois Majeurs Asie" (demandée le 30/08/2026) — annuaire
 * indépendant des grands tournois officiels One Piece Card Game en Asie
 * (Region 2 Bandai TCG+ : Thaïlande, Singapour, Malaisie, Japon...),
 * distinct du mode "Jour de Tournoi" (/tournament-day, qui logue des
 * parties en boutique locale) et de tout le reste de l'app.
 *
 * NATURE DES DONNÉES : liste organisée manuellement à partir des annonces
 * publiques Bandai TCG+ / réseaux officiels, PAS une intégration API/scraper
 * en direct — Bandai TCG+ n'expose aucune API publique connue. Le jeu de
 * données ci-dessous est celui fourni tel quel le 30/08/2026 : aucun
 * tournoi, prix ou condition n'est inventé ici. Le bouton "Actualiser via
 * Bandai TCG+" (voir /api/tournaments-asia) simule un cycle de resynchro-
 * nisation — horodatage mis à jour à chaque appel — en attendant une
 * éventuelle vraie source scrapable ; voir le commentaire dans route.ts
 * pour le point d'accroche si une telle source apparaît un jour.
 */

export type MajorTournamentCountry = "TH" | "SG" | "MY" | "JP";

export interface MajorTournamentPrizes {
  participation?: string;
  top_cut?: string;
  champion?: string;
}

export interface MajorTournamentRegistration {
  status: "Ouvert" | "Bientôt disponible" | "Réservé Invités" | string;
  registration_dates: string;
}

export interface MajorTournament {
  id: string;
  title: string;
  is_top_tier: boolean;
  country_code: MajorTournamentCountry;
  country_name: string;
  city: string;
  location: string;
  event_date: string;
  entry_fee: string;
  prizes: MajorTournamentPrizes;
  registration: MajorTournamentRegistration;
  conditions: string[];
  registration_url: string;
}

export const COUNTRY_FLAG: Record<MajorTournamentCountry, string> = {
  TH: "🇹🇭",
  SG: "🇸🇬",
  MY: "🇲🇾",
  JP: "🇯🇵",
};

export const COUNTRY_ORDER: MajorTournamentCountry[] = ["TH", "SG", "MY", "JP"];

// "Les Meilleurs / Top Tiers" mis en avant explicitement le 30/08/2026 :
// Grand Asia Open, Championship Regionals, Bandai Card Games Fest, Asia
// Finals — les 5 tournois fournis correspondent tous à l'une de ces
// catégories (is_top_tier: true partout dans le jeu de données initial).
export const MAJOR_TOURNAMENTS: MajorTournament[] = [
  {
    id: "opcg-th-2026-09-19",
    title: "Grand Asia Open LCQ & Flagship",
    is_top_tier: true,
    country_code: "TH",
    country_name: "Thaïlande",
    city: "Bangkok",
    location: "The Mall Lifestore Ngamwongwan (MCC Hall)",
    event_date: "19-20 Septembre 2026",
    entry_fee: "~15-20 USD (ou achat booster sur place)",
    prizes: {
      participation: "Promo Pack EX / Event Pack",
      top_cut: "Serial Winner Cards (Brook/Luffy), Special DON!!",
      champion: "Qualification directe Asia Final + Trophée",
    },
    registration: {
      status: "Ouvert",
      registration_dates: "Déjà ouvertes (Clôture proche)",
    },
    conditions: [
      "Compte Bandai TCG+ paramétré en Region 2 (Asia)",
      "Profil 'Face Photo Verified' obligatoire",
      "Cartes officielles Anglais/Asie légales (OP17 autorisé)",
      "Decklist enregistrée sur TCG+",
    ],
    registration_url: "https://tcgplus.bandai-tcg-plus.com/",
  },
  {
    id: "opcg-my-2026-10-24",
    title: "Championship 26-27 Regional S2",
    is_top_tier: true,
    country_code: "MY",
    country_name: "Malaisie",
    city: "Kuala Lumpur",
    location: "WTC Kuala Lumpur",
    event_date: "24-25 Octobre 2026",
    entry_fee: "~20 USD",
    prizes: {
      participation: "Participation Promo Pack S2",
      top_cut: "Exclusive Playmats, Serial Winner Cards, Invites Asia Final",
    },
    registration: {
      status: "Bientôt disponible",
      registration_dates: "Fin Septembre 2026 (Tirage au sort)",
    },
    conditions: [
      "Compte TCG+ Region 2",
      "Inscription via Lottery System sur TCG+",
      "Decklist validée 24h avant",
    ],
    registration_url: "https://tcgplus.bandai-tcg-plus.com/",
  },
  {
    id: "opcg-th-2026-11-22",
    title: "BANDAI CARD GAMES Fest 26-27",
    is_top_tier: true,
    country_code: "TH",
    country_name: "Thaïlande",
    city: "Bangkok",
    location: "BITEC Bangna",
    event_date: "22 Novembre 2026",
    entry_fee: "Gratuit / ~10 USD Pass",
    prizes: {
      participation: "Promo Cards Fest Exclusives",
      top_cut: "Sleeves événementiels, Side Events Prize Wall",
    },
    registration: {
      status: "Bientôt disponible",
      registration_dates: "Fin Octobre 2026",
    },
    conditions: ["Inscription TCG+ préalable obligatoire", "Présence physique requis sur place"],
    registration_url: "https://bandaicardgames-fest.com/",
  },
  {
    id: "opcg-sg-2026-12-06",
    title: "BANDAI Fest & Regionals S2",
    is_top_tier: true,
    country_code: "SG",
    country_name: "Singapour",
    city: "Singapour",
    location: "Singapore EXPO",
    event_date: "06 Décembre 2026",
    entry_fee: "~25 SGD",
    prizes: {
      participation: "Singapore Fest Playmat & Promo Packs",
      top_cut: "Top Cut Serial Cards, Championship Points",
    },
    registration: {
      status: "Bientôt disponible",
      registration_dates: "Début Novembre 2026",
    },
    conditions: ["TCG+ Region 2", "Contrôle d'identité physique à l'entrée"],
    registration_url: "https://tcgplus.bandai-tcg-plus.com/",
  },
  {
    id: "opcg-jp-2027-01-16",
    title: "Grand Asia Finals 2026-2027",
    is_top_tier: true,
    country_code: "JP",
    country_name: "Japon",
    city: "Tokyo / Osaka",
    location: "Convention Center",
    event_date: "16-17 Janvier 2027",
    entry_fee: "Sur Qualification (Gratuit)",
    prizes: {
      champion: "Slots World Championship, Trophée Officiel, Prize Cash/Cards",
    },
    registration: {
      status: "Réservé Invités",
      registration_dates: "Décembre 2026",
    },
    conditions: ["Réservé aux vainqueurs/Top Cut des Regionals & LCQ Region 2"],
    registration_url: "https://www.onepiece-cardgame.com/",
  },
];
