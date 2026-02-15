const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const Offer = require('../models/offer.model');
const Task = require('../models/task.model');
const ApiError = require('../utils/api-error');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id format');

const taskIdParamsSchema = z.object({
  taskId: objectIdSchema,
});

const taskOfferParamsSchema = z.object({
  taskId: objectIdSchema,
  offerId: objectIdSchema,
});

const createTaskSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(10).max(2500),
  budgetAmount: z.coerce.number().positive(),
  currency: z.string().trim().length(3).optional().default('INR'),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(5).max(140).optional(),
    description: z.string().trim().min(10).max(2500).optional(),
    budgetAmount: z.coerce.number().positive().optional(),
    currency: z.string().trim().length(3).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const createOfferSchema = z.object({
  amount: z.coerce.number().positive(),
  message: z.string().trim().min(5).max(1200),
});

const adminRequestModificationSchema = z.object({
  note: z.string().trim().min(5).max(500),
});

function toPublicTask(task) {
  return {
    id: String(task._id),
    requesterId: String(task.requesterId),
    assignedFulfillerId: task.assignedFulfillerId ? String(task.assignedFulfillerId) : null,
    acceptedOfferId: task.acceptedOfferId ? String(task.acceptedOfferId) : null,
    title: task.title,
    description: task.description,
    budgetAmount: task.budgetAmount,
    currency: task.currency,
    status: task.status,
    requesterConfirmedOffline: task.requesterConfirmedOffline,
    fulfillerConfirmedOffline: task.fulfillerConfirmedOffline,
    workSubmittedAt: task.workSubmittedAt,
    closedAt: task.closedAt,
    cancelledAt: task.cancelledAt,
    requiresModification: task.requiresModification,
    modificationNote: task.modificationNote,
    modificationRequestedAt: task.modificationRequestedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function toPublicOffer(offer) {
  return {
    id: String(offer._id),
    taskId: String(offer.taskId),
    fulfillerId: String(offer.fulfillerId),
    amount: offer.amount,
    message: offer.message,
    status: offer.status,
    withdrawnAt: offer.withdrawnAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

function ensureTaskExists(task) {
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
}

function ensureRequester(task, requesterId) {
  if (String(task.requesterId) !== requesterId) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the task requester can perform this action');
  }
}

function ensureAssignedFulfiller(task, userId) {
  if (!task.assignedFulfillerId || String(task.assignedFulfillerId) !== userId) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the assigned fulfiller can perform this action');
  }
}

router.post(
  '/',
  requireAuth,
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.create({
      requesterId: req.auth.userId,
      title: req.body.title,
      description: req.body.description,
      budgetAmount: req.body.budgetAmount,
      currency: req.body.currency.toUpperCase(),
    });

    res.status(201).json({
      data: {
        task: toPublicTask(task),
      },
    });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const query = {};

    if (typeof status === 'string' && ['open', 'assigned', 'work_submitted', 'closed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    if (q.length > 0) {
      query.$or = [{ title: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }];
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 }).limit(100).lean();

    res.status(200).json({
      data: {
        tasks: tasks.map(toPublicTask),
      },
    });
  })
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({
      $or: [{ requesterId: req.auth.userId }, { assignedFulfillerId: req.auth.userId }],
    })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    res.status(200).json({
      data: {
        tasks: tasks.map(toPublicTask),
      },
    });
  })
);

router.get(
  '/:taskId',
  validateParams(taskIdParamsSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId).lean();
    ensureTaskExists(task);

    const offers = await Offer.find({ taskId: task._id }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      data: {
        task: toPublicTask(task),
        offers: offers.map(toPublicOffer),
      },
    });
  })
);

router.patch(
  '/:taskId',
  requireAuth,
  validateParams(taskIdParamsSchema),
  validateBody(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId);
    ensureTaskExists(task);
    ensureRequester(task, req.auth.userId);

    if (task.status !== 'open') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Only open tasks can be edited');
    }

    if (req.body.title !== undefined) {
      task.title = req.body.title;
    }
    if (req.body.description !== undefined) {
      task.description = req.body.description;
    }
    if (req.body.budgetAmount !== undefined) {
      task.budgetAmount = req.body.budgetAmount;
    }
    if (req.body.currency !== undefined) {
      task.currency = req.body.currency.toUpperCase();
    }

    task.requiresModification = false;
    task.modificationNote = '';
    task.modificationRequestedAt = null;

    await task.save();

    res.status(200).json({
      data: {
        task: toPublicTask(task),
      },
    });
  })
);

router.post(
  '/:taskId/admin-request-modification',
  requireAuth,
  requireRole(['admin']),
  validateParams(taskIdParamsSchema),
  validateBody(adminRequestModificationSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId);
    ensureTaskExists(task);

    if (task.status !== 'open') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Only open tasks can be sent for modification');
    }

    task.requiresModification = true;
    task.modificationNote = req.body.note;
    task.modificationRequestedAt = new Date();
    await task.save();

    res.status(200).json({
      data: {
        task: toPublicTask(task),
      },
    });
  })
);

router.delete(
  '/:taskId/admin-delete',
  requireAuth,
  requireRole(['admin']),
  validateParams(taskIdParamsSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId);
    ensureTaskExists(task);

    await Offer.deleteMany({ taskId: task._id });

    const conversations = await Conversation.find({ taskId: task._id }).select('_id').lean();
    const conversationIds = conversations.map((conversation) => conversation._id);
    if (conversationIds.length > 0) {
      await Message.deleteMany({ conversationId: { $in: conversationIds } });
      await Conversation.deleteMany({ _id: { $in: conversationIds } });
    }

    await Task.deleteOne({ _id: task._id });

    res.status(200).json({
      data: {
        deleted: true,
        taskId: String(task._id),
      },
    });
  })
);

