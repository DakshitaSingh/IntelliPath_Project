const fs = require('fs');
const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return { text: data.text, pageCount: data.numpages };
};

// Trim long document text down for prompts, keeping it within a safe token budget.
const truncateForPrompt = (text, maxChars = 18000) => {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n...[truncated]';
};

module.exports = { extractTextFromPDF, truncateForPrompt };
