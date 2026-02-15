const bcrypt = require('bcryptjs');
const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const User = require('../models/user.model');
const ApiError = require('../utils/api-error');
const asyncHandler = require('../utils/async-handler');
const { signAuthToken } = require('../utils/jwt');

const router = express.Router();

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

function toPublicUser(user) {
  const role = user.role === 'admin' ? 'admin' : 'user';
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role,
    averageRating: user.averageRating,
    ratingCount: user.ratingCount,
  };
}

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email }).lean();
    if (existing) {
      throw new ApiError(409, 'EMAIL_ALREADY_IN_USE', 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({
      fullName: req.body.fullName,
      email: req.body.email,
      passwordHash,
      role: 'user',
    });

    const token = signAuthToken(user);

    res.status(201).json({
      data: {
        token,
        user: toPublicUser(user),
      },
    });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!isValidPassword) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const token = signAuthToken(user);

    res.status(200).json({
      data: {
        token,
        user: toPublicUser(user),
      },
    });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    res.status(200).json({
      data: {
        user: toPublicUser(user),
      },
    });
  })
);

module.exports = router;