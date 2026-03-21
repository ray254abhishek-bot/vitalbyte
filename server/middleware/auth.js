const jwt = require('jsonwebtoken');
const { Auth, User } = require('../models');

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vitalbyte_secret');
    const auth = await Auth.findById(decoded.authId);
    if (!auth || !auth.user_active) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(auth.user_id).populate('hospital');
    req.user = user;
    req.auth = auth;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Access denied' });
  next();
};

module.exports = { protect, restrictTo };
