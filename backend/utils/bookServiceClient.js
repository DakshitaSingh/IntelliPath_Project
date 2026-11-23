/**
 * Thin client for the book endpoints on the Python ML service
 * (ml-service/app.py: POST /books/search, GET /books/<id>/similar,
 * GET /books/top-authors).
 *
 * Unlike the old 500-book catalog, the merged_dataset.csv catalog has
 * ~25k books, so this no longer fetches-and-caches the full catalog in
 * Node and re-scores it in JS on every request. Instead the ranking
 * (TF-IDF relevance + popularity) happens once, in Python, over the
 * precomputed sparse matrix, and only the already-ranked page of results
 * crosses the network. `top-authors` (small, static-ish) is still cached
 * briefly since it changes only on retrain.
 */
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://intellipath-project-1.onrender.com';
const TOP_AUTHORS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let _topAuthorsCache = { authors: null, fetchedAt: 0 };

const request = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${ML_SERVICE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    throw Object.assign(
      new Error(
        `Could not reach the ML service at ${ML_SERVICE_URL}${path}. Make sure it is running ` +
          `(cd ml-service && python app.py). Original error: ${err.message}`
      ),
      { status: 503 }
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'ML service request failed'), {
      status: response.status,
    });
  }
  return data;
};

const searchBooks = (params) =>
  request('/books/search', { method: 'POST', body: JSON.stringify(params) });

const getSimilarBooks = (bookId, n = 5) => request(`/books/${bookId}/similar?n=${n}`);

const getTopAuthors = async () => {
  const isFresh = _topAuthorsCache.authors && Date.now() - _topAuthorsCache.fetchedAt < TOP_AUTHORS_CACHE_TTL_MS;
  if (isFresh) return _topAuthorsCache.authors;

  const data = await request('/books/top-authors');
  _topAuthorsCache = { authors: data.authors, fetchedAt: Date.now() };
  return _topAuthorsCache.authors;
};

module.exports = { searchBooks, getSimilarBooks, getTopAuthors, ML_SERVICE_URL };
