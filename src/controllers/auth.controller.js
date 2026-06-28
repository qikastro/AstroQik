import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201: { description: User registered successfully }
 *       409: { description: Email already exists }
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email and password are required', 400);
    }
    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters', 400);
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return errorResponse(res, 'Email already registered', 409);

    const user  = await User.create({ name, email, password });
    const token = signToken(user._id);

    return successResponse(res, { user, token }, 'Account created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return errorResponse(res, 'Email and password are required', 400);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return errorResponse(res, 'Invalid credentials', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return errorResponse(res, 'Invalid credentials', 401);

    const token = signToken(user._id);
    // Strip password from response
    const userData = user.toJSON();

    return successResponse(res, { user: userData, token }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User data }
 *       401: { description: Unauthorized }
 */
export const getMe = async (req, res) => {
  return successResponse(res, req.user, 'User fetched');
};

/**
 * @swagger
 * /api/auth/update-profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { ...(name && { name }), ...(avatar && { avatar }) },
      { new: true, runValidators: true }
    );
    return successResponse(res, updated, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current password and new password are required', 400);
    }
    if (newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return errorResponse(res, 'Current password is incorrect', 400);

    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};
