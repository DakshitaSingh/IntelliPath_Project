import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Sparkles, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

const CareerGuidance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/career/history')
      .then(({ data }) => setHistory(data.profiles))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
          <Compass size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Career Guidance</h1>
          <p className="text-slate-500 mt-0.5">AI-powered career prediction, skill-gap analysis and a personalized roadmap</p>
        </div>
      </div>

      <div className="card mt-6 p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white border-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles size={18} /> Take the Career Assessment
            </h2>
            <p className="text-primary-50 mt-1 max-w-xl text-sm">
              Answer questions about your academics, aptitude and skills. Our model compares your profile
              against the careers it was trained on and gives you a ranked recommendation, a skill-gap
              breakdown, and a personalized learning roadmap.
            </p>
          </div>
          <Link
            to="/career/assessment"
            className="bg-white text-primary-700 font-medium px-4 py-2.5 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1 whitespace-nowrap"
          >
            Start Assessment <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Your Past Assessments</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-400">
            You haven't taken the career assessment yet. Start one above to get your first recommendation.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((p) => (
              <li key={p._id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{p.predictedCareer}</p>
                  <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-md">
                    {p.matchScore}% match
                  </span>
                  <Link to={`/career/results/${p._id}`} className="text-xs text-primary-600 font-medium">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
};

export default CareerGuidance;
