# Collaboration Features Specification

## Overview
This document outlines collaboration features to enable team-based security monitoring and investigation workflows in BreachBuddy.

---

## Feature 1: Comments on Events

### Issue Title
**Add commenting system for security events**

### Description
Enable team members to add comments and discussions on individual security events for better collaboration and context sharing.

### User Story
As a security analyst, I want to add comments to security events so that I can share insights, context, and investigation findings with my team members.

### Requirements

#### Functional Requirements
- Users can add comments to any security event
- Comments display timestamp and author information
- Comments support markdown formatting
- Users can edit their own comments within 15 minutes of posting
- Users can delete their own comments
- Comments are sorted chronologically (newest first)
- Comment count badge on events with comments
- Real-time comment notifications

#### Technical Requirements

**Database Schema (New Model)**
```typescript
// models/Comment.ts
interface Comment {
  _id: ObjectId;
  eventId: string;
  userId: ObjectId;
  userEmail: string;
  userName: string;
  content: string;
  mentions: string[]; // Array of mentioned user IDs
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  isEdited: boolean;
  isDeleted: boolean;
}
```

**API Endpoints**
- `POST /api/comments` - Create new comment
- `GET /api/comments/:eventId` - Get comments for an event
- `PUT /api/comments/:commentId` - Edit comment
- `DELETE /api/comments/:commentId` - Delete comment
- `GET /api/comments/count/:eventId` - Get comment count

**UI Components**
- CommentBox component for input
- CommentList component for display
- CommentItem component for individual comments
- Markdown preview toggle

### Acceptance Criteria
- [ ] Users can add comments to security events
- [ ] Comments display with author name, timestamp, and content
- [ ] Users can edit their own comments (with "edited" indicator)
- [ ] Users can delete their own comments
- [ ] Comment count is visible on event cards
- [ ] Markdown formatting works correctly
- [ ] Comments persist across page refreshes

### Priority
High

### Estimated Effort
3-4 days

---

## Feature 2: @Mentions for Team Members

### Issue Title
**Implement @mention functionality for team collaboration**

### Description
Allow users to mention team members in comments using @username syntax to notify them and draw their attention to specific events or discussions.

### User Story
As a security analyst, I want to @mention specific team members in comments so that they receive notifications and can provide their expertise on critical issues.

### Requirements

#### Functional Requirements
- Users can type @username to mention team members
- Autocomplete dropdown appears when typing @
- Mentioned users receive in-app notifications
- Mentioned users receive email notifications (optional setting)
- Mentions are highlighted in comments
- Users can click on mentions to view user profiles
- Mention suggestions filtered by team membership

#### Technical Requirements

**Database Schema Updates**
```typescript
// models/User.ts - Add notification preferences
interface User {
  // ... existing fields
  notificationPreferences: {
    emailOnMention: boolean;
    inAppOnMention: boolean;
  };
}

// models/Notification.ts - New model
interface Notification {
  _id: ObjectId;
  userId: ObjectId;
  type: 'mention' | 'comment' | 'investigation';
  relatedEventId?: string;
  relatedCommentId?: ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
```

**API Endpoints**
- `GET /api/users/search?q=username` - Search users for mentions
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all as read

**UI Components**
- MentionAutocomplete component
- NotificationBell component
- NotificationDropdown component
- UserProfileCard component

### Acceptance Criteria
- [ ] Typing @ triggers autocomplete dropdown
- [ ] Autocomplete shows team members matching the typed text
- [ ] Selected mentions are highlighted in comments
- [ ] Mentioned users receive notifications
- [ ] Notification bell shows unread count
- [ ] Clicking notification navigates to relevant event/comment
- [ ] Users can configure mention notification preferences

### Priority
High

### Estimated Effort
4-5 days

---

## Feature 3: Shared Investigations

### Issue Title
**Enable shared investigation workflows for security events**

### Description
Create a collaborative investigation feature that allows team members to work together on analyzing and resolving security threats.

### User Story
As a security team lead, I want to create shared investigations where multiple team members can collaborate on analyzing threats, so that we can resolve complex security issues more efficiently.

### Requirements

