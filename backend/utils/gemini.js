const { GoogleGenAI } = require('@google/genai');

// gemini-flash-latest hot-swaps to whichever release Google just shipped -
// which can be a preview/experimental build with much tighter rate limits.
// gemini-2.5-flash was also deprecated for new users. Pin to current named
// stable models instead, with a stable fallback if the primary is overloaded.
const MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

let client = null;
const getClient = () => {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in .env');
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini returns 503/UNAVAILABLE when the model is briefly overloaded.
// These are transient - retrying after a short backoff usually succeeds.
const isTransient = (err) => {
  const status = err?.status || err?.code;
  const message = String(err?.message || '');
  return status === 503 || status === 429 || /UNAVAILABLE|overloaded|RESOURCE_EXHAUSTED/i.test(message);
};

const callModel = async (model, prompt, retries) => {
  const ai = getClient();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return response.text;
    } catch (err) {
      if (!isTransient(err) || attempt === retries) throw err;
      await sleep(500 * 2 ** attempt); // 500ms, 1s, 2s
    }
  }
};

// Generic prompt -> text. Retries the primary model a few times, then
// falls back to a second stable model if the primary is still overloaded.
const generateText = async (prompt) => {
  try {
    return await callModel(MODEL, prompt, 2);
  } catch (err) {
    if (!isTransient(err)) throw err;
    try {
      return await callModel(FALLBACK_MODEL, prompt, 2);
    } catch (fallbackErr) {
      if (isTransient(fallbackErr)) {
        throw Object.assign(new Error('The AI model is temporarily overloaded. Please try again in a few seconds.'), { status: 503 });
      }
      throw fallbackErr;
    }
  }
};

// Prompt that must return raw JSON (array/object). Strips markdown fences defensively.
const generateJSON = async (prompt) => {
  const raw = await generateText(prompt);
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to salvage the first {...} or [...] block
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI did not return valid JSON: ' + e.message);
  }
};

module.exports = { generateText, generateJSON };