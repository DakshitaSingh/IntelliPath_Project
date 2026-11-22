const Document = require('../models/Document');
const FlashcardSet = require('../models/FlashcardSet');
const Flashcard = require('../models/Flashcard');
const Activity = require('../models/Activity');
const { generateJSON } = require('../utils/gemini');
const { truncateForPrompt } = require('../utils/pdfParser');

// POST /api/flashcards/generate  { documentId, count }
const generateFlashcards = async (req, res) => {
  try {
    const { documentId, count = 10 } = req.body;
    const doc = await Document.findOne({ _id: documentId, user: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const context = truncateForPrompt(doc.extractedText);
    const n = Math.min(Math.max(parseInt(count, 10) || 10, 3), 30);

    const prompt = `Based on the document below, create exactly ${n} flashcards for studying. Return ONLY a raw JSON array, no markdown, no commentary, in this exact format:
[{"question": "...", "answer": "..."}]

DOCUMENT:
${context}`;

    const cards = await generateJSON(prompt);
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(502).json({ message: 'AI failed to generate flashcards' });
    }

    const set = await FlashcardSet.create({
      user: req.user._id,
      document: doc._id,
      title: `${doc.title} - Flashcards`,
      cardCount: cards.length,
    });

    const docs = cards.map((c) => ({
      set: set._id,
      user: req.user._id,
      question: c.question,
      answer: c.answer,
    }));
    await Flashcard.insertMany(docs);

    await Activity.create({
      user: req.user._id,
      type: 'flashcards_generated',
      description: `Generated ${cards.length} flashcards for "${doc.title}"`,
      relatedDocument: doc._id,
    });

    res.status(201).json({ set });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFlashcardSets = async (req, res) => {
  try {
    const sets = await FlashcardSet.find({ user: req.user._id }).populate('document', 'title').sort({ createdAt: -1 });
    res.json({ sets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFlashcardsBySet = async (req, res) => {
  try {
    const set = await FlashcardSet.findOne({ _id: req.params.setId, user: req.user._id });
    if (!set) return res.status(404).json({ message: 'Flashcard set not found' });
    const cards = await Flashcard.find({ set: set._id }).sort({ createdAt: 1 });
    res.json({ set, cards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const card = await Flashcard.findOne({ _id: req.params.cardId, user: req.user._id });
    if (!card) return res.status(404).json({ message: 'Flashcard not found' });
    card.isFavorite = !card.isFavorite;
    await card.save();
    res.json({ card });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markReviewed = async (req, res) => {
  try {
    const card = await Flashcard.findOne({ _id: req.params.cardId, user: req.user._id });
    if (!card) return res.status(404).json({ message: 'Flashcard not found' });
    card.reviewed = true;
    await card.save();
    const set = await FlashcardSet.findById(card.set);
    if (set) {
      const reviewedCount = await Flashcard.countDocuments({ set: set._id, reviewed: true });
      set.reviewedCount = reviewedCount;
      await set.save();
    }
    res.json({ card });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const cards = await Flashcard.find({ user: req.user._id, isFavorite: true }).populate('set', 'title');
    res.json({ cards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteSet = async (req, res) => {
  try {
    const set = await FlashcardSet.findOne({ _id: req.params.setId, user: req.user._id });
    if (!set) return res.status(404).json({ message: 'Flashcard set not found' });
    await Flashcard.deleteMany({ set: set._id });
    await set.deleteOne();
    res.json({ message: 'Flashcard set deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  generateFlashcards,
  getFlashcardSets,
  getFlashcardsBySet,
  toggleFavorite,
  markReviewed,
  getFavorites,
  deleteSet,
};
