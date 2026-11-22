const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['PDF', 'WEB'], default: 'PDF', index: true },
    fileName: { type: String, default: '' },
    filePath: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    extractedText: { type: String, default: '' },
    summary: { type: String, default: '' },
    pageCount: { type: Number, default: 0 },
    sourceUrl: { type: String, default: '' },
    sourceDomain: { type: String, default: '' },
    contentHash: { type: String, default: '' },
  },
  { timestamps: true }
);

documentSchema.index(
  { user: 1, sourceUrl: 1, contentHash: 1 },
  { unique: true, partialFilterExpression: { type: 'WEB' } }
);

module.exports = mongoose.model('Document', documentSchema);
