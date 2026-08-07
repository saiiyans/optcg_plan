import Image from "next/image";
import Link from "next/link";

/**
 * Miniature d'une carte à partir de son seul numéro (ex. "OP14-023"),
 * sans avoir besoin d'aller la chercher en base — l'URL suit toujours le
 * même schéma sur le CDN de Limitless. Utilisé partout dans l'app où une
 * carte n'était référencée que par un badge texte (Combo Lab, Matchup
 * Center, Mes Decks, Deck Profile, cartes liées...), pour remplacer un
 * numéro pas très lisible par un visuel reconnaissable au premier coup
 * d'œil.
 */
function cdnImageUrl(cardNumber: string): string {
  const setCode = cardNumber.split("-")[0];
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${setCode}/${cardNumber}_EN.webp`;
}

export function CardThumb({
  cardNumber,
  size = 64,
  showLabel = true,
  quantity,
}: {
  cardNumber: string;
  size?: number;
  showLabel?: boolean;
  quantity?: number;
}) {
  const height = Math.round(size * 1.4); // ratio d'une carte à jouer

  return (
    <Link
      href={`/cards/${cardNumber}`}
      className="inline-flex flex-col items-center gap-1 group shrink-0"
      title={cardNumber}
    >
      <div className="relative" style={{ width: size, height }}>
        <Image
          src={cdnImageUrl(cardNumber)}
          alt={cardNumber}
          width={size}
          height={height}
          className="rounded-md border border-line group-hover:border-emerald-bright transition-colors object-cover"
          style={{ width: size, height }}
        />
        {quantity !== undefined && (
          <span className="absolute top-0.5 right-0.5 bg-emerald-dim text-emerald-bright text-[9px] font-mono px-1 py-0.5 rounded leading-none">
            ×{quantity}
          </span>
        )}
      </div>
      {showLabel && <span className="text-[10px] font-mono text-steel/70">{cardNumber}</span>}
    </Link>
  );
}
