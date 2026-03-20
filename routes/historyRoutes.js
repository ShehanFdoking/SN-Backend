const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticate, requiredOfficer, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, requiredOfficer, historyController.getOfficerHistory);
router.get('/daily', authenticate, requiredOfficer, historyController.getDailyHistory);
router.get('/pdf', authenticate, requiredOfficer, historyController.generateHistoryPDF);

module.exports = router;
