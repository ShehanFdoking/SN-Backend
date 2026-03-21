const User = require('../models/User');
const OfficerHistory = require('../models/OfficerHistory');
const AdminPromotionRequest = require('../models/AdminPromotionRequest');

exports.createOfficer = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create officer
    user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: 'officer',
      isActive: true
    });

    await user.save();

    res.status(201).json({
      message: 'Officer created successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createAdminPromotionRequest = async (req, res) => {
  try {
    const officer = await User.findById(req.user._id);
    if (!officer) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (officer.role !== 'officer') {
      return res.status(403).json({ message: 'Only officers can request admin access' });
    }

    const existingPending = await AdminPromotionRequest.findOne({
      officerId: officer._id,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({ message: 'You already have a pending admin access request' });
    }

    const request = await AdminPromotionRequest.create({
      officerId: officer._id,
      email: officer.email,
      note: req.body?.note || ''
    });

    res.status(201).json({
      message: 'Admin access request submitted successfully',
      request
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAdminPromotionRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const filter = status === 'all' ? {} : { status };

    const requests = await AdminPromotionRequest.find(filter)
      .populate('officerId', 'firstName lastName email role isActive')
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ requestedAt: -1 });

    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.approveAdminPromotionRequest = async (req, res) => {
  try {
    const request = await AdminPromotionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    const officer = await User.findById(request.officerId);
    if (!officer) {
      request.status = 'rejected';
      request.note = 'Officer account no longer exists';
      request.resolvedAt = Date.now();
      request.resolvedBy = req.user._id;
      await request.save();
      return res.status(404).json({ message: 'Officer account not found. Request rejected.' });
    }

    if (officer.role !== 'officer') {
      request.status = 'rejected';
      request.note = 'Officer role no longer eligible for promotion';
      request.resolvedAt = Date.now();
      request.resolvedBy = req.user._id;
      await request.save();
      return res.status(400).json({ message: 'User is not an officer anymore. Request rejected.' });
    }

    officer.role = 'admin';
    officer.updatedAt = Date.now();
    await officer.save();

    request.status = 'approved';
    request.resolvedAt = Date.now();
    request.resolvedBy = req.user._id;
    await request.save();

    res.status(200).json({
      message: 'Admin promotion request approved',
      user: {
        id: officer._id,
        firstName: officer.firstName,
        lastName: officer.lastName,
        email: officer.email,
        role: officer.role
      },
      request
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rejectAdminPromotionRequest = async (req, res) => {
  try {
    const request = await AdminPromotionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    request.status = 'rejected';
    request.note = req.body?.note || request.note;
    request.resolvedAt = Date.now();
    request.resolvedBy = req.user._id;
    await request.save();

    res.status(200).json({ message: 'Admin promotion request rejected', request });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAllOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: 'officer' })
      .select('-password');

    res.status(200).json(officers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getOfficerById = async (req, res) => {
  try {
    const officer = await User.findOne({ _id: req.params.id, role: 'officer' }).select('-password');

    if (!officer) {
      return res.status(404).json({ message: 'Officer not found' });
    }

    res.status(200).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateOfficer = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, isActive } = req.body;
    const updatePayload = {
      updatedAt: Date.now()
    };

    if (firstName !== undefined) updatePayload.firstName = firstName;
    if (lastName !== undefined) updatePayload.lastName = lastName;
    if (email !== undefined) updatePayload.email = email;
    if (phone !== undefined) updatePayload.phone = phone;
    if (isActive !== undefined) updatePayload.isActive = isActive;

    const officer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'officer' },
      updatePayload,
      { new: true, runValidators: true }
    ).select('-password');

    if (!officer) {
      return res.status(404).json({ message: 'Officer not found' });
    }

    res.status(200).json({
      message: 'Officer updated successfully',
      officer
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteOfficer = async (req, res) => {
  try {
    const officer = await User.findOneAndDelete({ _id: req.params.id, role: 'officer' }).select('-password');

    if (!officer) {
      return res.status(404).json({ message: 'Officer not found' });
    }

    res.status(200).json({
      message: 'Officer deleted successfully',
      officer
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deactivateOfficer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Officer not found' });
    }

    res.status(200).json({
      message: 'Officer deactivated',
      user
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.reactivateOfficer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Officer not found' });
    }

    res.status(200).json({
      message: 'Officer reactivated',
      user
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOfficers = await User.countDocuments({ role: 'officer' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const officers = await User.find({ role: 'officer' })
      .select('firstName lastName email isActive');

    res.status(200).json({
      summary: {
        totalUsers,
        totalOfficers,
        totalAdmins
      },
      officers
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getOfficerActivitySummary = async (req, res) => {
  try {
    const { officerId, startDate, endDate } = req.query;

    let filter = {};
    if (officerId) filter.officerId = officerId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const activities = await OfficerHistory.find(filter)
      .populate('officerId', 'firstName lastName email');

    const summary = {
      totalActivities: activities.length,
      byAction: {
        add: activities.filter(a => a.action === 'add').length,
        edit: activities.filter(a => a.action === 'edit').length,
        delete: activities.filter(a => a.action === 'delete').length,
        view: activities.filter(a => a.action === 'view').length
      },
      byEntityType: {
        product: activities.filter(a => a.entityType === 'product').length,
        news: activities.filter(a => a.entityType === 'news').length,
        promotion: activities.filter(a => a.entityType === 'promotion').length,
        order: activities.filter(a => a.entityType === 'order').length
      }
    };

    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.viewSubmittedPDFs = async (req, res) => {
  try {
    // This would typically list files from a storage service
    // For now, returning a placeholder
    res.status(200).json({
      message: 'PDFs submitted by officers',
      pdfs: []
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
