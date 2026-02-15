const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const Task = require('../models/task.model');
const ApiError = require('../utils/api-error');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id format');

const taskIdParamsSchema = z.object({
  taskId: objectIdSchema,
});

const conversationIdParamsSchema = z.object({
  conversationId: objectIdSchema,
});

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

function isTaskParticipant(task, userId) {
  const requesterMatches = String(task.requesterId) === userId;
  const fulfillerMatches =
    task.assignedFulfillerId && String(task.assignedFulfillerId) === userId;
  return requesterMatches || fulfillerMatches;
}

function toPublicConversation(conversation) {
  return {
    id: String(conversation._id),
    taskId: String(conversation.taskId),
    requesterId: String(conversation.requesterId),
    fulfillerId: String(conversation.fulfillerId),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function toPublicMessage(message) {
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderId: String(message.senderId),
    body: message.body,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

router.post(
  '/tasks/:taskId/conversation',
  requireAuth,
  validateParams(taskIdParamsSchema),
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.taskId).lean();
    if (!task) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    if (task.status !== 'assigned' && task.status !== 'work_submitted' && task.status !== 'closed') {
      throw new ApiError(409, 'INVALID_TASK_STATE', 'Conversation is only available for matched tasks');
    }

    if (!isTaskParticipant(task, req.auth.userId)) {
      throw new ApiError(403, 'FORBIDDEN', 'Only task participants can access this conversation');
    }

    const conversation = await Conversation.findOneAndUpdate(
      { taskId: task._id },
      {
        $setOnInsert: {
          taskId: task._id,
          requesterId: task.requesterId,
          fulfillerId: task.assignedFulfillerId,
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      data: {
        conversation: toPublicConversation(conversation),
      },
    });
  })
);

router.get(
  '/conversations/:conversationId/messages',
  requireAuth,
  validateParams(conversationIdParamsSchema),
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.conversationId).lean();
    if (!conversation) {
      throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    }

    const isParticipant =
      String(conversation.requesterId) === req.auth.userId ||
      String(conversation.fulfillerId) === req.auth.userId;

    if (!isParticipant) {
      throw new ApiError(403, 'FORBIDDEN', 'Only participants can read conversation messages');
    }

    const after = typeof req.query.after === 'string' ? req.query.after : null;
    const query = { conversationId: conversation._id };

    if (after && /^[a-f\d]{24}$/i.test(after)) {
      query._id = { $gt: after };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 }).limit(200).lean();

    res.status(200).json({
      data: {
        conversation: toPublicConversation(conversation),
        messages: messages.map(toPublicMessage),
      },
    });
  })
);

router.post(
  '/conversations/:conversationId/messages',
  requireAuth,
  validateParams(conversationIdParamsSchema),
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.conversationId).lean();
    if (!conversation) {
      throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    }

    const isParticipant =
      String(conversation.requesterId) === req.auth.userId ||
      String(conversation.fulfillerId) === req.auth.userId;

    if (!isParticipant) {
      throw new ApiError(403, 'FORBIDDEN', 'Only participants can send conversation messages');
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.auth.userId,
      body: req.body.body,
    });

    res.status(201).json({
      data: {
        message: toPublicMessage(message),
      },
    });
  })
);

module.exports = router;