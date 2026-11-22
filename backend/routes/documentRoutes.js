const express = require('express');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadDocument,
  createWebResource,
  getDocuments,
  getDocumentById,
  deleteDocument,
} = require('../controllers/documentController');

const router = express.Router();

router.use(protect);
router.post('/', upload.single('file'), uploadDocument);
router.post('/web', createWebResource);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.delete('/:id', deleteDocument);

module.exports = router;
