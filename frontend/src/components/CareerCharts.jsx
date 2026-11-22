import React from 'react';

/**
 * Career Prediction result charts.
 *
 * These render ONLY the actual scores already produced by
 * ml-service/app.py's /predict-career endpoint (profile.topRecommendations /
 * profile.matchScore, stored as-is on CareerProfile). Nothing here invents,
 * rounds up, or re-derives a score - it's the same numbers already shown as
 * plain text elsewhere on the page, just visualized.
 *
 * Built as plain inline SVG rather than pulling in a charting library:
 * the project has no chart dependency today and two small, static charts
 * don't justify adding one.
 */

// Circular "match score" ring for the single top career.
export const MatchScoreRing = ({ score, size = 132, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${clamped}% match score`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#6366f1"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-800"
        style={{ fontSize: size * 0.2, fontWeight: 700 }}
      >
        {Math.round(clamped)}%
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-400"
        style={{ fontSize: size * 0.075 }}
      >
        match
      </text>
    </svg>
  );
};

// Horizontal bar chart ranking every career the model returned a score for.
export const CareerBarChart = ({ careers, highlightCareer }) => {
  if (!careers || careers.length === 0) return null;
  const maxScore = Math.max(...careers.map((c) => c.matchScore), 1);

  return (
    <svg
      viewBox={`0 0 400 ${careers.length * 34 + 10}`}
      width="100%"
      height={careers.length * 34 + 10}
      role="img"
      aria-label="Career match ranking chart"
    >
      {careers.map((c, i) => {
        const isTop = c.career === highlightCareer;
        const barWidth = (c.matchScore / maxScore) * 260;
        const y = i * 34;
        return (
          <g key={c.career} transform={`translate(0, ${y})`}>
            <text x="0" y="14" className={isTop ? 'fill-slate-800' : 'fill-slate-500'} style={{ fontSize: 12, fontWeight: isTop ? 600 : 400 }}>
              {c.career.length > 26 ? `${c.career.slice(0, 24)}…` : c.career}
            </text>
            <rect x="0" y="20" width="260" height="8" rx="4" className="fill-slate-100" />
            <rect
              x="0"
              y="20"
              width={Math.max(barWidth, 2)}
              height="8"
              rx="4"
              fill={isTop ? '#6366f1' : '#a5b4fc'}
              style={{ transition: 'width 0.6s ease' }}
            />
            <text x="268" y="27" className={isTop ? 'fill-primary-600' : 'fill-slate-500'} style={{ fontSize: 11, fontWeight: isTop ? 600 : 400 }}>
              {c.matchScore}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// "Career Comparison" panel: each career gets its own labeled row with a
// thin horizontal bar plotted against a shared, fixed 0-100% axis (rather
// than being rescaled to whichever career happens to score highest), plus
// axis tick labels along the bottom - mirrors how the match score itself is
// already expressed as a plain 0-100% confidence value everywhere else on
// the page. Same source data as CareerBarChart (profile.topRecommendations).
export const CareerComparisonChart = ({ careers, highlightCareer, maxRows = 4 }) => {
  if (!careers || careers.length === 0) return null;
  const rows = careers.slice(0, maxRows);
  const ticks = [0, 25, 50, 100];

  return (
    <div>
      <div className="relative" style={{ paddingBottom: 4 }}>
        {/* shared vertical gridlines behind every bar row */}
        <div className="absolute inset-0 pointer-events-none">
          {ticks.map((t) => (
            <div key={t} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${t}%` }} />
          ))}
        </div>

        <div className="relative flex flex-col gap-3.5">
          {rows.map((c) => {
            const isTop = c.career === highlightCareer;
            const width = Math.max(0, Math.min(100, c.matchScore));
            return (
              <div key={c.career}>
                <p
                  className={`text-xs mb-1 ${isTop ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
                  title={c.career}
                >
                  {c.career}
                </p>
                <div className="h-2 rounded-full bg-slate-100 relative overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: isTop ? '#6366f1' : '#a5b4fc',
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative flex justify-between text-[10px] text-slate-400 mt-1">
        {ticks.map((t) => (
          <span key={t}>{t}%</span>
        ))}
      </div>
    </div>
  );
};
