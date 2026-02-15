const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const Review = require('../models/review.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const ApiError = require('../utils/api-error');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id format');

const createReviewSchema = z.object({
  taskId: objectIdSchema,
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

function toPublicReview(review) {
  return {
    id: String(review._id),
    taskId: String(review.taskId),
    reviewerId: String(review.reviewerId),
    revieweeId: String(review.revieweeId),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

async function updateAggregateRating(userId) {
  const stats = await Review.aggregate([
    { $match: { revieweeId: userId } },
    {
      $group: {
        _id: '$revieweeId',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length === 0) {
    await User.findByIdAndUpdate(userId, { averageRating: 0, ratingCount: 0 });
    return;
  }

  await User.findByIdAndUpdate(userId, {
    averageRating: Number(stats[0].averageRating.toFixed(2)),
    ratingCount: stats[0].ratingCount,
  });
}

router.post(
  '/',
  requireAuth,
  validateBody(createReviewSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.body.taskId).lean();
    if (!task) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    if (task.status !== 'closed') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Reviews are allowed only after task closure');
    }

    const reviewerId = req.auth.userId;
    const requesterId = String(task.requesterId);
    const fulfillerId = task.assignedFulfillerId ? String(task.assignedFulfillerId) : null;

    if (!fulfillerId) {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Task has no assigned fulfiller');
    }

    if (reviewerId !== requesterId && reviewerId !== fulfillerId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only task participants can submit a review');
    }

    const revieweeId = reviewerId === requesterId ? fulfillerId : requesterId;

    const existing = await Review.findOne({ taskId: task._id, reviewerId });

    let review;
    let statusCode;

    if (existing) {
      existing.rating = req.body.rating;
      existing.comment = req.body.comment;
      review = await existing.save();
      statusCode = 200;
    } else {
      review = await Review.create({
        taskId: task._id,
        reviewerId,
        revieweeId,
        rating: req.body.rating,
        comment: req.body.comment,
      });
      statusCode = 201;
    }

    await updateAggregateRating(review.revieweeId);

    res.status(statusCode).json({
      data: {
        review: toPublicReview(review),
      },
    });
  })
);

router.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(userId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', [
        { field: 'userId', message: 'Invalid id format' },
      ]);
    }

    const reviews = await Review.find({ revieweeId: userId }).sort({ createdAt: -1 }).limit(100).lean();

    res.status(200).json({
      data: {
        reviews: reviews.map(toPublicReview),
      },
    });
  })
);

module.exports = router;