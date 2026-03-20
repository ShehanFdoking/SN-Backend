const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

exports.acceptOrder = async (req, res) => {
  try {
    const { orderId, expectedDeliveryDate } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status
    order.status = 'accepted';
    order.expectedDeliveryDate = expectedDeliveryDate;
    order.assignedOfficer = req.user.id;
    await order.save();

    // Create delivery record
    const delivery = new Delivery({
      orderId,
      officerId: req.user.id,
      userId: order.userId,
      scheduledDate: expectedDeliveryDate,
      status: 'scheduled'
    });

    await delivery.save();

    // Create notification
    await Notification.create({
      userId: order.userId,
      type: 'delivery',
      title: 'Order Accepted',
      message: `Your order ${order.orderNumber} has been accepted. Expected delivery date: ${new Date(expectedDeliveryDate).toDateString()}`,
      relatedOrderId: orderId
    });

    res.status(200).json({
      message: 'Order accepted',
      order,
      delivery
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rescheduleDelivery = async (req, res) => {
  try {
    const { orderId, newDeliveryDate, message_en, message_si, message_ta } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update expected delivery date
    order.expectedDeliveryDate = newDeliveryDate;
    
    // Add delivery update with multilingual message
    order.deliveryUpdates.push({
      message: message_en,
      date: Date.now(),
      language: 'en'
    });

    await order.save();

    // Update delivery record
    const delivery = await Delivery.findOne({ orderId });
    if (delivery) {
      delivery.status = 'rescheduled';
      delivery.scheduledDate = newDeliveryDate;
      delivery.rescheduleMessage = {
        english: message_en,
        sinhala: message_si,
        tamil: message_ta
      };
      await delivery.save();
    }

    // Create notifications in all languages
    const notificationMessages = {
      en: `${message_en}. New delivery date: ${new Date(newDeliveryDate).toDateString()}`,
      si: `${message_si}. නව ඩෙලිවරි දිනය: ${new Date(newDeliveryDate).toDateString()}`,
      ta: `${message_ta}. புதிய டெலிவரி நDate: ${new Date(newDeliveryDate).toDateString()}`
    };

    await Notification.create({
      userId: order.userId,
      type: 'delivery',
      title: 'Delivery Rescheduled',
      message: notificationMessages.en,
      relatedOrderId: orderId
    });

    res.status(200).json({
      message: 'Delivery rescheduled',
      messages: notificationMessages
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId, status, location, notes } = req.body;

    const delivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      {
        status,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Add tracking update
    delivery.trackingUpdates.push({
      status,
      location,
      notes
    });

    await delivery.save();

    // Update order status
    const order = await Order.findById(delivery.orderId);
    if (order) {
      order.status = status === 'delivered' ? 'completed' : 'on_delivery';
      if (status === 'delivered') {
        order.actualDeliveryDate = Date.now();
      }
      await order.save();
    }

    // Notify user
    const statusMessages = {
      'in_transit': 'Your order is on the way!',
      'delivered': 'Your order has been delivered!',
      'failed': 'Delivery attempt failed. Please contact support.'
    };

    if (statusMessages[status]) {
      await Notification.create({
        userId: delivery.userId,
        type: 'delivery',
        title: 'Delivery Update',
        message: statusMessages[status],
        relatedOrderId: delivery.orderId
      });
    }

    res.status(200).json({
      message: 'Delivery status updated',
      delivery
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let filter = { officerId: req.user.id };

    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const deliveries = await Delivery.find(filter)
      .populate('orderId')
      .populate('userId', 'firstName lastName phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Delivery.countDocuments(filter);

    res.status(200).json({
      deliveries,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.completeDelivery = async (req, res) => {
  try {
    const { deliveryId, signature, photo } = req.body;

    const delivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      {
        status: 'delivered',
        actualDeliveryDate: Date.now(),
        proof: {
          signature,
          photo,
          timestamp: Date.now()
        }
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Update order
    const order = await Order.findByIdAndUpdate(
      delivery.orderId,
      {
        status: 'completed',
        actualDeliveryDate: Date.now()
      }
    );

    res.status(200).json({
      message: 'Delivery completed',
      delivery
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('orderId')
      .populate('userId', 'firstName lastName phone')
      .populate('officerId', 'firstName lastName email');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    const isOwnerOfficer = delivery.officerId?._id?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnerOfficer && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json(delivery);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    const isOwnerOfficer = delivery.officerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnerOfficer && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (delivery.status === 'delivered') {
      return res.status(400).json({ message: 'Delivered records cannot be deleted' });
    }

    await Delivery.findByIdAndDelete(req.params.id);

    await Order.findByIdAndUpdate(delivery.orderId, {
      status: 'pending',
      assignedOfficer: null,
      expectedDeliveryDate: null,
      updatedAt: Date.now()
    });

    res.status(200).json({ message: 'Delivery deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
