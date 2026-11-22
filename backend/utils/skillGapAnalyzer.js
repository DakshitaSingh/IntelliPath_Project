const { CAREER_SKILLS_MAP } = require('./careerSkillsMap');

/**
 * Compares a student's self-reported skills against the skills required for
 * their predicted career and classifies each required skill as:
 *   - strong:   student marked themselves confident in it
 *   - moderate: student marked themselves as currently learning it
 *   - missing:  student has neither confidence nor exposure
 *
 * `priority` lists the missing skills in the order they appear in the
 * career's skill list (that list is authored foundational -> advanced), so
 * earlier entries are the highest-priority gaps to close first.
 *
 * @param {string} career - must be a key in CAREER_SKILLS_MAP
 * @param {string[]} confidentSkills - skills the student is confident in
 * @param {string[]} learningSkills - skills the student is currently learning
 */
const analyzeSkillGap = (career, confidentSkills = [], learningSkills = []) => {
  const required = CAREER_SKILLS_MAP[career] || [];
  const confident = new Set((confidentSkills || []).map((s) => s.trim()));
  const learning = new Set((learningSkills || []).map((s) => s.trim()));

  const strong = [];
  const moderate = [];
  const missing = [];

  required.forEach((skill) => {
    if (confident.has(skill)) strong.push(skill);
    else if (learning.has(skill)) moderate.push(skill);
    else missing.push(skill);
  });

  // Missing skills, in the taxonomy's foundational -> advanced order = priority order
  const priority = required.filter((skill) => missing.includes(skill));

  const readinessScore = required.length
    ? Math.round(((strong.length + moderate.length * 0.5) / required.length) * 100)
    : 0;

  return { requiredSkills: required, strong, moderate, missing, priority, readinessScore };
};

module.exports = { analyzeSkillGap };
