const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate, requiredUser } = require('../middleware/authMiddleware');

router.get('/', authenticate, requiredUser, cartController.getCart);
router.post('/add', authenticate, requiredUser, cartController.addToCart);
router.post('/remove', authenticate, requiredUser, cartController.removeFromCart);
router.post('/update-quantity', authenticate, requiredUser, cartController.updateCartItemQuantity);
router.post('/clear', authenticate, requiredUser, cartController.clearCart);

module.exports = router;
