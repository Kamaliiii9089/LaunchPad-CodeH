import mongoose from 'mongoose';

const InvestigationSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  assignedTo: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
    userEmail: String,
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: String,
    userEmail: String,
  },
  timeline: [{
    action: String, // e.g., 'status_changed', 'user_assigned', 'note_added'
    description: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  findings: [{
    title: String,
    description: String,
    severity: String,
    addedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      userName: String,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  tags: [String],
  relatedArticles: [{
    articleId: String,
    title: String,
  }],
  resolution: {
    summary: String,
    actions: [String],
    resolvedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      userName: String,
    },
    resolvedAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

InvestigationSchema.index({ status: 1, priority: -1, createdAt: -1 });
InvestigationSchema.index({ 'assignedTo.userId': 1 });

export default mongoose.models.Investigation || mongoose.model('Investigation', InvestigationSchema);
