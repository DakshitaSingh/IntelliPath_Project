const { getResourcesForSkill } = require('./learningResources');

const PHASE_SIZE = 2; // skills grouped per phase - keeps each phase focused

/**
 * Builds a personalized, phased roadmap from a prioritized list of missing
 * skills. Since `priorityGaps` already differs per student (it depends on
 * their predicted career AND their own current skills), the resulting
 * roadmap is naturally personalized rather than a static template.
 *
 * @param {string[]} priorityGaps - missing skills, highest priority first
 * @param {string[]} moderateSkills - skills the student is already learning
 *        (included as a lighter-weight "reinforce" phase at the end)
 */
const generateRoadmap = (priorityGaps = [], moderateSkills = []) => {
  const phases = [];

  for (let i = 0; i < priorityGaps.length; i += PHASE_SIZE) {
    const skillsInPhase = priorityGaps.slice(i, i + PHASE_SIZE);
    phases.push({
      phase: phases.length + 1,
      title: skillsInPhase.join(' + '),
      skills: skillsInPhase,
      resources: skillsInPhase.flatMap((skill) =>
        getResourcesForSkill(skill).map((r) => ({ skill, ...r }))
      ),
    });
  }

  if (moderateSkills.length > 0) {
    phases.push({
      phase: phases.length + 1,
      title: `Reinforce: ${moderateSkills.join(' + ')}`,
      skills: moderateSkills,
      resources: moderateSkills.flatMap((skill) =>
        getResourcesForSkill(skill).map((r) => ({ skill, ...r }))
      ),
    });
  }

  return phases;
};

module.exports = { generateRoadmap };
