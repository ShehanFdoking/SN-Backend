const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticate, requiredOfficer, requiredUser } = require('../middleware/authMiddleware');

router.post('/accept-order', authenticate, requiredOfficer, deliveryController.acceptOrder);
router.post('/reschedule', authenticate, requiredOfficer, deliveryController.rescheduleDelivery);
router.put('/status/:id', authenticate, requiredOfficer, deliveryController.updateDeliveryStatus);
router.get('/', authenticate, requiredOfficer, deliveryController.getDeliveries);
router.get('/:id', authenticate, requiredOfficer, deliveryController.getDeliveryById);
router.post('/complete/:id', authenticate, requiredOfficer, deliveryController.completeDelivery);
router.delete('/:id', authenticate, requiredOfficer, deliveryController.deleteDelivery);

module.exports = router;
