const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requiredAdmin, requiredOfficer } = require('../middleware/authMiddleware');

router.post('/officers', authenticate, requiredAdmin, adminController.createOfficer);
router.post('/officers/register-admin', authenticate, requiredOfficer, adminController.registerAdminFromOfficer);
router.get('/officers', authenticate, requiredAdmin, adminController.getAllOfficers);
router.get('/officers/:id', authenticate, requiredAdmin, adminController.getOfficerById);
router.put('/officers/:id', authenticate, requiredAdmin, adminController.updateOfficer);
router.put('/officers/:id/deactivate', authenticate, requiredAdmin, adminController.deactivateOfficer);
router.put('/officers/:id/reactivate', authenticate, requiredAdmin, adminController.reactivateOfficer);
router.delete('/officers/:id', authenticate, requiredAdmin, adminController.deleteOfficer);
router.get('/dashboard', authenticate, requiredAdmin, adminController.getAdminDashboard);
router.get('/activity-summary', authenticate, requiredAdmin, adminController.getOfficerActivitySummary);
router.get('/pdfs', authenticate, requiredAdmin, adminController.viewSubmittedPDFs);

module.exports = router;
