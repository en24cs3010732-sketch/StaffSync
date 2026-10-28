const handleError = require('../utils/handleError');
const Announcement = require('../models/Announcement');

// @desc    Publish announcement
// @route   POST /api/announcements
// @access  Private (Admin / Manager)
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetDepartment, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Please provide title and content' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      author: req.user._id,
      targetDepartment: targetDepartment || 'All',
      priority: priority || 'medium'
    });

    const populated = await Announcement.findById(announcement._id).populate('author', 'name email role');
    res.status(201).json(populated);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({})
      .populate('author', 'name email role department')
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements
};
