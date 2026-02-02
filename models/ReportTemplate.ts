import mongoose from 'mongoose';

export interface IReportTemplate extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isPublic: boolean;
  sections: {
    id: string;
    title: string;
    type: 'metrics' | 'events' | 'charts' | 'custom';
    enabled: boolean;
    config?: any;
  }[];
  styling?: {
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: number;
    headerLogo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const reportTemplateSchema = new mongoose.Schema<IReportTemplate>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    sections: [
      {
        id: String,
        title: String,
        type: {
          type: String,
          enum: ['metrics', 'events', 'charts', 'custom'],
        },
        enabled: Boolean,
        config: mongoose.Schema.Types.Mixed,
      },
    ],
    styling: {
      primaryColor: String,
      fontFamily: String,
      fontSize: Number,
      headerLogo: String,
    },
  },
  {
    timestamps: true,
  }
);

reportTemplateSchema.index({ userId: 1 });
reportTemplateSchema.index({ isPublic: 1 });

export default mongoose.models.ReportTemplate || 
  mongoose.model<IReportTemplate>('ReportTemplate', reportTemplateSchema);
