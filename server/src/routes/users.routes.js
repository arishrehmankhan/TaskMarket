const express = require('express');
const User = require('../models/user.model');
const ApiError = require('../utils/api-error');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

function toPublicUser(user) {
  const role = user.role === 'admin' ? 'admin' : 'user';
  return {
    id: String(user._id),
    fullName: user.fullName,
    role,
    averageRating: user.averageRating,
    ratingCount: user.ratingCount,
    createdAt: user.createdAt,
  };
}

router.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(userId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', [
        { field: 'userId', message: 'Invalid id format' },
      ]);
    }

    const user = await User.findById(userId).lean();
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