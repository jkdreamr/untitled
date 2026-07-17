import { PieceCard } from "@/components/piece/piece-card";
import type { PieceCard as PieceCardType } from "@/lib/types";

/** Server-rendered run of feed cards (used for the first page and each appended page). */
export function FeedItems({
  cards,
  authed,
  firstPriority = false,
}: {
  cards: PieceCardType[];
  authed: boolean;
  firstPriority?: boolean;
}) {
  return (
    <>
      {cards.map((card, i) => (
        <PieceCard key={card.id} card={card} authed={authed} priority={firstPriority && i === 0} />
      ))}
    </>
  );
}
