"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Card {
  id: number;
  contentType: 1 | 2 | 3;
}

const cardData = {
  1: {
    title: "Luxury Watch Campaign",
    description: "Editorial fashion shoot with cinematic lighting",
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80",
  },
  2: {
    title: "Haute Couture Editorial",
    description: "High-fashion runway collection showcase",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  },
  3: {
    title: "Artisan Leather Goods",
    description: "Premium craftsmanship product photography",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
  },
};

const initialCards: Card[] = [
  { id: 1, contentType: 1 },
  { id: 2, contentType: 2 },
  { id: 3, contentType: 3 },
];

const positionStyles = [
  { scale: 1, y: 8 },
  { scale: 0.96, y: -14 },
  { scale: 0.92, y: -36 },
];

const exitAnimation = {
  y: 300,
  scale: 1,
  zIndex: 10,
};

const enterAnimation = {
  y: -14,
  scale: 0.92,
};

function CardContent({ contentType }: { contentType: 1 | 2 | 3 }) {
  const data = cardData[contentType];

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex h-[160px] w-full items-center justify-center overflow-hidden rounded-lg">
        <img
          src={data.image}
          alt={data.title}
          className="h-full w-full select-none object-cover"
        />
      </div>
      <div className="flex w-full items-center justify-between gap-2 px-2 pb-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold text-foreground">{data.title}</span>
          <span className="text-[11px] text-muted">{data.description}</span>
        </div>
        <div className="flex h-8 shrink-0 items-center gap-0.5 rounded-lg bg-accent-primary/10 px-3 text-[11px] font-semibold text-accent-primary">
          View
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
            <path d="M9.5 18L15.5 12L9.5 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function AnimatedCard({
  card,
  index,
  isAnimating,
}: {
  card: Card;
  index: number;
  isAnimating: boolean;
}) {
  const { scale, y } = positionStyles[index] ?? positionStyles[2];
  const zIndex = index === 0 && isAnimating ? 10 : 3 - index;

  const exitAnim = index === 0 ? exitAnimation : undefined;
  const initialAnim = index === 2 ? enterAnimation : undefined;

  return (
    <motion.div
      key={card.id}
      initial={initialAnim}
      animate={{ y, scale }}
      exit={exitAnim}
      transition={{
        type: "spring",
        duration: 1,
        bounce: 0,
      }}
      style={{
        zIndex,
        left: "50%",
        x: "-50%",
        bottom: 0,
      }}
      className="absolute flex h-[230px] w-[280px] items-center justify-center overflow-hidden rounded-t-lg border-x border-t border-border bg-card p-1 shadow-lg will-change-transform"
    >
      <CardContent contentType={card.contentType} />
    </motion.div>
  );
}

export default function AnimatedCardStack() {
  const [cards, setCards] = useState(initialCards);
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextId, setNextId] = useState(4);

  const handleAnimate = () => {
    setIsAnimating(true);
    const nextContentType = ((cards[2].contentType % 3) + 1) as 1 | 2 | 3;
    setCards([...cards.slice(1), { id: nextId, contentType: nextContentType }]);
    setNextId((prev) => prev + 1);
    setIsAnimating(false);
  };

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="relative h-[280px] w-full overflow-hidden">
        <AnimatePresence initial={false}>
          {cards.slice(0, 3).map((card, index) => (
            <AnimatedCard key={card.id} card={card} index={index} isAnimating={isAnimating} />
          ))}
        </AnimatePresence>
      </div>
      <div className="relative z-10 -mt-px flex w-full items-center justify-center border-t border-border/50 py-3">
        <button
          onClick={handleAnimate}
          className="flex h-8 cursor-pointer select-none items-center justify-center gap-1 overflow-hidden rounded-lg border border-border bg-white px-3 text-[12px] font-medium text-foreground transition-all hover:bg-gray-50 active:scale-[0.97]"
        >
          Browse Examples
        </button>
      </div>
    </div>
  );
}
