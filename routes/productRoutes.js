const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize, requiredOfficer } = require('../middleware/authMiddleware');

router.get('/', productController.getAllProducts);
router.get('/categories', productController.getProductCategories);
router.get('/:id', productController.getProductById);
router.post('/:id/rate', authenticate, productController.rateProduct);
router.post('/', authenticate, requiredOfficer, productController.createProduct);
router.put('/:id', authenticate, requiredOfficer, productController.updateProduct);
router.delete('/:id', authenticate, requiredOfficer, productController.deleteProduct);

module.exports = router;
