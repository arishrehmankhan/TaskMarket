const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const Report = require('../models/report.model');
const ApiError = require('../utils/api-error');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id format');

const createReportSchema = z.object({
  targetType: z.enum(['task', 'user']),
  targetId: objectIdSchema,
  reason: z.string().trim().min(5).max(500),
});

const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolutionNote: z.string().trim().max(500).optional().default(''),
});

function toPublicReport(report) {
  return {
    id: String(report._id),
    reporterId: String(report.reporterId),
    targetType: report.targetType,
    targetId: String(report.targetId),
    reason: report.reason,
    status: report.status,
    resolutionNote: report.resolutionNote,
    resolvedBy: report.resolvedBy ? String(report.resolvedBy) : null,
    resolvedAt: report.resolvedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

router.post(
  '/',
  requireAuth,
  validateBody(createReportSchema),
  asyncHandler(async (req, res) => {
    const report = await Report.create({
      reporterId: req.auth.userId,
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      reason: req.body.reason,
    });

    res.status(201).json({
      data: {
        report: toPublicReport(report),
      },
    });
  })
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const reports = await Report.find({ reporterId: req.auth.userId }).sort({ createdAt: -1 }).limit(100).lean();

    res.status(200).json({
      data: {
        reports: reports.map(toPublicReport),
      },
    });
  })
);

router.get(
  '/',
  requireAuth,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const query = {};

    if (status && ['open', 'resolved', 'dismissed'].includes(status)) {
      query.status = status;
    }

    const reports = await Report.find(query).sort({ createdAt: -1 }).limit(200).lean();

    res.status(200).json({
      data: {
        reports: reports.map(toPublicReport),
      },
    });
  })
);

router.post(
  '/:reportId/resolve',
  requireAuth,
  requireRole(['admin']),
  validateBody(resolveReportSchema),
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(reportId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', [
        { field: 'reportId', message: 'Invalid id format' },
      ]);
    }

    const report = await Report.findById(reportId);
    if (!report) {
      throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report not found');
    }

    if (report.status !== 'open') {
      throw new ApiError(409, 'INVALID_REPORT_STATE', 'Only open reports can be resolved');
    }

    report.status = req.body.status;
    report.resolutionNote = req.body.resolutionNote;
    report.resolvedBy = req.auth.userId;
    report.resolvedAt = new Date();
    await report.save();

    res.status(200).json({
      data: {
        report: toPublicReport(report),
      },
    });
  })
);

module.exports = router;