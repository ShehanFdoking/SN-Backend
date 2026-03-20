const Product = require('../models/Product');
const OfficerHistory = require('../models/OfficerHistory');

exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    let filter = { isActive: true };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName');

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, quantity, category, image } = req.body;

    if (!req.user) return res.status(401).json({ message: 'User object missing' });

    const product = new Product({
      name: name?.toString() || 'Unnamed',
      description: description?.toString() || '',
      price: Number(price) || 0,
      quantity: Number(quantity) || 0,
      category: category || 'General',
      image,
      createdBy: req.user._id
    });

    await product.save();

    return res.status(201).json({
      message: 'Product created successfully!',
      product
    });
  } catch (err) {
    console.error('CRITICAL BACKEND ERROR:', err);
    return res.status(500).json({ 
      message: 'Critical error at product creation catch', 
      error: err.message 
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, quantity, category, image } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        quantity,
        category,
        image,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Log to officer history
    await OfficerHistory.create({
      officerId: req.user.id,
      action: 'edit',
      entityType: 'product',
      entityId: product._id,
      entityDetails: {
        name: product.name,
        changes: { name, description, price, quantity }
      }
    });

    res.status(200).json({
      message: 'Product updated successfully',
      product
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Log to officer history
    await OfficerHistory.create({
      officerId: req.user.id,
      action: 'delete',
      entityType: 'product',
      entityId: product._id,
      entityDetails: {
        name: product.name
      }
    });

    res.status(200).json({
      message: 'Product deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getProductCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rateProduct = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviewIndex = product.reviews.findIndex(
      (review) => review.userId?.toString() === req.user.id
    );

    if (reviewIndex > -1) {
      product.reviews[reviewIndex].rating = numericRating;
      if (comment !== undefined) {
        product.reviews[reviewIndex].comment = comment;
      }
      product.reviews[reviewIndex].createdAt = Date.now();
    } else {
      product.reviews.push({
        userId: req.user.id,
        rating: numericRating,
        comment: comment || ''
      });
    }

    const ratingTotal = product.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    product.rating = product.reviews.length ? Number((ratingTotal / product.reviews.length).toFixed(1)) : 0;
    product.updatedAt = Date.now();

    await product.save();

    return res.status(200).json({
      message: reviewIndex > -1 ? 'Rating updated successfully' : 'Rating submitted successfully',
      rating: product.rating,
      reviewsCount: product.reviews.length,
      myRating: numericRating
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
