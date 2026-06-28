import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { errorResponse } from '../utils/helpers.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return errorResponse(res, 'User not found', 401);
    if (!user.isActive) return errorResponse(res, 'Account is deactivated', 403);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return errorResponse(res, 'Token expired. Please log in again.', 401);
    if (err.name === 'JsonWebTokenError')  return errorResponse(res, 'Invalid token.', 401);
    next(err);
  }
};

export const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return errorResponse(res, 'You do not have permission to perform this action', 403);
  }
  next();
};
