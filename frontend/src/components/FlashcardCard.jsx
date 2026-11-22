import React, { useState } from 'react';
import { Star } from 'lucide-react';

const FlashcardCard = ({ card, onFavorite, onReviewed }) => {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped((f) => !f);
    if (!card.reviewed && !flipped) onReviewed?.(card._id);
  };

  return (
    <div className="[perspective:1200px] h-56">
      <div
        onClick={handleFlip}
        className="relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden] card p-5 flex flex-col">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
              Question
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.(card._id);
              }}
              className={card.isFavorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}
            >
              <Star size={18} fill={card.isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p className="mt-4 text-slate-800 font-medium flex-1 overflow-y-auto">{card.question}</p>
          <p className="text-xs text-slate-400 text-center">Click to flip</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] card p-5 flex flex-col bg-primary-50"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <span className="text-xs font-semibold text-primary-700 bg-white px-2 py-1 rounded-full w-fit">
            Answer
          </span>
          <p className="mt-4 text-slate-800 flex-1 overflow-y-auto">{card.answer}</p>
          <p className="text-xs text-primary-500 text-center">Click to flip back</p>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCard;
