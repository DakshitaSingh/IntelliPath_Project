const mongoose = require('mongoose');

const flashcardSetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    title: { type: String, required: true },
    cardCount: { type: Number, default: 0 },
    reviewedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);
