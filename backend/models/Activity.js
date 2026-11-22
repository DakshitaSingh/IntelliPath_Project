const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'document_upload',
        'quiz_completed',
        'flashcards_generated',
        'summary_generated',
        'chat_used',
        'career_assessment_completed',
      ],
      required: true,
    },
    description: { type: String, required: true },
    relatedDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
