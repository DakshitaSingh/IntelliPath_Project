import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

const QuizResults = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(`/quizzes/results/${id}`).then(({ data }) => setResult(data));
  }, [id]);

  if (!result) return <AppLayout><p className="text-slate-400">Loading results...</p></AppLayout>;

  const pct = Math.round((result.score / result.total) * 100);

  return (
    <AppLayout>
      <div className="card p-6 text-center max-w-md mx-auto">
        <p className="text-sm text-slate-500">{result.title}</p>
        <h1 className="text-4xl font-bold text-primary-600 mt-2">
          {result.score}/{result.total}
        </h1>
        <p className="text-slate-500 mt-1">{pct}% correct</p>
        <Link to="/quizzes" className="btn-primary inline-block mt-4">
          Back to Quizzes
        </Link>
      </div>

      <div className="space-y-4 mt-6 max-w-2xl">
        {result.questions.map((q, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start gap-2">
              {q.isCorrect ? (
                <CheckCircle2 size={18} className="text-primary-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              )}
              <p className="font-medium text-slate-800">{q.question}</p>
            </div>
            <div className="mt-3 space-y-1.5 ml-7">
              {q.options.map((opt, oi) => {
                const isCorrectAnswer = oi === q.correctIndex;
                const isSelected = oi === q.selectedIndex;
                let style = 'border-slate-200 text-slate-600';
                if (isCorrectAnswer) style = 'border-primary-500 bg-primary-50 text-primary-700';
                else if (isSelected && !isCorrectAnswer) style = 'border-red-300 bg-red-50 text-red-600';
                return (
                  <div key={oi} className={`px-3 py-2 rounded-lg border text-sm ${style}`}>
                    {opt}
                    {isSelected && !isCorrectAnswer && <span className="text-xs ml-2">(Your answer)</span>}
                  </div>
                );
              })}
            </div>
            {q.explanation && (
              <p className="text-sm text-slate-500 mt-3 ml-7 bg-slate-50 rounded-lg p-3">{q.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default QuizResults;
