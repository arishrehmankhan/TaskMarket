const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedFulfillerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    acceptedOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2500,
    },
    budgetAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'work_submitted', 'closed', 'cancelled'],
      default: 'open',
      index: true,
    },
    requesterConfirmedOffline: {
      type: Boolean,
      default: false,
    },
    fulfillerConfirmedOffline: {
      type: Boolean,
      default: false,
    },
    workSubmittedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    requiresModification: {
      type: Boolean,
      default: false,
      index: true,
    },
    modificationNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    modificationRequestedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ requesterId: 1, createdAt: -1 });
taskSchema.index({ assignedFulfillerId: 1, createdAt: -1 });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

module.exports = Task;