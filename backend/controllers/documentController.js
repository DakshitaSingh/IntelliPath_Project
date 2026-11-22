const fs = require('fs');
const crypto = require('crypto');
const Document = require('../models/Document');
const Activity = require('../models/Activity');
const { extractTextFromPDF } = require('../utils/pdfParser');

const normalizeUrl = (value) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
};

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'PDF file is required' });
    const { title } = req.body;
    const { text, pageCount } = await extractTextFromPDF(req.file.path);

    const doc = await Document.create({
      user: req.user._id,
      title: title || req.file.originalname,
      type: 'PDF',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      extractedText: text,
      pageCount,
    });

    await Activity.create({
      user: req.user._id,
      type: 'document_upload',
      description: `Uploaded document "${doc.title}"`,
      relatedDocument: doc._id,
    });

    const { extractedText, ...safeDoc } = doc.toObject();
    res.status(201).json({ document: safeDoc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createWebResource = async (req, res) => {
  try {
    const { title, content, sourceUrl } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Selected content is required' });
    }
    if (content.length > 50000) {
      return res.status(413).json({ message: 'Selected content is too long (maximum 50,000 characters)' });
    }

    const url = normalizeUrl(sourceUrl);
    if (!url) return res.status(400).json({ message: 'A valid http(s) source URL is required' });

    const sourceDomain = new URL(url).hostname.replace(/^www\./, '');
    const cleanContent = content.trim();
    const contentHash = crypto.createHash('sha256').update(cleanContent).digest('hex');

    const existing = await Document.findOne({
      user: req.user._id,
      type: 'WEB',
      sourceUrl: url,
      contentHash,
    });

    if (existing) {
      return res.status(200).json({ document: existing, duplicate: true });
    }

    const doc = await Document.create({
      user: req.user._id,
      title: String(title || sourceDomain || 'Web Resource').trim().slice(0, 200),
      type: 'WEB',
      fileName: '',
      filePath: '',
      fileSize: Buffer.byteLength(cleanContent, 'utf8'),
      extractedText: cleanContent,
      sourceUrl: url,
      sourceDomain,
      contentHash,
    });

    await Activity.create({
      user: req.user._id,
      type: 'document_upload',
      description: `Saved web resource "${doc.title}" from ${sourceDomain}`,
      relatedDocument: doc._id,
    });

    res.status(201).json({ document: doc, duplicate: false });
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await Document.findOne({
        user: req.user._id,
        type: 'WEB',
        sourceUrl: req.body.sourceUrl,
      }).sort({ createdAt: -1 });
      if (existing) return res.status(200).json({ document: existing, duplicate: true });
    }
    res.status(500).json({ message: err.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user._id })
      .select('-extractedText')
      .sort({ createdAt: -1 });
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.type !== 'WEB' && doc.filePath && fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  uploadDocument,
  createWebResource,
  getDocuments,
  getDocumentById,
  deleteDocument,
};
