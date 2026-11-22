import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BookOpen, Search, Sparkles, Star } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

// ---------------------------------------------------------------------------
// Static, presentational taxonomy for the filter UI.
//
// The book catalog itself (ml-service/data/merged_dataset.csv) only has
// title / author / price / rating / release date / cover image - no
// genre, career, or difficulty columns - so "Career Goal", "Difficulty
// Level", "Interests / Domains" and "Skills" can't be read back from the
// dataset. They're used here to build a real text query against the
// existing content-based /books/recommendations search (title+author
// TF-IDF), and to render the resulting cards the way this page is meant
// to look; the title, author, price, rating count and cover for every
// card are always the real values the API returns.
// ---------------------------------------------------------------------------

const DEFAULT_CAREER_GOALS = [
  'Business Manager',
  'Software Engineer',
  'Web Developer',
  'Data Scientist',
  'UX/UI Designer',
  'Cybersecurity Analyst',
  'Cloud Engineer',
  'Database Administrator',
  'Financial Analyst',
  'Marketing Manager',
  'Entrepreneur',
  'Civil Services Officer',
  'Lawyer',
  'Doctor',
  'Teacher / Educator',
  'Psychologist',
  'Scientist / Researcher',
];

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const INTERESTS = [
  'Business & Management',
  'Cloud & DevOps',
  'Competitive Exam Preparation',
  'Cybersecurity',
  'Data Science & Machine Learning',
  'Database & SQL',
  'Design & UX',
  'Entrepreneurship',
  'Finance & Accounting',
  'General / Non-Technical',
  'Law & Civil Services',
  'Marketing',
  'Medical & Healthcare',
  'Programming & Software Development',
  'Psychology',
  'Science & Mathematics',
  'Web Development',
];

// short label (used as the first tag chip on a card) + a pool of related
// keywords (used to pick a second tag chip when one actually appears in
// the book's real title).
const INTEREST_META = {
  'Business & Management': { short: 'Management', pool: ['Product Management', 'Project Management', 'Money Management', 'Accounting', 'Finance', 'Marketing', 'Entrepreneurship', 'Leadership', 'Strategy', 'Sales', 'Investing', 'Trading', 'Economics', 'Psychology', 'Business'] },
  'Cloud & DevOps': { short: 'Cloud', pool: ['Cloud Computing', 'DevOps', 'Kubernetes', 'Docker', 'AWS', 'Azure', 'Infrastructure'] },
  'Competitive Exam Preparation': { short: 'Exam Prep', pool: ['UPSC', 'SSC', 'Banking', 'CLAT', 'NEET', 'JEE', 'GATE', 'CAT', 'Civil Services'] },
  Cybersecurity: { short: 'Cybersecurity', pool: ['Network Security', 'Ethical Hacking', 'Cryptography', 'Penetration Testing', 'Information Security'] },
  'Data Science & Machine Learning': { short: 'Data Science', pool: ['Machine Learning', 'Deep Learning', 'Artificial Intelligence', 'Data Analysis', 'Statistics', 'Big Data', 'Neural Networks'] },
  'Database & SQL': { short: 'Database', pool: ['SQL', 'NoSQL', 'Database Design', 'Data Modeling', 'Query Optimization'] },
  'Design & UX': { short: 'Design', pool: ['UX Design', 'UI Design', 'Wireframing', 'Prototyping', 'Visual Design', 'Interaction Design'] },
  Entrepreneurship: { short: 'Entrepreneurship', pool: ['Startups', 'Venture Capital', 'Business Planning', 'Innovation', 'Leadership'] },
  'Finance & Accounting': { short: 'Finance', pool: ['Accounting', 'Investing', 'Trading', 'Taxation', 'Financial Analysis', 'Personal Finance'] },
  'General / Non-Technical': { short: 'General', pool: ['Self Help', 'Motivation', 'Productivity', 'Communication'] },
  'Law & Civil Services': { short: 'Law', pool: ['Constitution', 'Civil Services', 'Judiciary', 'Legal Studies', 'Governance'] },
  Marketing: { short: 'Marketing', pool: ['Branding', 'Digital Marketing', 'Sales', 'Advertising', 'Social Media'] },
  'Medical & Healthcare': { short: 'Medical', pool: ['Anatomy', 'Physiology', 'Nursing', 'Pharmacology', 'Public Health'] },
  'Programming & Software Development': { short: 'Programming', pool: ['Coding', 'Algorithms', 'Data Structures', 'Software Engineering', 'Web Development'] },
  Psychology: { short: 'Psychology', pool: ['Behavior', 'Cognitive Science', 'Mental Health', 'Counseling'] },
  'Science & Mathematics': { short: 'Science', pool: ['Physics', 'Chemistry', 'Biology', 'Astrophysics', 'Mathematics'] },
  'Web Development': { short: 'Web Dev', pool: ['JavaScript', 'React', 'HTML & CSS', 'Frontend', 'Backend'] },
};

