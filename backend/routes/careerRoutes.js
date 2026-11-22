const express = require('express');
const { protect } = require('../middleware/auth');
const {
  submitAssessment,
  getHistory,
  getProfileById,
  getSkillsCatalog,
} = require('../controllers/careerController');

const router = express.Router();

router.use(protect);
router.get('/skills-catalog', getSkillsCatalog);
router.post('/assess', submitAssessment);
router.get('/history', getHistory);
router.get('/:id', getProfileById);

module.exports = router;
