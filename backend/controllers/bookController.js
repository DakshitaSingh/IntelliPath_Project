const CareerProfile = require('../models/CareerProfile');
const BookInteraction = require('../models/BookInteraction');
const { searchBooks, getSimilarBooks, getTopAuthors } = require('../utils/bookServiceClient');

const getInteractionSets = async (userId) => {
  const interactions = await BookInteraction.find({ user: userId });
  const sets = { viewedIds: new Set(), bookmarkedIds: new Set(), completedIds: new Set() };
  interactions.forEach((i) => {
    if (i.type === 'viewed') sets.viewedIds.add(i.bookId);
    if (i.type === 'bookmarked') sets.bookmarkedIds.add(i.bookId);
    if (i.type === 'completed') sets.completedIds.add(i.bookId);
  });
  return sets;
};

// GET /api/books/recommendations?query=&author=&sortBy=&page=&limit=
//
// `query` is the user's preference input (title/topic keyword search - the
// only rich text field the new dataset actually has). If the user hasn't
// typed anything yet AND they've completed a Career Assessment, their
// predicted career is used as a sensible default query, so the page still
// feels personalized on first load instead of showing a blank search box.
// This is real, already-stored data (profile.predictedCareer) driving a
// real TF-IDF text match - not an invented recommendation.
const getRecommendations = async (req, res) => {
  try {
    const { query = '', author = '', sortBy, page = 1, limit = 12 } = req.query;

    const [profile, interactionSets] = await Promise.all([
      CareerProfile.findOne({ user: req.user._id }).sort({ createdAt: -1 }),
      getInteractionSets(req.user._id),
    ]);

    const effectiveQuery = query.trim() || (profile ? profile.predictedCareer : '');

    const data = await searchBooks({
      query: effectiveQuery,
      author,
      sortBy,
      page: Number(page),
      limit: Number(limit),
      excludeIds: [...interactionSets.completedIds],
    });

    const books = data.books.map((book) => ({
      ...book,
      alreadyViewed: interactionSets.viewedIds.has(book.id),
    }));

    res.json({
      books,
      total: data.total,
      page: data.page,
      limit: data.limit,
      personalized: !query.trim() && !!profile,
      usedQuery: effectiveQuery,
      bookmarkedIds: [...interactionSets.bookmarkedIds],
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/books/filters - real, dataset-derived author list for the filter UI
const getFilters = async (req, res) => {
  try {
    const authors = await getTopAuthors();
    res.json({ authors });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/books/:id/similar
const getSimilar = async (req, res) => {
  try {
    const data = await getSimilarBooks(Number(req.params.id));
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/books/:id/interact  { type: 'viewed' | 'bookmarked' | 'completed' }
const recordInteraction = async (req, res) => {
  try {
    const { type } = req.body;
    if (!['viewed', 'bookmarked', 'completed'].includes(type)) {
      return res.status(400).json({ message: 'type must be one of: viewed, bookmarked, completed' });
    }
    const interaction = await BookInteraction.findOneAndUpdate(
      { user: req.user._id, bookId: Number(req.params.id), type },
      { user: req.user._id, bookId: Number(req.params.id), type },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ interaction });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/books/interactions - user's bookmarked/completed books
// (Each interaction only stores a bookId, so we fetch each book's current
// details from the ML service by similarity-lookup id rather than keeping a
// second copy of book data in Mongo.)
const getMyInteractions = async (req, res) => {
  try {
    const interactions = await BookInteraction.find({ user: req.user._id }).sort({ updatedAt: -1 });
    const enriched = await Promise.all(
      interactions.map(async (i) => {
        try {
          const { book } = await getSimilarBooks(i.bookId, 1);
          return { type: i.type, updatedAt: i.updatedAt, book };
        } catch {
          return null;
        }
      })
    );
    res.json({ interactions: enriched.filter(Boolean) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getRecommendations, getFilters, getSimilar, recordInteraction, getMyInteractions };
