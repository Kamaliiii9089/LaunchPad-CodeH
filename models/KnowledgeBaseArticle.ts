import mongoose from 'mongoose';

const KnowledgeBaseArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['procedures', 'troubleshooting', 'best-practices', 'incident-response', 'threat-intelligence', 'tools'],
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    maxlength: 500,
  },
  tags: [String],
  relatedArticles: [{
    articleId: mongoose.Schema.Types.ObjectId,
    title: String,
    slug: String,
  }],
  threatTypes: [String], // e.g., ['malware', 'phishing', 'ddos']
  steps: [{
    order: Number,
    title: String,
    description: String,
    code: String,
    warning: String,
  }],
  author: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
  },
  lastUpdatedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
  },
  views: {
    type: Number,
    default: 0,
  },
  helpful: {
    type: Number,
    default: 0,
  },
  notHelpful: {
    type: Number,
    default: 0,
  },
  published: {
    type: Boolean,
    default: false,
  },
  featured: {
    type: Boolean,
    default: false,
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

KnowledgeBaseArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });
KnowledgeBaseArticleSchema.index({ category: 1, published: 1, createdAt: -1 });
KnowledgeBaseArticleSchema.index({ threatTypes: 1 });

export default mongoose.models.KnowledgeBaseArticle || mongoose.model('KnowledgeBaseArticle', KnowledgeBaseArticleSchema);
