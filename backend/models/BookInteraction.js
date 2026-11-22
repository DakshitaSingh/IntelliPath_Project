const mongoose = require('mongoose');

// No existing model in this project tracks interactions with external
// learning resources (Document/FlashcardSet/QuizResult are all specific to
// uploaded PDFs, not applicable here), so this is a new, minimal model
// rather than a duplicate of anything already present.
const bookInteractionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: Number, required: true }, // matches book_id in the dataset/catalog
    type: { type: String, enum: ['viewed', 'bookmarked', 'completed'], required: true },
  },
  { timestamps: true }
);

// One row per (user, book, interaction type) - repeat interactions just bump `updatedAt`.
bookInteractionSchema.index({ user: 1, bookId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('BookInteraction', bookInteractionSchema);
