const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getRecommendations,
  getFilters,
  getSimilar,
  recordInteraction,
  getMyInteractions,
} = require('../controllers/bookController');

const router = express.Router();

router.use(protect);
router.get('/recommendations', getRecommendations);
router.get('/filters', getFilters);
router.get('/interactions', getMyInteractions);
router.get('/:id/similar', getSimilar);
router.post('/:id/interact', recordInteraction);

module.exports = router;
