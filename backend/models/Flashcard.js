const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    isFavorite: { type: Boolean, default: false },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Flashcard', flashcardSchema);
