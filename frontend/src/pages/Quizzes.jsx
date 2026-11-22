import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

const Quizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/quizzes')
      .then(({ data }) => setQuizzes(data.quizzes))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800">Quizzes</h1>
      <p className="text-slate-500 mt-1">Test your knowledge with AI-generated quizzes</p>

      {loading ? (
        <p className="text-slate-400 mt-8">Loading...</p>
      ) : quizzes.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <HelpCircle size={32} className="mx-auto text-slate-300" />
          <p className="text-slate-500 mt-3">
            No quizzes yet. Open a document and generate one from the AI Actions tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {quizzes.map((q) => (
            <div key={q._id} className="card p-5 flex flex-col">
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full w-fit">
                {q.questionCount} Questions
              </span>
              <h3 className="font-semibold text-slate-800 mt-3">{q.title}</h3>
              <p className="text-xs text-slate-400 mt-1">
                From {q.document?.title} &middot; {new Date(q.createdAt).toLocaleDateString()}
              </p>
              <Link to={`/quizzes/${q._id}`} className="btn-primary text-center mt-4">
                Start Quiz
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default Quizzes;
