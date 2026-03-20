const mongoose = require('mongoose');

const officerHistorySchema = new mongoose.Schema({
  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['add', 'edit', 'delete', 'view'],
    required: true
  },
  entityType: {
    type: String,
    enum: ['product', 'news', 'promotion', 'order'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  entityDetails: {
    name: String,
    description: String,
    changes: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('OfficerHistory', officerHistorySchema);
