import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import FlashcardCard from '../components/FlashcardCard';

const FlashcardStudy = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    api.get(`/flashcards/sets/${setId}`).then(({ data }) => {
      setSet(data.set);
      setCards(data.cards);
    });
  }, [setId]);

  const handleFavorite = async (cardId) => {
    const { data } = await api.patch(`/flashcards/${cardId}/favorite`);
    setCards((prev) => prev.map((c) => (c._id === cardId ? data.card : c)));
  };

  const handleReviewed = async (cardId) => {
    const { data } = await api.patch(`/flashcards/${cardId}/reviewed`);
    setCards((prev) => prev.map((c) => (c._id === cardId ? data.card : c)));
  };

  if (!set) return <AppLayout><p className="text-slate-400">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <button onClick={() => navigate('/flashcards')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={16} /> Back to Flashcards
      </button>
      <h1 className="text-xl font-bold text-slate-800">{set.title}</h1>
      <p className="text-slate-500 text-sm mt-1">{cards.length} cards &middot; click a card to flip it</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {cards.map((c) => (
          <FlashcardCard key={c._id} card={c} onFavorite={handleFavorite} onReviewed={handleReviewed} />
        ))}
      </div>
    </AppLayout>
  );
};

export default FlashcardStudy;
