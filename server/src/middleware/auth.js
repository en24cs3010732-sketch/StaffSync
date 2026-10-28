const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  let user;
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Not authorized, user not found or inactive' });
  }

  req.user = user;
  next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `User role '${req.user ? req.user.role : 'unknown'}' is not authorized to access this route`,
    });
  }
  next();
};

module.exports = { protect, authorize };
