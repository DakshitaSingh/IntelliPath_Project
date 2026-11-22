const Document = require('../models/Document');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Activity = require('../models/Activity');
const { generateJSON } = require('../utils/gemini');
const { truncateForPrompt } = require('../utils/pdfParser');

// POST /api/quizzes/generate { documentId, count }
const generateQuiz = async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body;
    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const context = truncateForPrompt(doc.extractedText);
    const n = Math.min(Math.max(parseInt(count, 10) || 5, 3), 20);

    const prompt = `Based on the document below, create exactly ${n} multiple-choice quiz questions. Each question must have exactly 4 options with only one correct answer. Return ONLY raw JSON, no markdown, no commentary, in this exact format:
[{"question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..."}]

DOCUMENT:
${context}`;

    const questions = await generateJSON(prompt);
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(502).json({ message: 'AI failed to generate quiz questions' });
    }

    const quiz = await Quiz.create({
      user: req.user._id,
      document: doc._id,
      title: `${doc.title} - Quiz`,
      questions,
    });

    res.status(201).json({ quiz });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ user: req.user._id })
      .select('title createdAt document questions')
      .populate('document', 'title')
      .sort({ createdAt: -1 });
    const shaped = quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      createdAt: q.createdAt,
      document: q.document,
      questionCount: q.questions.length,
    }));
    res.json({ quizzes: shaped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Returns quiz WITHOUT correct answers, for taking the quiz
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const safeQuestions = quiz.questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
    }));
    res.json({ quiz: { _id: quiz._id, title: quiz.title, questions: safeQuestions } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/quizzes/:id/submit { answers: [{questionId, selectedIndex}] }
const submitQuiz = async (req, res) => {
  try {
    const { answers = [] } = req.body;
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    let score = 0;
    const gradedAnswers = quiz.questions.map((q) => {
      const submitted = answers.find((a) => a.questionId === String(q._id));
      const selectedIndex = submitted ? submitted.selectedIndex : -1;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) score += 1;
      return { questionId: q._id, selectedIndex, correctIndex: q.correctIndex, isCorrect };
    });

    const result = await QuizResult.create({
      user: req.user._id,
      quiz: quiz._id,
      score,
      total: quiz.questions.length,
      answers: gradedAnswers,
    });

    await Activity.create({
      user: req.user._id,
      type: 'quiz_completed',
      description: `Scored ${score}/${quiz.questions.length} on "${quiz.title}"`,
      relatedDocument: quiz.document,
    });

    // Return full detail including explanations for the results page
    const detailed = quiz.questions.map((q) => {
      const g = gradedAnswers.find((a) => String(a.questionId) === String(q._id));
      return {
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        selectedIndex: g ? g.selectedIndex : -1,
        isCorrect: g ? g.isCorrect : false,
      };
    });

    res.status(201).json({ resultId: result._id, score, total: quiz.questions.length, questions: detailed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getResultById = async (req, res) => {
  try {
    const result = await QuizResult.findOne({ _id: req.params.id, user: req.user._id }).populate('quiz');
    if (!result) return res.status(404).json({ message: 'Result not found' });
    const detailed = result.quiz.questions.map((q) => {
      const a = result.answers.find((x) => String(x.questionId) === String(q._id));
      return {
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        selectedIndex: a ? a.selectedIndex : -1,
        isCorrect: a ? a.isCorrect : false,
      };
    });
    res.json({ score: result.score, total: result.total, title: result.quiz.title, questions: detailed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { generateQuiz, getQuizzes, getQuizById, submitQuiz, getResultById };
