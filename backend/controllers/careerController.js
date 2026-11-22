const CareerProfile = require('../models/CareerProfile');
const Activity = require('../models/Activity');
const { predictCareer } = require('../utils/mlServiceClient');
const { analyzeSkillGap } = require('../utils/skillGapAnalyzer');
const { generateRoadmap } = require('../utils/roadmapGenerator');
const { ALL_SKILLS, CAREER_SKILLS_MAP } = require('../utils/careerSkillsMap');

// GET /api/career/skills-catalog
// Lets the frontend render the "current skills" picker without hard-coding it.
const getSkillsCatalog = async (req, res) => {
  res.json({ skills: ALL_SKILLS, careers: Object.keys(CAREER_SKILLS_MAP) });
};

// POST /api/career/assess
const submitAssessment = async (req, res) => {
  try {
    const {
      academic10th,
      academic12th,
      logicalQuotient,
      hackathons,
      codingSkills,
      publicSpeaking,
      selfLearningCapability,
      extraCourses,
      certifications,
      workshops,
      interestedSubjects,
      interestedCareerArea,
      confidentSkills = [],
      learningSkills = [],
    } = req.body;

    const required = {
      academic10th,
      academic12th,
      logicalQuotient,
      hackathons,
      codingSkills,
      publicSpeaking,
      selfLearningCapability,
      extraCourses,
      certifications,
      workshops,
      interestedSubjects,
      interestedCareerArea,
    };
    const missingField = Object.entries(required).find(([, v]) => v === undefined || v === null || v === '');
    if (missingField) {
      return res.status(400).json({ message: `Field "${missingField[0]}" is required` });
    }

    // Map to the exact feature names the ML pipeline was trained on
    const mlFeatures = {
      'Acedamic percentage in 10th': Number(academic10th),
      'percentage in 12th': Number(academic12th),
      'Logical quotient rating': Number(logicalQuotient),
      hackathons: Number(hackathons),
      'coding skills rating': Number(codingSkills),
      'public speaking points': Number(publicSpeaking),
      'self-learning capability?': selfLearningCapability,
      'Extra-courses did': extraCourses,
      certifications,
      workshops,
      'Interested subjects': interestedSubjects,
      'interested career area': interestedCareerArea,
    };

    const prediction = await predictCareer(mlFeatures);
    const predictedCareer = prediction.bestFit;

    const skillGap = analyzeSkillGap(predictedCareer, confidentSkills, learningSkills);
    const roadmap = generateRoadmap(skillGap.priority, skillGap.moderate);

    const profile = await CareerProfile.create({
      user: req.user._id,
      assessment: {
        academic10th,
        academic12th,
        logicalQuotient,
        hackathons,
        codingSkills,
        publicSpeaking,
        selfLearningCapability,
        extraCourses,
        certifications,
        workshops,
        interestedSubjects,
        interestedCareerArea,
      },
      confidentSkills,
      learningSkills,
      predictedCareer,
      matchScore: prediction.matchScore,
      topRecommendations: prediction.topCareers,
      modelUsed: prediction.modelUsed,
      explanation: prediction.explanation,
      skillGap,
      roadmap,
    });

    await Activity.create({
      user: req.user._id,
      type: 'career_assessment_completed',
      description: `Career assessment completed — predicted "${predictedCareer}"`,
    });

    res.status(201).json({ profile });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/career/history
const getHistory = async (req, res) => {
  try {
    const profiles = await CareerProfile.find({ user: req.user._id })
      .select('predictedCareer matchScore createdAt')
      .sort({ createdAt: -1 });
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/career/:id
const getProfileById = async (req, res) => {
  try {
    const profile = await CareerProfile.findOne({ _id: req.params.id, user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Career profile not found' });
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { submitAssessment, getHistory, getProfileById, getSkillsCatalog };
