const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/:id', authenticate, userController.getUserProfile);
router.put('/profile/update', authenticate, userController.updateUserProfile);
router.get('/', authenticate, authorize('admin', 'officer'), userController.getAllUsers);
router.post('/change-password', authenticate, userController.changePassword);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

module.exports = router;
