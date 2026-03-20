const mongoose = require('mongoose');

const newsPromoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  type: {
    type: String,
    enum: ['news', 'promotion'],
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  discountPercentage: Number,
  applicableProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NewsPromo', newsPromoSchema);
