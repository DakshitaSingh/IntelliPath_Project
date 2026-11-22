const express = require('express');
const { protect } = require('../middleware/auth');
const {
  generateFlashcards,
  getFlashcardSets,
  getFlashcardsBySet,
  toggleFavorite,
  markReviewed,
  getFavorites,
  deleteSet,
} = require('../controllers/flashcardController');

const router = express.Router();

router.use(protect);
router.post('/generate', generateFlashcards);
router.get('/sets', getFlashcardSets);
router.get('/favorites', getFavorites);
router.get('/sets/:setId', getFlashcardsBySet);
router.delete('/sets/:setId', deleteSet);
router.patch('/:cardId/favorite', toggleFavorite);
router.patch('/:cardId/reviewed', markReviewed);

module.exports = router;
