const Document = require('../models/Document');
const FlashcardSet = require('../models/FlashcardSet');
const Quiz = require('../models/Quiz');
const Activity = require('../models/Activity');

const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const [totalDocuments, totalFlashcardSets, totalQuizzes, recentActivity] = await Promise.all([
      Document.countDocuments({ user: userId }),
      FlashcardSet.countDocuments({ user: userId }),
      Quiz.countDocuments({ user: userId }),
      Activity.find({ user: userId }).sort({ createdAt: -1 }).limit(6),
    ]);

    // "Total Flashcards" in the UI reflects total flashcard sets created (kept in sync with card counts)
    const cardCountAgg = await FlashcardSet.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$cardCount' } } },
    ]);
    const totalFlashcards = cardCountAgg[0]?.total || 0;

    res.json({
      stats: {
        totalDocuments,
        totalFlashcards,
        totalQuizzes,
      },
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboard };
