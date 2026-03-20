const OfficerHistory = require('../models/OfficerHistory');
const PDFDocument = require('pdfkit');

exports.getOfficerHistory = async (req, res) => {
  try {
    const { officerId, startDate, endDate, action, page = 1, limit = 20 } = req.query;

    let filter = {};

    if (officerId) filter.officerId = officerId;
    if (action) filter.action = action;

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

    // If current user is officer, show only their history
    if (req.user.role === 'officer') {
      filter.officerId = req.user.id;
    }

    const skip = (page - 1) * limit;
    const history = await OfficerHistory.find(filter)
      .populate('officerId', 'firstName lastName email')
      .populate('entityId')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ timestamp: -1 });

    const total = await OfficerHistory.countDocuments(filter);

    res.status(200).json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getDailyHistory = async (req, res) => {
  try {
    const { date, officerId } = req.query;

    let filter = {};

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    filter.timestamp = {
      $gte: startOfDay,
      $lte: endOfDay
    };

    if (officerId) filter.officerId = officerId;
    if (req.user.role === 'officer') {
      filter.officerId = req.user.id;
    }

    const history = await OfficerHistory.find(filter)
      .populate('officerId', 'firstName lastName email')
      .populate('entityId')
      .sort({ timestamp: 1 });

    res.status(200).json({
      date,
      totalActions: history.length,
      history
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.generateHistoryPDF = async (req, res) => {
  try {
    const { date, officerId } = req.query;

    let filter = {};

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.timestamp = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    if (officerId) {
      filter.officerId = officerId;
    } else if (req.user.role === 'officer') {
      filter.officerId = req.user.id;
    }

    const history = await OfficerHistory.find(filter)
      .populate('officerId', 'firstName lastName email')
      .sort({ timestamp: 1 });

    const safeDate = date || 'all';
    const filename = `history_${safeDate}_${Date.now()}.pdf`;
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Daily Activity Report', { underline: true });
    doc.fontSize(12).text(`Date: ${date || 'All Time'}`, { margin: 10 });
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    // Summary
    const actions = {
      add: 0,
      edit: 0,
      delete: 0,
      view: 0
    };

    history.forEach(item => {
      actions[item.action]++;
    });

    doc.fontSize(12).text('Summary:', { underline: true });
    doc.text(`Total Actions: ${history.length}`);
    doc.text(`Added: ${actions.add}`);
    doc.text(`Edited: ${actions.edit}`);
    doc.text(`Deleted: ${actions.delete}`);
    doc.moveDown();

    // Details
    doc.fontSize(12).text('Activity Details:', { underline: true });
    doc.moveDown(0.5);

    history.forEach((item, index) => {
      doc.fontSize(10).text(`${index + 1}. ${item.action.toUpperCase()} - ${item.entityType.toUpperCase()}`);
      const officerName = item.officerId
        ? `${item.officerId.firstName} ${item.officerId.lastName} (${item.officerId.email})`
        : 'Unknown officer';
      doc.fontSize(9).text(`Officer: ${officerName}`);
      doc.text(`Time: ${new Date(item.timestamp).toLocaleString()}`);
      doc.text(`Entity: ${item.entityDetails?.name || 'N/A'}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
