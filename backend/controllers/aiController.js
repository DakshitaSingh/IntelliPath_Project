const Document = require('../models/Document');
const Activity = require('../models/Activity');
const { generateText } = require('../utils/gemini');
const { truncateForPrompt } = require('../utils/pdfParser');

const getDoc = async (id, userId) => {
  const doc = await Document.findOne({ _id: id, user: userId });
  if (!doc) throw Object.assign(new Error('Document not found'), { status: 404 });
  return doc;
};

// POST /api/ai/:documentId/summary
const generateSummary = async (req, res) => {
  try {
    const doc = await getDoc(req.params.documentId, req.user._id);
    const context = truncateForPrompt(doc.extractedText);

    const prompt = `You are a helpful study assistant. Summarize the following document for a student studying for it.

Format your response as clean, well-structured Markdown:
- Start with a one- or two-sentence overview of what the document covers.
- Break the rest into logical sections using ## headings that reflect the document's own topics (don't just write generic labels like "Section 1").
- Use bullet points for lists of related facts, steps, or comparisons.
- Use **bold** only on the specific term or number being defined, not whole sentences.
- Use short code spans (\`like this\`) for code identifiers, syntax, or keywords.
- Keep paragraphs short (2-4 sentences).
- Do not repeat the same point in multiple sections.

DOCUMENT:\n${context}`;
    const summary = await generateText(prompt);

    doc.summary = summary;
    await doc.save();

    await Activity.create({
      user: req.user._id,
      type: 'summary_generated',
      description: `Generated summary for "${doc.title}"`,
      relatedDocument: doc._id,
    });

    res.json({ summary });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/ai/:documentId/explain  { topic }
const explainConcept = async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ message: 'topic is required' });

    const doc = await getDoc(req.params.documentId, req.user._id);
    const context = truncateForPrompt(doc.extractedText);

    const prompt = `You are a patient tutor explaining a concept to a student learning it for the first time. Using ONLY the context from the document below, explain the concept "${topic}".

Format your response as clean, well-structured Markdown with these sections, using ## headings:
## What it is
A plain-language definition, 1-3 sentences.
## Why it matters
A short paragraph on when/why you'd use it.
## Analogy
One simple real-world analogy.
## Example
A short concrete example (use a \`\`\`code block\`\`\` if the topic is code-related).

If the topic is not covered in the document, say so plainly at the top, then give your best general explanation in the same structure.

DOCUMENT:\n${context}`;
    const explanation = await generateText(prompt);

    res.json({ explanation });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/ai/:documentId/chat  { message, history }
const chatWithDocument = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ message: 'message is required' });

    const doc = await getDoc(req.params.documentId, req.user._id);
    const context = truncateForPrompt(doc.extractedText);

    const historyText = history
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`)
      .join('\n');

    const prompt = `You are an AI study assistant answering questions about a specific document. Only use information from the document context below to answer; if the answer isn't in the document, say you couldn't find it there and answer briefly from general knowledge. Format your answer in Markdown - use bullet points for lists and short code spans for code terms - but keep it conversational and only as long as the question needs.\n\nDOCUMENT CONTEXT:\n${context}\n\nCONVERSATION SO FAR:\n${historyText}\n\nStudent: ${message}\nAssistant:`;
    const reply = await generateText(prompt);

    await Activity.create({
      user: req.user._id,
      type: 'chat_used',
      description: `Asked a question about "${doc.title}"`,
      relatedDocument: doc._id,
    });

    res.json({ reply });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// DELETE /api/ai/:documentId/summary
const deleteSummary = async (req, res) => {
  try {
    const doc = await getDoc(req.params.documentId, req.user._id);
    doc.summary = '';
    await doc.save();
    res.json({ message: 'Summary deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/ai/web/explain { content, topic }
const explainWebContent = async (req, res) => {
  try {
    const { content, topic = '' } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'content is required' });
    }
    if (content.length > 50000) return res.status(413).json({ message: 'Content is too long' });

    const focus = String(topic || '').trim() || 'the selected content';
    const context = truncateForPrompt(content.trim());
    const prompt = `You are a patient tutor helping a student understand selected web content.

Explain the selected content clearly and accurately. Focus on "${focus}".

Format your response as clean Markdown:
## What it means
A plain-language explanation.
## Key ideas
Use concise bullet points.
## Example
Give a simple concrete example when useful.
## Quick takeaway
End with 1-2 sentences the student can remember.

SELECTED WEB CONTENT:
${context}`;
    const explanation = await generateText(prompt);
    res.json({ explanation });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = {
  generateSummary,
  explainConcept,
  explainWebContent,
  chatWithDocument,
  deleteSummary,
};