const mongoose = require('mongoose');

const adminPromotionRequestSchema = new mongoose.Schema({
  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  note: {
    type: String,
    trim: true,
    default: ''
  }
});

adminPromotionRequestSchema.index(
  { officerId: 1, status: 1 },
  { partialFilterExpression: { status: 'pending' }, unique: true }
);

module.exports = mongoose.model('AdminPromotionRequest', adminPromotionRequestSchema);
