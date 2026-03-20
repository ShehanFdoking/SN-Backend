const NewsPromo = require('../models/NewsPromo');
const OfficerHistory = require('../models/OfficerHistory');

exports.getAllNewsAndPromos = async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    let filter = { isActive: true };

    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const newsPromos = await NewsPromo.find(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('applicableProducts', 'name price')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await NewsPromo.countDocuments(filter);

    res.status(200).json({
      newsPromos,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getNewsPromoById = async (req, res) => {
  try {
    const newsPromo = await NewsPromo.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('applicableProducts', 'name price image');

    if (!newsPromo) {
      return res.status(404).json({ message: 'News/Promo not found' });
    }

    res.status(200).json(newsPromo);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createNewsPromo = async (req, res) => {
  try {
    const {
      title,
      content,
      image,
      type,
      startDate,
      endDate,
      discountPercentage,
      applicableProducts
    } = req.body;

    const newsPromo = new NewsPromo({
      title,
      content,
      image,
      type,
      startDate,
      endDate,
      discountPercentage,
      applicableProducts,
      createdBy: req.user.id
    });

    await newsPromo.save();
    await newsPromo.populate('applicableProducts', 'name price');

    // Log to officer history
    await OfficerHistory.create({
      officerId: req.user.id,
      action: 'add',
      entityType: type,
      entityId: newsPromo._id,
      entityDetails: {
        name: newsPromo.title
      }
    });

    res.status(201).json({
      message: 'News/Promo created successfully',
      newsPromo
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateNewsPromo = async (req, res) => {
  try {
    const {
      title,
      content,
      image,
      startDate,
      endDate,
      discountPercentage,
      applicableProducts
    } = req.body;

    const newsPromo = await NewsPromo.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        image,
        startDate,
        endDate,
        discountPercentage,
        applicableProducts,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('applicableProducts', 'name price');

    if (!newsPromo) {
      return res.status(404).json({ message: 'News/Promo not found' });
    }

    // Log to officer history
    await OfficerHistory.create({
      officerId: req.user.id,
      action: 'edit',
      entityType: newsPromo.type,
      entityId: newsPromo._id,
      entityDetails: {
        name: newsPromo.title,
        changes: { title, content }
      }
    });

    res.status(200).json({
      message: 'News/Promo updated successfully',
      newsPromo
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteNewsPromo = async (req, res) => {
  try {
    const newsPromo = await NewsPromo.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!newsPromo) {
      return res.status(404).json({ message: 'News/Promo not found' });
    }

    // Log to officer history
    await OfficerHistory.create({
      officerId: req.user.id,
      action: 'delete',
      entityType: newsPromo.type,
      entityId: newsPromo._id,
      entityDetails: {
        name: newsPromo.title
      }
    });

    res.status(200).json({
      message: 'News/Promo deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
