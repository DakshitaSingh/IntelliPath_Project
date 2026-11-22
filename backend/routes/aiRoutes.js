const express = require('express');
const { protect } = require('../middleware/auth');
const {
  generateSummary,
  explainConcept,
  explainWebContent,
  chatWithDocument,
  deleteSummary,
} = require('../controllers/aiController');

const router = express.Router();

router.use(protect);
router.post('/web/explain', explainWebContent);
router.post('/:documentId/summary', generateSummary);
router.delete('/:documentId/summary', deleteSummary);
router.post('/:documentId/explain', explainConcept);
router.post('/:documentId/chat', chatWithDocument);

module.exports = router;
