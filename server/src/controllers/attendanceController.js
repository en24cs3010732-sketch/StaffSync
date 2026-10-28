const handleError = require('../utils/handleError');
const Attendance = require('../models/Attendance');

// @desc    Clock in
// @route   POST /api/attendance/clock-in
// @access  Private
const clockIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    let attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today }
    });

    if (attendance && attendance.clockIn) {
      return res.status(400).json({ message: 'Already clocked in today' });
    }

    const now = new Date();
    // Check if late (e.g. after 9:30 AM)
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
    const status = isLate ? 'late' : 'present';

    if (attendance) {
      attendance.clockIn = now;
      attendance.status = status;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        user: req.user._id,
        date: today,
        clockIn: now,
        status: status
      });
    }

    const populated = await Attendance.findById(attendance._id).populate('user', 'name email department');
    res.status(201).json(populated);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Clock out
// @route   POST /api/attendance/clock-out
// @access  Private
const clockOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today }
    });

    if (!attendance || !attendance.clockIn) {
      return res.status(400).json({ message: 'You have not clocked in today' });
    }

    if (attendance.clockOut) {
      return res.status(400).json({ message: 'Already clocked out today' });
    }

    const now = new Date();
    attendance.clockOut = now;

    // Calculate total hours
    const diffMs = now - new Date(attendance.clockIn);
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    attendance.totalHours = totalHours;

    await attendance.save();

    const populated = await Attendance.findById(attendance._id).populate('user', 'name email department');
    res.json(populated);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get attendance history (Employee sees own, Admin/Manager sees all or query by user/date)
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    let query = {};

    if (req.user.role === 'employee') {
      query.user = req.user._id;
    } else if (userId) {
      query.user = userId;
    }

    if (startDate && endDate) {
      const from = new Date(startDate);
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999); // include the whole end day
      if (isNaN(from) || isNaN(to)) {
        return res.status(400).json({ message: 'Invalid date range' });
      }
      query.date = { $gte: from, $lte: to };
    }

    const records = await Attendance.find(query)
      .populate('user', 'name email department position')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendance
};