#### Functional Requirements
- Create investigation from one or multiple security events
- Assign team members to investigations
- Investigation states: Draft, Active, On Hold, Resolved, Closed
- Investigation dashboard with all active investigations
- Timeline view of all activities in an investigation
- Attach evidence/files to investigations
- Export investigation reports
- Investigation templates for common threat types
- Investigation ownership and permissions (creator/assigned members)

#### Technical Requirements

**Database Schema (New Model)**
```typescript
// models/Investigation.ts
interface Investigation {
  _id: ObjectId;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'on_hold' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdBy: ObjectId;
  assignedTo: ObjectId[];
  eventIds: string[];
  timeline: {
    action: string;
    userId: ObjectId;
    userName: string;
    timestamp: Date;
    details: string;
  }[];
  attachments: {
    fileName: string;
    fileUrl: string;
    uploadedBy: ObjectId;
    uploadedAt: Date;
  }[];
  findings: string;
  resolution: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

// models/InvestigationTemplate.ts
interface InvestigationTemplate {
  _id: ObjectId;
  name: string;
  description: string;
  threatType: string;
  checklist: string[];
  defaultAssignees?: ObjectId[];
  createdBy: ObjectId;
}
```

**API Endpoints**
- `POST /api/investigations` - Create investigation
- `GET /api/investigations` - List investigations
- `GET /api/investigations/:id` - Get investigation details
- `PUT /api/investigations/:id` - Update investigation
- `DELETE /api/investigations/:id` - Delete investigation
- `POST /api/investigations/:id/assign` - Assign team member
- `POST /api/investigations/:id/timeline` - Add timeline entry
- `POST /api/investigations/:id/attachments` - Upload attachment
- `GET /api/investigation-templates` - Get templates
- `POST /api/investigations/:id/export` - Export investigation report

**UI Components**
- InvestigationList component
- InvestigationDetail component
- InvestigationTimeline component
- InvestigationForm component
- InvestigationCard component
- AssignMemberModal component
- AttachmentUploader component
- TemplateSelector component

### Acceptance Criteria
- [ ] Users can create investigations from security events
- [ ] Users can assign team members to investigations
- [ ] Investigation status can be updated through workflow
- [ ] Timeline automatically tracks all activities
- [ ] Team members can add attachments
- [ ] Investigation reports can be exported as PDF
- [ ] Templates streamline investigation creation
- [ ] Only assigned members can modify investigations
- [ ] Dashboard shows all active investigations with filters

### Priority
High

### Estimated Effort
7-10 days

---

## Feature 4: Internal Notes and Annotations

### Issue Title
**Add internal notes and annotations system**

### Description
Enable security analysts to add private notes and annotations to events, investigations, and system elements that are only visible to team members with appropriate permissions.

### User Story
As a security analyst, I want to add private notes and annotations so that I can document my thought process, observations, and sensitive information that shouldn't be visible in public comments.

### Requirements

#### Functional Requirements
- Add private notes to security events
- Add private notes to investigations
- Notes visible only to team members (role-based)
- Pin important notes to top
- Tag notes with categories (observation, hypothesis, evidence, action-item)
- Search and filter notes
- Note templates for common scenarios
- Color-coded notes by type
- Note history and version tracking
- Rich text formatting support

#### Technical Requirements

**Database Schema (New Model)**
```typescript
// models/Note.ts
interface Note {
  _id: ObjectId;
  relatedTo: {
    type: 'event' | 'investigation' | 'user' | 'device';
    id: string;
  };
  authorId: ObjectId;
  authorName: string;
  title?: string;
  content: string;
  category: 'observation' | 'hypothesis' | 'evidence' | 'action-item' | 'general';
  tags: string[];
  isPinned: boolean;
  visibility: 'team' | 'assigned-only' | 'private';
  color: string;
  version: number;
  history: {
    content: string;
    editedAt: Date;
    editedBy: ObjectId;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// models/NoteTemplate.ts
interface NoteTemplate {
  _id: ObjectId;
  name: string;
  category: string;
  content: string;
  createdBy: ObjectId;
}
```