router.post(
  '/:taskId/cancel',
  requireAuth,
  validateParams(taskIdParamsSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId);
    ensureTaskExists(task);
    ensureRequester(task, req.auth.userId);

    if (task.status !== 'open') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Only open tasks can be cancelled');
    }

    task.status = 'cancelled';
    task.cancelledAt = new Date();
    await task.save();

    await Offer.updateMany({ taskId: task._id, status: 'pending' }, { status: 'rejected' });

    res.status(200).json({
      data: {
        task: toPublicTask(task),
      },
    });
  })
);

router.post(
  '/:taskId/offers',
  requireAuth,
  validateParams(taskIdParamsSchema),
  validateBody(createOfferSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId).lean();
    ensureTaskExists(task);

    if (task.status !== 'open') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Offers can only be submitted for open tasks');
    }

    if (task.requiresModification) {
      throw new ApiError(409, 'TASK_REQUIRES_MODIFICATION', 'Task is pending requester modifications');
    }

    if (String(task.requesterId) === req.auth.userId) {
      throw new ApiError(409, 'INVALID_OFFER', 'Requester cannot submit an offer on own task');
    }

    const offer = await Offer.create({
      taskId: task._id,
      fulfillerId: req.auth.userId,
      amount: req.body.amount,
      message: req.body.message,
    });

    res.status(201).json({
      data: {
        offer: toPublicOffer(offer),
      },
    });
  })
);

router.post(
  '/:taskId/offers/:offerId/withdraw',
  requireAuth,
  validateParams(taskOfferParamsSchema),
  asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.offerId);
    if (!offer || String(offer.taskId) !== req.params.taskId) {
      throw new ApiError(404, 'OFFER_NOT_FOUND', 'Offer not found');
    }

    if (String(offer.fulfillerId) !== req.auth.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the offer owner can withdraw this offer');
    }

    if (offer.status !== 'pending') {
      throw new ApiError(409, 'INVALID_OFFER_STATE', 'Only pending offers can be withdrawn');
    }

    offer.status = 'withdrawn';
    offer.withdrawnAt = new Date();
    await offer.save();

    res.status(200).json({
      data: {
        offer: toPublicOffer(offer),
      },
    });
  })
);

router.post(
  '/:taskId/offers/:offerId/accept',
  requireAuth,
  validateParams(taskOfferParamsSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId);
    ensureTaskExists(task);
    ensureRequester(task, req.auth.userId);

    if (task.status !== 'open') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Only open tasks can accept offers');
    }

    if (task.requiresModification) {
      throw new ApiError(409, 'TASK_REQUIRES_MODIFICATION', 'Task is pending requester modifications');
    }

    const offer = await Offer.findById(req.params.offerId);
    if (!offer || String(offer.taskId) !== req.params.taskId) {
      throw new ApiError(404, 'OFFER_NOT_FOUND', 'Offer not found');
    }

    if (offer.status !== 'pending') {
      throw new ApiError(409, 'INVALID_OFFER_STATE', 'Only pending offers can be accepted');
    }

    await Offer.updateMany(
      { taskId: task._id, status: 'pending', _id: { $ne: offer._id } },
      { status: 'rejected' }
    );

    offer.status = 'accepted';
    await offer.save();

    task.status = 'assigned';
    task.acceptedOfferId = offer._id;
    task.assignedFulfillerId = offer.fulfillerId;
    task.requesterConfirmedOffline = false;
    task.fulfillerConfirmedOffline = false;
    await task.save();

    await Conversation.findOneAndUpdate(
      { taskId: task._id },
      {
        $setOnInsert: {
          taskId: task._id,
          requesterId: task.requesterId,
          fulfillerId: task.assignedFulfillerId,
        },
      },
      { upsert: true }
    );

    res.status(200).json({
      data: {
        task: toPublicTask(task),
        offer: toPublicOffer(offer),
      },
    });
  })
);

router.post(
  '/:taskId/work-submitted',
  requireAuth,
  validateParams(taskIdParamsSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId);
    ensureTaskExists(task);
    ensureAssignedFulfiller(task, req.auth.userId);

    if (task.status !== 'assigned') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Only assigned tasks can be marked as work submitted');
    }

    task.status = 'work_submitted';
    task.workSubmittedAt = new Date();
    await task.save();

    res.status(200).json({
      data: {
        task: toPublicTask(task),
      },
    });
  })
);

router.post(
  '/:taskId/confirm-offline',
  requireAuth,
  validateParams(taskIdParamsSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId);
    ensureTaskExists(task);

    const requesterMatches = String(task.requesterId) === req.auth.userId;
    const fulfillerMatches = task.assignedFulfillerId && String(task.assignedFulfillerId) === req.auth.userId;

    if (!requesterMatches && !fulfillerMatches) {
      throw new ApiError(403, 'FORBIDDEN', 'Only task participants can confirm offline completion/payment');
    }

    if (task.status !== 'work_submitted') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Task must be in work_submitted before confirmations');
    }

    if (requesterMatches) {
      task.requesterConfirmedOffline = true;
    }

    if (fulfillerMatches) {
      task.fulfillerConfirmedOffline = true;
    }

    if (task.requesterConfirmedOffline && task.fulfillerConfirmedOffline) {
      task.status = 'closed';
      task.closedAt = new Date();
    }

    await task.save();

    res.status(200).json({
      data: {
        task: toPublicTask(task),
      },
    });
  })
);

module.exports = router;