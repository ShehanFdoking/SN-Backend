const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize, requiredUser, requiredOfficer } = require('../middleware/authMiddleware');

router.post('/', authenticate, requiredUser, orderController.createOrder);
router.get('/my-orders', authenticate, requiredUser, orderController.getMyOrders);
router.get('/:id', authenticate, orderController.getOrderById);
router.put('/:id', authenticate, requiredUser, orderController.updateOrder);
router.post('/:id/cancel', authenticate, requiredUser, orderController.cancelOrder);
router.delete('/:id', authenticate, orderController.deleteOrder);
router.get('/', authenticate, requiredOfficer, orderController.getAllOrders);

module.exports = router;
