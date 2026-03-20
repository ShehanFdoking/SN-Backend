const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, requiredUser, authorize } = require('../middleware/authMiddleware');

router.post('/', authenticate, authorize('admin', 'officer'), notificationController.createNotification);
router.get('/', authenticate, requiredUser, notificationController.getMyNotifications);
router.get('/:id', authenticate, requiredUser, notificationController.getNotificationById);
router.put('/:id/read', authenticate, requiredUser, notificationController.markAsRead);
router.post('/mark-all-read', authenticate, requiredUser, notificationController.markAllAsRead);
router.delete('/:id', authenticate, requiredUser, notificationController.deleteNotification);

module.exports = router;
