const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/async-handler');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const echoSchema = z.object({
  message: z.string().trim().min(1).max(300),
});

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      data: {
        status: 'ok',
      },
    });
  })
);

router.post(
  '/system/echo',
  validateBody(echoSchema),
  asyncHandler(async (req, res) => {
    res.status(200).json({
      data: {
        message: req.body.message,
      },
    });
  })
);

module.exports = router;