**API Endpoints**
- `POST /api/notes` - Create note
- `GET /api/notes?relatedTo=:type&id=:id` - Get notes for entity
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `PUT /api/notes/:id/pin` - Toggle pin status
- `GET /api/notes/search?q=query` - Search notes
- `GET /api/note-templates` - Get note templates
- `POST /api/note-templates` - Create note template

**UI Components**
- NotesPanel component
- NoteEditor component (rich text)
- NoteCard component
- NoteCategoryFilter component
- NoteSearchBar component
- NoteTemplateSelector component
- PinnedNotes component

### Acceptance Criteria
- [ ] Users can add notes to events and investigations
- [ ] Notes support rich text formatting
- [ ] Notes can be categorized and tagged
- [ ] Important notes can be pinned
- [ ] Notes are searchable and filterable
- [ ] Note templates speed up common note types
- [ ] Note history tracks all edits
- [ ] Visibility controls ensure proper access
- [ ] Color coding helps visual organization

### Priority
Medium

### Estimated Effort
5-6 days

---

## Feature 5: Knowledge Base Integration

### Issue Title
**Integrate knowledge base for threat intelligence and documentation**

### Description
Create an integrated knowledge base system that allows teams to document threat patterns, response procedures, and build institutional knowledge over time.

### User Story
As a security team, we want to maintain a knowledge base of threat patterns, mitigation strategies, and best practices so that we can reference past experiences and continuously improve our security response.

### Requirements

#### Functional Requirements
- Create knowledge base articles
- Categorize articles by threat type, severity, and topic
- Link articles to security events and investigations
- Version control for articles
- Article search with full-text indexing
- Article approval workflow (draft → review → published)
- Article metrics (views, helpfulness ratings)
- Related articles suggestions
- Export articles as PDF/Markdown
- Article permissions (public, team, restricted)
- Templates for common article types (runbooks, postmortems, procedures)

#### Technical Requirements

**Database Schema (New Model)**
```typescript
// models/KnowledgeArticle.ts
interface KnowledgeArticle {
  _id: ObjectId;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: 'threat-intel' | 'procedure' | 'postmortem' | 'reference' | 'tutorial';
  tags: string[];
  threatTypes: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'review' | 'published' | 'archived';
  authorId: ObjectId;
  authorName: string;
  reviewers: ObjectId[];
  visibility: 'public' | 'team' | 'restricted';
  relatedArticles: ObjectId[];
  relatedEvents: string[];
  relatedInvestigations: ObjectId[];
  metrics: {
    views: number;
    helpfulVotes: number;
    notHelpfulVotes: number;
  };
  version: number;
  versionHistory: {
    content: string;
    updatedBy: ObjectId;
    updatedAt: Date;
    changeDescription: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// models/ArticleTemplate.ts
interface ArticleTemplate {
  _id: ObjectId;
  name: string;
  type: 'runbook' | 'postmortem' | 'analysis';
  structure: {
    sections: {
      title: string;
      placeholder: string;
    }[];
  };
}
```

**API Endpoints**
- `POST /api/knowledge` - Create article
- `GET /api/knowledge` - List articles (with filters)
- `GET /api/knowledge/:slug` - Get article by slug
- `PUT /api/knowledge/:id` - Update article
- `DELETE /api/knowledge/:id` - Delete article
- `POST /api/knowledge/:id/publish` - Publish article
- `POST /api/knowledge/:id/vote` - Vote helpful/not helpful
- `GET /api/knowledge/search?q=query` - Search articles
- `GET /api/knowledge/:id/related` - Get related articles
- `GET /api/knowledge/templates` - Get article templates
- `POST /api/knowledge/:id/export` - Export article

**UI Components**
- KnowledgeBaseHome component
- ArticleEditor component (markdown/WYSIWYG)
- ArticleViewer component
- ArticleSearchBar component
- ArticleCardGrid component
- CategoryNav component
- RelatedArticles component
- ArticleMetrics component
- ArticleVersionHistory component
- ArticleApprovalFlow component

**Search Implementation**
- Full-text search using MongoDB text indexes or Elasticsearch
- Fuzzy matching for typo tolerance
- Search filters: category, tags, severity, date range
- Search result highlighting
- Search analytics to improve content

