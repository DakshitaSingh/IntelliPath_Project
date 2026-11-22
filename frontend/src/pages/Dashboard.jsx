import React, { useEffect, useState } from 'react';
import { FileText, Layers, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalDocuments: 0, totalFlashcards: 0, totalQuizzes: 0 });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => {
        setStats(data.stats);
        setActivity(data.recentActivity);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="text-slate-500 mt-1">Track your learning progress and activity</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <StatCard label="Total Documents" value={stats.totalDocuments} icon={FileText} color="#3b82f6" />
        <StatCard label="Total Flashcards" value={stats.totalFlashcards} icon={Layers} color="#ec4899" />
        <StatCard label="Total Quizzes" value={stats.totalQuizzes} icon={HelpCircle} color="#f59e0b" />
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Recent Activity</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-slate-400">
            No activity yet. <Link to="/documents" className="text-primary-600 font-medium">Upload a document</Link> to get started.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((a) => (
              <li key={a._id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">{a.description}</p>
                  <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                {a.relatedDocument && (
                  <Link to={`/documents/${a.relatedDocument}`} className="text-xs text-primary-600 font-medium">
                    View
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
