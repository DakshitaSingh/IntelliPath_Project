const express = require('express');
const { protect } = require('../middleware/auth');
const { generateQuiz, getQuizzes, getQuizById, submitQuiz, getResultById } = require('../controllers/quizController');

const router = express.Router();

router.use(protect);
router.post('/generate', generateQuiz);
router.get('/', getQuizzes);
router.get('/results/:id', getResultById);
router.get('/:id', getQuizById);
router.post('/:id/submit', submitQuiz);

module.exports = router;