### Acceptance Criteria
- [ ] Users can create and edit knowledge base articles
- [ ] Articles support markdown formatting with preview
- [ ] Articles go through approval workflow before publishing
- [ ] Full-text search works across all articles
- [ ] Articles can be linked to events and investigations
- [ ] Related articles are automatically suggested
- [ ] Users can rate article helpfulness
- [ ] Article history tracks all versions
- [ ] Articles can be exported in multiple formats
- [ ] Dashboard shows most viewed and helpful articles
- [ ] Templates accelerate article creation

### Priority
Medium

### Estimated Effort
8-10 days

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. Comments on Events
2. Database schema updates
3. Basic notification system

### Phase 2: Team Collaboration (Weeks 3-4)
1. @Mentions functionality
2. Real-time notifications
3. User search and profiles

### Phase 3: Investigation Workflows (Weeks 5-6)
1. Shared Investigations
2. Investigation dashboard
3. Timeline and attachments

### Phase 4: Documentation (Weeks 7-8)
1. Internal Notes and Annotations
2. Note templates and search
3. Knowledge Base foundation

### Phase 5: Knowledge Management (Weeks 9-10)
1. Knowledge Base articles
2. Article workflow and search
3. Integration with events/investigations

---

## Technical Considerations

### Real-time Updates
- Implement WebSocket connection for live updates
- Use Server-Sent Events (SSE) as fallback
- Consider using socket.io or Pusher

### Permissions & Security
- Role-Based Access Control (RBAC)
- Roles: Admin, Team Lead, Analyst, Viewer
- JWT token updates with team membership
- Audit logging for all collaboration actions

### Performance Optimization
- Pagination for comments and notes
- Lazy loading for investigation timelines
- Caching for frequently accessed articles
- Database indexing on foreign keys

### Scalability
- Consider microservices for notifications
- Message queue for async operations (email, exports)
- CDN for static knowledge base content
- Database sharding for large teams

### Testing Requirements
- Unit tests for all API endpoints
- Integration tests for workflows
- E2E tests for critical paths
- Load testing for concurrent users

---

## Dependencies

### NPM Packages
```json
{
  "socket.io": "^4.6.0",
  "socket.io-client": "^4.6.0",
  "react-markdown": "^8.0.7",
  "react-mentions": "^4.4.10",
  "dompurify": "^3.0.6",
  "slate": "^0.102.0",
  "slate-react": "^0.102.0"
}
```

### Infrastructure
- Redis for real-time pub/sub
- S3 or similar for attachment storage
- Email service (SendGrid, AWS SES)
- Search service (Elasticsearch optional)

---

## Success Metrics

### User Engagement
- Average comments per security event
- Daily active users in collaboration features
- Number of shared investigations created
- Knowledge base article views

### Productivity Metrics
- Time to resolve investigations (before/after)
- Team response time to mentions
- Knowledge base article reuse rate
- Reduction in duplicate investigations

### Quality Metrics
- Investigation completion rate
- Knowledge base article helpfulness rating
- User satisfaction survey scores
- Feature adoption rate

---

## Future Enhancements

### Advanced Features
- AI-powered article recommendations
- Automated threat intelligence gathering
- Integration with SIEM systems
- Mobile app for on-the-go collaboration
- Slack/Teams integration for notifications
- Video/voice annotations
- Whiteboard for visual collaboration
- External sharing with partners (secure links)

### Analytics
- Collaboration heatmaps
- Team performance dashboards
- Investigation analytics
- Knowledge base insights

---

## Documentation Requirements

- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guides for each feature
- [ ] Admin configuration guides
- [ ] Video tutorials
- [ ] Migration guide from existing workflows
- [ ] Security audit documentation
- [ ] Accessibility compliance documentation

---

## Support & Maintenance

### Monitoring
- Error tracking (Sentry)
- Performance monitoring (New Relic/DataDog)
- User analytics (Mixpanel/Amplitude)
- Uptime monitoring

### Maintenance Plan
- Regular security updates
- Database backups and retention
- Performance optimization reviews
- User feedback collection and iteration

---

*Document Version: 1.0*  
*Last Updated: February 26, 2026*  
*Author: Development Team*
