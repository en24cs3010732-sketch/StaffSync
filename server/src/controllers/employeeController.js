const mongoose = require('mongoose');
const handleError = require('../utils/handleError');
const User = require('../models/User');

// @desc    Get all employees / directory
// @route   GET /api/employees
// @access  Private
const getEmployees = async (req, res) => {
  try {
    const { department, role, search, includeInactive } = req.query;
    let query = {};

    // Deactivated ("deleted") employees are hidden unless explicitly requested
    if (includeInactive !== 'true') query.isActive = true;

    if (department) query.department = department;
    if (role) query.role = role;
    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { position: { $regex: safe, $options: 'i' } }
      ];
    }

    const employees = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get single employee by ID
// @route   GET /api/employees/:id
// @access  Private
const getEmployeeById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    const employee = await User.findById(req.params.id).select('-password');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (Admin / Manager)
const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role, department, position, designation, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Please provide name and email' });
    }

    // Only admins may create managers/admins
    if (role && role !== 'employee' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create managers or admins' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    const employee = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: password || 'TempPassword123!',
      role: role || 'employee',
      department: department || 'General',
      position: position || designation || 'Staff',
      phone: phone || ''
    });

    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      phone: employee.phone
    });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (Admin, Manager, or Self)
const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check authorization: Admin/Manager can update anyone, employee can only update self (limited fields)
    if (req.user.role === 'employee' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to update other employees' });
    }

    const { name, department, position, designation, phone, avatar, isActive, role } = req.body;
    const isPrivileged = req.user.role === 'admin' || req.user.role === 'manager';

    if (name) employee.name = name;
    if (phone !== undefined) employee.phone = phone;
    if (avatar !== undefined) employee.avatar = avatar;

    // Department / position: admin or manager only
    if (isPrivileged) {
      if (department) employee.department = department;
      if (position || designation) employee.position = position || designation;

      // Don't let someone deactivate themselves
      if (isActive !== undefined && req.user._id.toString() !== req.params.id) {
        employee.isActive = isActive;
      }
    }

    // Role changes: admin only (prevents managers promoting themselves/others to admin)
    if (role && role !== employee.role) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can change roles' });
      }
      if (req.user._id.toString() === req.params.id) {
        return res.status(400).json({ message: 'You cannot change your own role' });
      }
      employee.role = role;
    }

    const updatedEmployee = await employee.save();
    const result = updatedEmployee.toObject();
    delete result.password;

    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Delete / Deactivate employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    employee.isActive = false;
    await employee.save();

    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
