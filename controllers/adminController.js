const User = require('../models/User');
const OfficerHistory = require('../models/OfficerHistory');

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

exports.registerAdminFromOfficer = async (req, res) => {
  try {
    const { email, adminPromotionKey } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No officer account found with this email' });
    }

    const requesterRole = req.user?.role;
    const isRequesterAdmin = requesterRole === 'admin';
    const isRequesterOfficer = requesterRole === 'officer';

    if (!isRequesterAdmin && !isRequesterOfficer) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (isRequesterOfficer) {
      const expectedPromotionKey = process.env.ADMIN_PROMOTION_KEY;
      if (!expectedPromotionKey) {
        return res.status(503).json({ message: 'Admin promotion is not configured' });
      }

      if (adminPromotionKey !== expectedPromotionKey) {
        return res.status(403).json({ message: 'Invalid admin registration key' });
      }

      // Officer dashboard flow: only allow promoting the currently authenticated officer.
      const sameUser = String(user._id) === String(req.user._id);
      const sameEmail = user.email?.toLowerCase() === req.user.email?.toLowerCase();

      if (!sameUser || !sameEmail) {
        return res.status(403).json({ message: 'You can only register your own officer account as admin' });
      }
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    if (user.role !== 'officer') {
      return res.status(400).json({ message: 'Only officer accounts can be promoted to admin' });
    }

    user.role = 'admin';
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      message: 'Officer role changed to admin successfully',
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
