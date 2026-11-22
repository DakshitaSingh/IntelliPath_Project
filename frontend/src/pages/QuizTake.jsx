import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

const QuizTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/quizzes/${id}`).then(({ data }) => setQuiz(data.quiz));
  }, [id]);

  if (!quiz) return <AppLayout><p className="text-slate-400">Loading quiz...</p></AppLayout>;

  const q = quiz.questions[current];
  const answeredCount = Object.keys(answers).length;

  const selectOption = (optIndex) => {
    setAnswers((prev) => ({ ...prev, [q._id]: optIndex }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
    try {
      const { data } = await api.post(`/quizzes/${id}/submit`, { answers: payload });
      navigate(`/quizzes/results/${data.resultId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <button onClick={() => navigate('/quizzes')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={16} /> Back to Quizzes
      </button>

      <div className="card p-6 max-w-2xl">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>Question {current + 1} of {quiz.questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6">
          <div
            className="bg-primary-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <h2 className="font-semibold text-slate-800 text-lg mb-5">{q.question}</h2>

        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectOption(i)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                answers[q._id] === i
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            className="btn-secondary"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            Previous
          </button>
          {current === quiz.questions.length - 1 ? (
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting || answeredCount === 0}>
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              className="btn-primary flex items-center gap-1"
              onClick={() => setCurrent((c) => Math.min(quiz.questions.length - 1, c + 1))}
            >
              Next <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default QuizTake;
