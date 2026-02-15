const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    fulfillerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1200,
    },
    status: {
      type: String,
      enum: ['pending', 'withdrawn', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

offerSchema.index({ taskId: 1, createdAt: -1 });
offerSchema.index({ taskId: 1, fulfillerId: 1 }, { unique: true });

const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);

module.exports = Offer;