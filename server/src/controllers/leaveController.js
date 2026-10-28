const handleError = require('../utils/handleError');
const LeaveRequest = require('../models/LeaveRequest');

// @desc    Submit leave request
// @route   POST /api/leaves
// @access  Private
const submitLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Please provide start date, end date, and reason' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Invalid start or end date' });
    }
    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    const leaveRequest = await LeaveRequest.create({
      user: req.user._id,
      leaveType: leaveType || 'annual',
      startDate,
      endDate,
      reason,
      status: 'pending'
    });

    const populatedLeave = await LeaveRequest.findById(leaveRequest._id).populate('user', 'name email department');
    res.status(201).json(populatedLeave);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get leave requests (User sees own, Manager/Admin sees all)
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      query.user = req.user._id;
    }

    const leaves = await LeaveRequest.find(query)
      .populate('user', 'name email department position')
      .populate('approver', 'name email')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Approve or reject leave request
// @route   PUT /api/leaves/:id/status
// @access  Private (Admin / Manager)
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, comments } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: `This request was already ${leaveRequest.status}` });
    }

    leaveRequest.status = status;
    leaveRequest.approver = req.user._id;
    if (comments) leaveRequest.comments = comments;

    await leaveRequest.save();

    const updatedLeave = await LeaveRequest.findById(leaveRequest._id)
      .populate('user', 'name email department')
      .populate('approver', 'name email');

    res.json(updatedLeave);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  submitLeaveRequest,
  getLeaves,
  updateLeaveStatus
};
