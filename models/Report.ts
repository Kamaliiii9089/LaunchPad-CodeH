import mongoose from 'mongoose';

export interface IReport extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'pdf' | 'csv' | 'json';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  data?: any;
  filePath?: string;
  templateId?: string;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm format
    lastRun?: Date;
    nextRun?: Date;
  };
  filters?: {
    dateRange?: {
      start: Date;
      end: Date;
    };
    severity?: string[];
    eventTypes?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new mongoose.Schema<IReport>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ['pdf', 'csv', 'json'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    filePath: {
      type: String,
    },
    templateId: {
      type: String,
    },
    schedule: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
      },
      time: {
        type: String,
      },
      lastRun: {
        type: Date,
      },
      nextRun: {
        type: Date,
      },
    },
    filters: {
      dateRange: {
        start: Date,
        end: Date,
      },
      severity: [String],
      eventTypes: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });

export default mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);
