const express = require('express');
const { status, register, remove, login } = require('../controllers/faceController');
const { protect } = require('../middleware/auth');
const { faceRateLimit } = require('../middleware/faceRateLimit');

const router = express.Router();

router.get('/status', protect, status);
router.post('/register', protect, register);
router.delete('/', protect, remove);
router.post('/login', faceRateLimit, login);

module.exports = router;