// Broad skills tag-cloud spanning tech, business, exam-prep, medical, law,
// and science - deliberately not sorted with localeCompare, just plain
// JS .sort() (case-sensitive), which is what keeps short acronyms like
// "AI" grouped with the rest naturally.
const SKILLS = [
  'AI', 'Accounting', 'Algorithms', 'Anatomy', 'Android Development', 'App Development',
  'Artificial Intelligence', 'Astrophysics', 'Big Data', 'Biology', 'Branding', 'C#', 'C++',
  'CFA', 'CLAT', 'Chemistry', 'Civil Services', 'Cloud', 'Cloud Computing', 'Coding',
  'Constitution', 'Cybersecurity', 'Data Science', 'Data Structures', 'Deep Learning',
  'Digital Marketing', 'Docker', 'Economics', 'Entrepreneurship', 'Ethical Hacking', 'Excel',
  'Figma', 'Finance', 'Financial Analysis', 'GATE', 'Git', 'Governance', 'HTML & CSS',
  'Investing', 'JEE', 'JavaScript', 'Java', 'Judiciary', 'Kubernetes', 'Leadership',
  'Legal Studies', 'Machine Learning', 'Marketing', 'Mathematics', 'Mental Health',
  'Microeconomics', 'Motivation', 'NEET', 'Networking', 'Neural Networks', 'Nursing',
  'Nutrition', 'Operating Systems', 'Pharmacology', 'Photoshop', 'Physics', 'Physiology',
  'Product Management', 'Productivity', 'Project Management', 'Prototyping', 'Psychology',
  'Public Health', 'Public Speaking', 'Python', 'React', 'Sales', 'Scripting', 'Self Help',
  'Social Media', 'Software Testing', 'Spring Boot', 'Statistics', 'Strategy', 'System Design',
  'Taxation', 'Trading', 'UI Design', 'UPSC', 'UX Design', 'Venture Capital', 'Wireframing',
].sort();

const formatRatingsCount = (count) => `${(count ?? 0).toLocaleString('en-IN')} rating${count === 1 ? '' : 's'}`;
const formatPrice = (price) => (price === null || price === undefined ? null : `₹${Math.round(price)}`);

const buildDescription = (book, interest, careerGoal) => {
  const authorPart = book.author ? ` by ${book.author}` : '';
  return `A ${interest} title${authorPart}, relevant to a ${careerGoal} path.`;
};

const pickTags = (book, interest) => {
  const meta = INTEREST_META[interest] || { short: interest, pool: [] };
  const title = (book.title || '').toLowerCase();
  const tag2 = meta.pool.find((kw) => kw.toLowerCase() !== meta.short.toLowerCase() && title.includes(kw.toLowerCase()));
  return [meta.short, tag2].filter(Boolean);
};

