const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  actualDeliveryDate: Date,
  status: {
    type: String,
    enum: ['scheduled', 'in_transit', 'delivered', 'failed', 'rescheduled'],
    default: 'scheduled'
  },
  deviationReason: String,
  rescheduleMessage: {
    messageTemplate: String,
    customMessage: String,
    languages: {
      english: String,
      sinhala: String,
      tamil: String
    }
  },
  trackingUpdates: [
    {
      status: String,
      location: String,
      timestamp: { type: Date, default: Date.now },
      notes: String
    }
  ],
  proof: {
    signature: String,
    photo: String,
    timestamp: Date
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

module.exports = mongoose.model('Delivery', deliverySchema);
