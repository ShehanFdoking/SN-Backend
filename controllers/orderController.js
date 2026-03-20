const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const Delivery = require('../models/Delivery');

exports.createOrder = async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod } = req.body;

    // Get cart
    const cart = await Cart.findOne({ userId: req.user.id })
      .populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Check stock availability
    for (let item of cart.items) {
      if (item.productId.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.productId.name}`
        });
      }
    }

    // Create order
    const order = new Order({
      userId: req.user.id,
      items: cart.items.map(item => ({
        productId: item.productId._id,
        productName: item.productId.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity
      })),
      totalAmount: cart.totalPrice,
      deliveryAddress,
      paymentMethod,
      status: 'pending'
    });

    await order.save();

    // Update product quantities
    for (let item of cart.items) {
      await Product.findByIdAndUpdate(
        item.productId._id,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { items: [], totalPrice: 0 }
    );

    // Create notification
    await Notification.create({
      userId: req.user.id,
      type: 'order',
      title: 'Order Created',
      message: `Your order ${order.orderNumber} has been created and is pending confirmation.`,
      relatedOrderId: order._id
    });

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let filter = { userId: req.user.id };

    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
      .populate('items.productId')
      .populate('assignedOfficer', 'firstName lastName email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId')
      .populate('assignedOfficer', 'firstName lastName email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'officer') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow update if order is pending
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order cannot be updated at this stage' });
    }

    // Check authorization
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.deliveryAddress = deliveryAddress || order.deliveryAddress;
    order.paymentMethod = paymentMethod || order.paymentMethod;
    order.updatedAt = Date.now();

    await order.save();

    res.status(200).json({
      message: 'Order updated successfully',
      order
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (order.status !== 'pending' && order.status !== 'accepted') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    // Restore product quantities
    for (let item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: item.quantity } }
      );
    }

    order.status = 'cancelled';
    await order.save();

    // Create notification
    await Notification.create({
      userId: req.user.id,
      type: 'order',
      title: 'Order Cancelled',
      message: `Your order ${order.orderNumber} has been cancelled.`,
      relatedOrderId: order._id
    });

    res.status(200).json({
      message: 'Order cancelled successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .populate('items.productId')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOwner = order.userId.toString() === req.user.id;
    const isPrivileged = req.user.role === 'admin' || req.user.role === 'officer';

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (isOwner && !['pending', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        message: 'You can only delete pending or cancelled orders'
      });
    }

    if (['pending', 'accepted', 'on_delivery'].includes(order.status)) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity }
        });
      }
    }

    await Delivery.deleteMany({ orderId: order._id });
    await Notification.deleteMany({ relatedOrderId: order._id });
    await Order.findByIdAndDelete(order._id);

    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
