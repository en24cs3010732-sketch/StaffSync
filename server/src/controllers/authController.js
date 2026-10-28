const User = require('../models/User');
const jwt = require('jsonwebtoken');
const handleError = require('../utils/handleError');
const { getJwtSecret, getJwtExpire } = require('../config/jwt');

const generateToken = (id) => jwt.sign({ id }, getJwtSecret(), { expiresIn: getJwtExpire() });

const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  position: user.position,
  token: generateToken(user._id),
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public. Self-registered users are always 'employee'
//          (the very first user in an empty database becomes 'admin').
const register = async (req, res) => {
  try {
    const { name, email, password, department, position, designation, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const isFirstUser = (await User.countDocuments()) === 0;

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role: isFirstUser ? 'admin' : 'employee',
      department: department || 'General',
      position: position || designation || 'Staff',
      phone: phone || '',
    });

    res.status(201).json(userPayload(user));
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
    if (user && (await user.matchPassword(String(password)))) {
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }
      return res.json(userPayload(user));
    }
    res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { register, login, getMe };
