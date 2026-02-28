import mongoose from 'mongoose';

const EventCommentSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
    userEmail: String,
  }],
  attachments: [{
    filename: String,
    url: String,
    type: String,
  }],
  isInternal: {
    type: Boolean,
    default: false, // true for internal notes only visible to team
  },
  edited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
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

EventCommentSchema.index({ eventId: 1, createdAt: -1 });
EventCommentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.EventComment || mongoose.model('EventComment', EventCommentSchema);
