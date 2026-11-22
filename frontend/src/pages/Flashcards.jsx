import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Trash2, Star } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

const Flashcards = () => {
  const [sets, setSets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [view, setView] = useState('sets');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/flashcards/sets'), api.get('/flashcards/favorites')])
      .then(([setsRes, favRes]) => {
        setSets(setsRes.data.sets);
        setFavorites(favRes.data.cards);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (setId) => {
    if (!window.confirm('Delete this flashcard set?')) return;
    await api.delete(`/flashcards/sets/${setId}`);
    setSets((prev) => prev.filter((s) => s._id !== setId));
  };

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800">Flashcards</h1>
      <p className="text-slate-500 mt-1">Review your auto-generated flashcard sets</p>

      <div className="flex gap-2 mt-5">
        <button
          onClick={() => setView('sets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'sets' ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          All Sets
        </button>
        <button
          onClick={() => setView('favorites')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${view === 'favorites' ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <Star size={14} /> Favorites
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 mt-8">Loading...</p>
      ) : view === 'sets' ? (
        sets.length === 0 ? (
          <div className="card mt-6 p-10 text-center">
            <Layers size={32} className="mx-auto text-slate-300" />
            <p className="text-slate-500 mt-3">
              No flashcard sets yet. Open a document and generate one from the AI Actions tab.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {sets.map((s) => (
              <div key={s._id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {s.cardCount} Cards
                  </span>
                  <button onClick={() => handleDelete(s._id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-800 mt-3">{s.title}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Created {new Date(s.createdAt).toLocaleDateString()} &middot; {s.reviewedCount}/{s.cardCount} reviewed
                </p>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                  <div
                    className="bg-primary-500 h-1.5 rounded-full"
                    style={{ width: `${s.cardCount ? (s.reviewedCount / s.cardCount) * 100 : 0}%` }}
                  />
                </div>
                <Link to={`/flashcards/${s._id}`} className="btn-primary text-center mt-4">
                  Study Now
                </Link>
              </div>
            ))}
          </div>
        )
      ) : favorites.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <Star size={32} className="mx-auto text-slate-300" />
          <p className="text-slate-500 mt-3">No favorite flashcards yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {favorites.map((c) => (
            <div key={c._id} className="card p-5">
              <p className="text-xs text-slate-400 mb-2">{c.set?.title}</p>
              <p className="font-medium text-slate-800">{c.question}</p>
              <p className="text-sm text-slate-500 mt-2">{c.answer}</p>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default Flashcards;