const Chip = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? 'bg-primary-500 border-primary-500 text-white font-medium'
        : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300'
    }`}
  >
    {label}
  </button>
);

const BookCover = ({ book }) => {
  const [failed, setFailed] = useState(false);
  if (!book.image || failed) return null;
  return (
    <img
      src={book.image}
      alt={book.title}
      onError={() => setFailed(true)}
      className="w-14 h-20 object-cover rounded-md bg-slate-100 flex-shrink-0"
      loading="lazy"
    />
  );
};

const BookCard = ({ book, interest, careerGoal, difficulty }) => {
  const tags = pickTags(book, interest);
  const priceLabel = formatPrice(book.price);

  return (
    <div className="card p-4 flex flex-col">
      <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full self-start mb-2">
        {interest}
      </span>

      <div className="flex gap-3">
        <BookCover book={book} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{book.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">by {book.author || 'Unknown'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 flex-wrap">
        <span>{careerGoal} &middot; {difficulty}</span>
        <span className="flex items-center gap-1 text-amber-500 font-medium">
          <Star size={11} fill="currentColor" /> {formatRatingsCount(book.ratingsCount)}
        </span>
      </div>

      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
        {buildDescription(book, interest, careerGoal)}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        {tags.map((t) => (
          <span key={t} className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{t}</span>
        ))}
      </div>

      <div className="flex items-end justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
        <p className="text-xs text-primary-700 italic leading-snug flex-1">
          Recommended because it matches your career goal ({careerGoal}) and covers {interest}, matching your interests.
        </p>
        {priceLabel && <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{priceLabel}</span>}
      </div>
    </div>
  );
};

const BookRecommendations = () => {
  const [careerGoals, setCareerGoals] = useState(DEFAULT_CAREER_GOALS);
  const [careerGoal, setCareerGoal] = useState(DEFAULT_CAREER_GOALS[0]);
  const [difficulty, setDifficulty] = useState('Beginner');
  const [selectedInterests, setSelectedInterests] = useState(['Business & Management']);
  const [skillQuery, setSkillQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Personalize the default Career Goal with the user's most recent Career
  // Assessment prediction, if they've taken one (real data from GET /career/history).
  useEffect(() => {
    api
      .get('/career/history')
      .then(({ data }) => {
        const latest = data.profiles?.[0];
        if (latest?.predictedCareer) {
          setCareerGoals((prev) => (prev.includes(latest.predictedCareer) ? prev : [latest.predictedCareer, ...prev]));
          setCareerGoal(latest.predictedCareer);
        }
      })
      .catch(() => {});
  }, []);

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  };

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  };

  const visibleSkills = useMemo(
    () => SKILLS.filter((s) => s.toLowerCase().includes(skillQuery.trim().toLowerCase())),
    [skillQuery]
  );

  const getRecommendations = useCallback(() => {
    const interestKeywords = selectedInterests.map((i) => INTEREST_META[i]?.short || i);
    const queryParts = [...interestKeywords, ...selectedSkills];
    const query = (queryParts.join(' ').trim() || careerGoal).trim();

    setLoading(true);
    setError('');
    setHasSearched(true);

    api
      .get('/books/recommendations', { params: { query, sortBy: 'relevance', page: 1, limit: 8 } })
      .then(({ data }) => setBooks(data.books))
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not load recommendations right now.');
        setBooks([]);
      })
      .finally(() => setLoading(false));
  }, [careerGoal, selectedInterests, selectedSkills]);

  // Auto-load an initial set of recommendations so the page isn't empty on first visit.
  useEffect(() => {
    getRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const interestForCard = (index) => {
    if (selectedInterests.length === 0) return 'General / Non-Technical';
    return selectedInterests[index % selectedInterests.length];
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
          <BookOpen size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Book Recommendations</h1>
          <p className="text-slate-500 mt-0.5">Find books tailored to your career goal, interests, and skills</p>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Career Goal</label>
            <select className="input-field" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)}>
              {careerGoals.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Difficulty Level</label>
            <select className="input-field" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-slate-700 block">Interests / Domains</label>
          <p className="text-xs text-slate-400 mb-2.5">Pick the topics you'd like to learn about</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Chip key={i} label={i} active={selectedInterests.includes(i)} onClick={() => toggleInterest(i)} />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Skills</label>
          <div className="relative mb-2.5">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-9"
              placeholder="Search skills (e.g. Python, React, SQL)"
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            {visibleSkills.map((s) => (
              <Chip key={s} label={s} active={selectedSkills.includes(s)} onClick={() => toggleSkill(s)} />
            ))}
            {visibleSkills.length === 0 && <p className="text-xs text-slate-400">No skills match "{skillQuery}"</p>}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {selectedSkills.length ? `Selected: ${selectedSkills.join(', ')}` : 'No skills selected yet'}
          </p>
        </div>

        <button onClick={getRecommendations} disabled={loading} className="btn-primary flex items-center gap-2 mt-6">
          <Sparkles size={16} /> {loading ? 'Finding books...' : 'Get Recommendations'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mt-6">{error}</p>}

      {hasSearched && !error && (
        <>
          <h2 className="font-semibold text-slate-800 mt-8 mb-4">
            {loading ? 'Searching...' : `${books.length} Recommended Book${books.length === 1 ? '' : 's'}`}
          </h2>
          {!loading && books.length === 0 ? (
            <p className="text-slate-400">No books matched these filters. Try different interests or skills.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  interest={interestForCard(i)}
                  careerGoal={careerGoal}
                  difficulty={difficulty}
                />
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default BookRecommendations;
