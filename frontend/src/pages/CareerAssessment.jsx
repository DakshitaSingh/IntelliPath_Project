import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

// Categorical options are the exact values present in the training dataset
// (Student Data1.csv) so every choice here maps to something the model
// actually learned from - no made-up categories.
const CERTIFICATION_OPTIONS = [
  'information security', 'shell programming', 'machine learning', 'full stack',
  'hadoop', 'r programming', 'python', 'distro making', 'app development',
];
const WORKSHOP_OPTIONS = [
  'testing', 'game development', 'system designing', 'cloud computing',
  'data science', 'hacking', 'database security', 'web technologies',
];
const SUBJECT_OPTIONS = [
  'programming', 'Management', 'networks', 'data engineering', 'IOT',
  'parallel computing', 'hacking', 'cloud computing', 'Computer Architecture', 'Software Engineering',
];
const CAREER_AREA_OPTIONS = [
  'testing', 'system developer', 'security', 'Business process analyst', 'developer', 'cloud computing',
];

const RatingSlider = ({ label, value, onChange, min = 0, max = 10 }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <span className="text-sm font-semibold text-primary-600">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary-500"
    />
  </div>
);

// Root-cause fix for the "10 -> delete -> type 64 becomes 064" bug.
//
// The old inputs were `value={form.x}` with `onChange={(e) => update('x', Number(e.target.value))}`.
// Converting "" straight to 0 inside onChange meant that, after clearing the
// field, the very next keystroke was appended onto a redisplayed "0" instead
// of into a genuinely empty box (e.g. "0" + "6" + "4" -> "064").
//
// Fix: keep the input's own displayed text as local state (`raw`), independent
// from the parent's numeric form value. The DOM always shows exactly what was
// typed - including a temporary "" - and we only push a Number up to the
// parent once the string is a complete number. If the field is left empty,
// we propagate '' (not 0) so the existing "field is required" validation on
// submit still catches it correctly.
const NumberField = ({ value, onChange, min, max, className = 'input-field mt-1' }) => {
  const [raw, setRaw] = useState(value === '' || value === undefined || value === null ? '' : String(value));

  const handleChange = (e) => {
    const next = e.target.value;
    if (next === '' || /^\d+$/.test(next)) {
      setRaw(next);
      onChange(next === '' ? '' : Number(next));
    }
  };

  const handleBlur = () => {
    // Cosmetic only: strip any leading zeros once the user is done typing
    // (e.g. a pasted "007" displays as "7"). The numeric value sent to the
    // parent was already correct on every keystroke above.
    if (raw !== '') {
      const normalized = String(Number(raw));
      if (normalized !== raw) setRaw(normalized);
    }
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      className={className}
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

const SkillChecklist = ({ title, skills, selected, onToggle, colorClass }) => (
  <div>
    <p className="text-sm font-medium text-slate-700 mb-2">{title}</p>
    <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
      {skills.map((skill) => {
        const isSelected = selected.includes(skill);
        return (
          <button
            key={skill}
            type="button"
            onClick={() => onToggle(skill)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              isSelected ? colorClass : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {skill}
          </button>
        );
      })}
    </div>
  </div>
);

const CareerAssessment = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [allSkills, setAllSkills] = useState([]);

  const [form, setForm] = useState({
    academic10th: 75,
    academic12th: 70,
    logicalQuotient: 5,
    hackathons: 1,
    codingSkills: 5,
    publicSpeaking: 5,
    selfLearningCapability: 'yes',
    extraCourses: 'no',
    certifications: CERTIFICATION_OPTIONS[0],
    workshops: WORKSHOP_OPTIONS[0],
    interestedSubjects: SUBJECT_OPTIONS[0],
    interestedCareerArea: CAREER_AREA_OPTIONS[0],
    confidentSkills: [],
    learningSkills: [],
  });

  useEffect(() => {
    api.get('/career/skills-catalog').then(({ data }) => setAllSkills(data.skills));
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSkill = (listKey, skill) => {
    setForm((prev) => {
      const current = prev[listKey];
      const otherKey = listKey === 'confidentSkills' ? 'learningSkills' : 'confidentSkills';
      const isSelected = current.includes(skill);
      return {
        ...prev,
        [listKey]: isSelected ? current.filter((s) => s !== skill) : [...current, skill],
        // A skill can only be in one bucket at a time
        [otherKey]: prev[otherKey].filter((s) => s !== skill),
      };
    });
  };

  const steps = ['Academic & Aptitude', 'Interests & Preferences', 'Current Skills'];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/career/assess', form);
      navigate(`/career/results/${data.profile._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <button onClick={() => navigate('/career')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={16} /> Back to Career Guidance
      </button>

      <div className="card p-6 max-w-2xl">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>{steps[step]}</span>
          <span>Step {step + 1} of {steps.length}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6">
          <div
            className="bg-primary-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">10th percentage</label>
                <NumberField min="35" max="100" value={form.academic10th} onChange={(v) => update('academic10th', v)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">12th percentage</label>
                <NumberField min="35" max="100" value={form.academic12th} onChange={(v) => update('academic12th', v)} />
              </div>
            </div>
            <RatingSlider label="Logical quotient rating" value={form.logicalQuotient} onChange={(v) => update('logicalQuotient', v)} />
            <RatingSlider label="Coding skills rating" value={form.codingSkills} onChange={(v) => update('codingSkills', v)} />
            <RatingSlider label="Public speaking points" value={form.publicSpeaking} onChange={(v) => update('publicSpeaking', v)} />
            <div>
              <label className="text-sm font-medium text-slate-700">Hackathons attended</label>
              <NumberField min="0" max="20" value={form.hackathons} onChange={(v) => update('hackathons', v)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700">Self-learning capability?</label>
              <div className="flex gap-2 mt-1">
                {['yes', 'no'].map((v) => (
                  <button key={v} type="button" onClick={() => update('selfLearningCapability', v)}
                    className={`px-4 py-2 rounded-lg text-sm border ${form.selfLearningCapability === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Did extra courses outside curriculum?</label>
              <div className="flex gap-2 mt-1">
                {['yes', 'no'].map((v) => (
                  <button key={v} type="button" onClick={() => update('extraCourses', v)}
                    className={`px-4 py-2 rounded-lg text-sm border ${form.extraCourses === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Certification you hold</label>
              <select className="input-field mt-1" value={form.certifications} onChange={(e) => update('certifications', e.target.value)}>
                {CERTIFICATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Workshop attended</label>
              <select className="input-field mt-1" value={form.workshops} onChange={(e) => update('workshops', e.target.value)}>
                {WORKSHOP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Interested subject</label>
              <select className="input-field mt-1" value={form.interestedSubjects} onChange={(e) => update('interestedSubjects', e.target.value)}>
                {SUBJECT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Interested career area</label>
              <select className="input-field mt-1" value={form.interestedCareerArea} onChange={(e) => update('interestedCareerArea', e.target.value)}>
                {CAREER_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">
              Tell us the skills you already have. This isn't used for the prediction itself, but powers your
              skill-gap analysis and personalized roadmap.
            </p>
            <SkillChecklist
              title="I'm confident in these skills"
              skills={allSkills}
              selected={form.confidentSkills}
              onToggle={(s) => toggleSkill('confidentSkills', s)}
              colorClass="border-primary-500 bg-primary-50 text-primary-700"
            />
            <SkillChecklist
              title="I'm currently learning these skills"
              skills={allSkills}
              selected={form.learningSkills}
              onToggle={(s) => toggleSkill('learningSkills', s)}
              colorClass="border-amber-400 bg-amber-50 text-amber-700"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="flex items-center justify-between mt-6">
          <button className="btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Previous
          </button>
          {step === steps.length - 1 ? (
            <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : 'Get My Career Prediction'}
            </button>
          ) : (
            <button className="btn-primary flex items-center gap-1" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
              Next <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CareerAssessment;
