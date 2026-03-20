const express = require('express');
const router = express.Router();
const newsPromoController = require('../controllers/newsPromoController');
const { authenticate, requiredOfficer } = require('../middleware/authMiddleware');

router.get('/', newsPromoController.getAllNewsAndPromos);
router.get('/:id', newsPromoController.getNewsPromoById);
router.post('/', authenticate, requiredOfficer, newsPromoController.createNewsPromo);
router.put('/:id', authenticate, requiredOfficer, newsPromoController.updateNewsPromo);
router.delete('/:id', authenticate, requiredOfficer, newsPromoController.deleteNewsPromo);

module.exports = router;
