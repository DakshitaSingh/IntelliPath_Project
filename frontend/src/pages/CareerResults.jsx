import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  BarChart3,
  ListChecks,
  ListOrdered,
  History,
  Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { MatchScoreRing, CareerComparisonChart } from '../components/CareerCharts';

// Short, presentational blurbs for the 12 careers the ML model is trained on
// (ml-service/models/metadata.json -> dataset.classes / backend/utils/careerSkillsMap.js).
// Purely descriptive copy for this page - the prediction, match score and
// skills themselves all still come from the real profile data.
const CAREER_DESCRIPTIONS = {
  'Applications Developer':
    'Builds and maintains end-user software applications, working across the full stack from interface to database.',
  'CRM Technical Developer':
    'Customizes and integrates CRM platforms, connecting business processes to the systems that manage customer data.',
  'Database Developer':
    'Designs, implements, and optimizes databases and queries that power applications, focusing on schema design, performance, and data integrity.',
  'Mobile Applications Developer':
    'Builds native or cross-platform mobile apps, focusing on UI, performance, and integration with backend services.',
  'Network Security Engineer':
    'Protects networks and infrastructure from threats, configuring firewalls, VPNs, and monitoring for intrusions.',
  'Software Developer':
    'Designs, builds, and tests software systems end-to-end, translating requirements into working, maintainable code.',
  'Software Engineer':
    'Applies engineering principles across the software lifecycle, from system design and architecture to deployment and reliability.',
  'Software Quality Assurance (QA) / Testing':
    'Verifies software quality through manual and automated testing, catching defects before they reach production.',
  'Systems Security Administrator':
    'Manages access controls, security audits, and incident response to keep organizational systems secure.',
  'Technical Support':
    'Helps end-users resolve technical issues, troubleshooting hardware, software, and network problems.',
  'UX Designer':
    'Researches user needs and designs intuitive, usable interfaces through wireframes, prototypes, and testing.',
  'Web Developer':
    'Builds websites and web applications, working with HTML/CSS/JavaScript on the frontend and often a backend stack too.',
};

const SkillLine = ({ skill }) => (
  <p className="text-sm text-slate-600 py-0.5">{skill}</p>
);

const CareerResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api
      .get(`/career/${id}`)
      .then(({ data }) => setProfile(data.profile))
      .catch((err) => setError(err.response?.data?.message || 'Could not load this result'));
  }, [id]);

  useEffect(() => {
    api
      .get('/career/history')
      .then(({ data }) => setHistory(data.profiles))
      .catch(() => {});
  }, [id]);

  if (error) {
    return (
      <AppLayout>
        <p className="text-red-600 text-sm">{error}</p>
      </AppLayout>
    );
  }
  if (!profile) return <AppLayout><p className="text-slate-400">Loading your results...</p></AppLayout>;

  const { skillGap, roadmap } = profile;
  const description = CAREER_DESCRIPTIONS[profile.predictedCareer]
    || `A recommended path based on your assessment answers, matched against ${profile.modelUsed || 'our model'}'s trained careers.`;

  return (
    <AppLayout>
      <button onClick={() => navigate('/career')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={16} /> Back to Career Guidance
      </button>

      <div className="card p-6">
        <div className="grid lg:grid-cols-[1fr_1.3fr_1fr] gap-6 lg:gap-8">
          {/* Predicted career */}
          <div>
            <div className="flex items-center gap-1.5 text-primary-600 mb-2">
              <CheckCircle2 size={15} />
              <span className="text-xs font-semibold uppercase tracking-wide">Predicted Career</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{profile.predictedCareer}</h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>

            <div className="flex justify-center lg:justify-start mt-6">
              <MatchScoreRing score={profile.matchScore} />
            </div>
          </div>

          {/* Career comparison */}
          <div className="lg:border-l lg:border-slate-100 lg:pl-8">
            <div className="flex items-center gap-1.5 text-slate-800 mb-1">
              <BarChart3 size={16} className="text-primary-600" />
              <h2 className="text-sm font-semibold">Career Comparison</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              How your top career compares to the runner-up matches
            </p>
            <CareerComparisonChart careers={profile.topRecommendations} highlightCareer={profile.predictedCareer} />
          </div>

          {/* Skills */}
          <div className="lg:border-l lg:border-slate-100 lg:pl-8">
            <div className="flex items-center gap-1.5 text-slate-800 mb-3">
              <ListChecks size={16} className="text-primary-600" />
              <h2 className="text-sm font-semibold">Skills</h2>
            </div>

            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Required</p>
            <div className="mb-4">
              {skillGap.requiredSkills.length ? (
                skillGap.requiredSkills.map((s) => <SkillLine key={s} skill={s} />)
              ) : (
                <p className="text-sm text-slate-400">Not available</p>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Recommended to Learn</p>
            <div>
              {skillGap.priority.length ? (
                skillGap.priority.map((s) => <SkillLine key={s} skill={s} />)
              ) : (
                <p className="text-sm text-slate-400">You're already covered - nothing new to prioritize.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center gap-1.5 text-slate-800 mb-1">
          <ListOrdered size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold">Learning Roadmap</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Ordered from foundational to advanced, prioritizing your biggest gaps first
        </p>
        {roadmap.length === 0 ? (
          <p className="text-sm text-slate-400">No roadmap needed - your current skills already cover this career well.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {roadmap.map((phase) => (
              <div key={phase.phase} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                  {phase.phase}
                </span>
                <p className="text-sm text-slate-700 leading-snug">{phase.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center gap-1.5 text-slate-800 mb-4">
          <History size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold">Prediction History</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">No past assessments yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((p) => (
              <li key={p._id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {p._id === profile._id && <Sparkles size={13} className="text-primary-500 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${p._id === profile._id ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                      {p.predictedCareer}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-md">
                    {p.matchScore}% match
                  </span>
                  {p._id === profile._id ? (
                    <span className="text-xs text-slate-300 font-medium">Viewing</span>
                  ) : (
                    <Link to={`/career/results/${p._id}`} className="text-xs text-primary-600 font-medium">
                      View
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
};

export default CareerResults;
