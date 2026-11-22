const mongoose = require('mongoose');

const topCareerSchema = new mongoose.Schema(
  {
    career: { type: String, required: true },
    matchScore: { type: Number, required: true },
  },
  { _id: false }
);

const roadmapPhaseSchema = new mongoose.Schema(
  {
    phase: { type: Number, required: true },
    title: { type: String, required: true },
    skills: { type: [String], default: [] },
    resources: {
      type: [
        {
          skill: String,
          title: String,
          platform: String,
          url: String,
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const careerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Raw assessment inputs (also the exact features sent to the ML model)
    assessment: {
      academic10th: { type: Number, required: true },
      academic12th: { type: Number, required: true },
      logicalQuotient: { type: Number, required: true },
      hackathons: { type: Number, required: true },
      codingSkills: { type: Number, required: true },
      publicSpeaking: { type: Number, required: true },
      selfLearningCapability: { type: String, enum: ['yes', 'no'], required: true },
      extraCourses: { type: String, enum: ['yes', 'no'], required: true },
      certifications: { type: String, required: true },
      workshops: { type: String, required: true },
      interestedSubjects: { type: String, required: true },
      interestedCareerArea: { type: String, required: true },
    },

    // Skills the student reported for themselves (used only for skill-gap
    // analysis, not fed into the ML model)
    confidentSkills: { type: [String], default: [] },
    learningSkills: { type: [String], default: [] },

    // ML prediction output
    predictedCareer: { type: String, required: true },
    matchScore: { type: Number, required: true },
    topRecommendations: { type: [topCareerSchema], default: [] },
    modelUsed: { type: String },
    explanation: {
      strengths: { type: [String], default: [] },
      reasoning: { type: [String], default: [] },
    },

    // Skill gap analysis output
    skillGap: {
      requiredSkills: { type: [String], default: [] },
      strong: { type: [String], default: [] },
      moderate: { type: [String], default: [] },
      missing: { type: [String], default: [] },
      priority: { type: [String], default: [] },
      readinessScore: { type: Number, default: 0 },
    },

    // Personalized roadmap output
    roadmap: { type: [roadmapPhaseSchema], default: [] },
  },
  { timestamps: true }
);

// NOTE: `user` is intentionally NOT unique. A student can take the Career
// Assessment multiple times and each attempt creates its own CareerProfile
// document (see careerController.submitAssessment, which always uses
// `.create()`). This index only speeds up the common queries ("this user's
// profiles, most recent first") - it does not enforce one-profile-per-user.
careerProfileSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CareerProfile', careerProfileSchema);
