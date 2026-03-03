# Collaboration Features Documentation

## Overview

The BreachBuddy platform now includes comprehensive collaboration capabilities that enable teams to work together effectively on security incidents, share knowledge, and maintain clear communication channels. These features address the critical need for coordinated incident response and knowledge sharing in security operations.

## Table of Contents

1. [Event Comments & @Mentions](#event-comments--mentions)
2. [Shared Investigations](#shared-investigations)
3. [Internal Notes & Annotations](#internal-notes--annotations)
4. [Knowledge Base Integration](#knowledge-base-integration)
5. [API Documentation](#api-documentation)

---

## Event Comments & @Mentions

### Purpose
Enable team members to discuss security events directly within the platform, eliminating the need for external communication tools and preserving context.

### Features

#### Adding Comments
- Click the **💬 Comment** button on any security event in the Threats tab
- Type your comment in the text area
- Use `@username` to mention and notify specific team members
- Mark comments as "Internal note (team only)" for sensitive discussions

#### @Mentions
- Type `@` followed by a username to mention team members
- Mentioned users receive notifications (if configured)
- Mentions are highlighted in blue for easy identification
- View all users mentioned in a comment at the bottom of each comment card

#### Editing and Deleting Comments
- Click **Edit** to modify your own comments
- Click **Delete** to remove comments you've created
- Edited comments show an "(edited)" label with timestamp

### Best Practices

1. **Use @mentions strategically**: Notify relevant team members without overwhelming everyone
2. **Mark sensitive information as internal**: Use the "Internal note" checkbox for team-only discussions
3. **Provide context**: Include relevant details about your findings or recommendations
4. **Reference other events**: Link to related events by mentioning event IDs

### Access Control

- All authenticated users can view public comments
- Internal notes are only visible to team members
- Users can only edit/delete their own comments

---

## Shared Investigations

### Purpose
Enable collaborative analysis of security incidents with structured workflows, progress tracking, and team coordination.

### Features

#### Creating Investigations
1. Click **🔍 Investigate** on any security event
2. Fill in the investigation details:
   - **Title**: Clear, descriptive name
   - **Description**: Scope and objectives
   - **Priority**: Low, Medium, High, or Critical
3. Assign team members (optional)
4. Click **Create Investigation**

#### Investigation Workflow

##### Status Management
- **Open**: Investigation has been created but work hasn't started
- **In Progress**: Team is actively investigating
- **Resolved**: Investigation completed with findings
- **Closed**: Investigation archived

##### Adding Findings
1. Select an investigation from the list
2. Click **+ Add Finding**
3. Provide:
   - Finding title
   - Detailed description
   - Severity level
4. All findings are timestamped and attributed to the user who added them

##### Timeline Tracking
- Every action is automatically logged in the investigation timeline
- View who did what and when
- Track status changes, user assignments, and findings additions

#### Collaboration Features

##### Team Assignment
- Assign multiple team members to an investigation
- View all assigned team members at a glance
- Track when each member was assigned

##### Real-time Updates
- Investigations update in real-time across all team members
- Automatic refresh when changes occur
- Visual indicators for active/updated investigations

### Best Practices

1. **Create investigations for complex incidents**: Simple issues can be handled with comments alone
2. **Set appropriate priority levels**: Help team members focus on critical issues
3. **Document findings as you discover them**: Don't wait until the end
4. **Update status regularly**: Keep the team informed of progress
5. **Assign specific team members**: Clear accountability improves response times

---

## Internal Notes & Annotations

### Purpose
Document internal decisions, observations, and context that shouldn't be visible in public communications.

### Features

#### Creating Internal Notes
- When adding a comment, check **"Internal note (team only)"**
- Internal notes have a yellow background for easy identification
- Only team members with proper permissions can view internal notes

#### Use Cases

1. **Sensitive Information**: Document information that shouldn't be public
2. **Decision Rationale**: Explain why certain actions were taken
3. **Investigation Hypotheses**: Share theories without public speculation
4. **Team Coordination**: Coordinate internal responses without external visibility

### Best Practices

1. **Default to internal for sensitive matters**: When in doubt, mark as internal
2. **Document decision-making**: Future teams will thank you
3. **Include timestamps and context**: Help others understand the situation
4. **Review before publishing**: Once public, comments can't be made internal

---

## Knowledge Base Integration

### Purpose
Provide instant access to security procedures, best practices, and troubleshooting guides directly within the incident response workflow.

### Features

#### Accessing the Knowledge Base

**From Security Events**:
- Click **📚 KB** on any event to see related articles
- Articles are automatically filtered by threat type
- One-click access to relevant procedures

**From Help Tab**:
- Click the **Knowledge Base** card
- Browse all categories
- Search across all articles

#### Article Organization

##### Categories
- **Procedures**: Step-by-step operational procedures
- **Troubleshooting**: Problem-solving guides
- **Best Practices**: Security recommendations
- **Incident Response**: Emergency response protocols
- **Threat Intelligence**: Information about specific threats
- **Tools**: Tool usage and configuration guides

##### Search and Filtering
- **Full-text search**: Search titles, content, and tags
- **Category filter**: Browse specific categories
- **Threat type filter**: Find articles related to specific threats
- **Featured articles**: Most important articles highlighted

#### Article Features

##### Step-by-Step Instructions
- Numbered steps with clear descriptions
- Code examples for technical procedures
- Warnings and cautions highlighted
- Optional fields for additional context

##### Feedback System
- Mark articles as helpful or not helpful
- View popularity metrics (views, helpful votes)
- Helps improve content over time

##### Related Content
- Tags for topic-based browsing
- Threat type associations
- Related articles suggestions

### Best Practices

1. **Check KB first**: Before escalating, see if there's a documented procedure
2. **Provide feedback**: Help improve article quality
3. **Reference KB articles in comments**: Share helpful articles with team members
4. **Bookmark frequently used articles**: Note slugs for quick access

### Sample Knowledge Base Articles

The platform comes pre-loaded with articles on:
- Brute Force Attack Response
- Malware Detection and Removal
- DDoS Attack Mitigation
- SQL Injection Prevention
- Phishing Email Response
- Ransomware Prevention and Recovery
- Zero-Day Vulnerability Response
- SIEM Best Practices

---

## API Documentation

### Comments API

#### Get Comments
```http
GET /api/collaboration/comments?eventId={eventId}&includeInternal={true|false}
Authorization: Bearer {token}
```

#### Add Comment
```http
POST /api/collaboration/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventId": "123",
  "content": "Investigation reveals @john should review this",
  "isInternal": false
}
```

#### Update Comment
```http
PUT /api/collaboration/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "commentId": "abc123",
  "content": "Updated content"
}
```

#### Delete Comment
```http
DELETE /api/collaboration/comments?commentId={commentId}
Authorization: Bearer {token}
```

### Investigations API

#### Get Investigations
```http
GET /api/collaboration/investigations?eventId={eventId}&status={status}
Authorization: Bearer {token}
```

#### Create Investigation
```http
POST /api/collaboration/investigations
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventId": "123",
  "title": "Brute Force Investigation",
  "description": "Multiple failed login attempts",
  "priority": "high",
  "assignedTo": ["userId1", "userId2"]
}
```

#### Update Investigation
```http
PUT /api/collaboration/investigations
Authorization: Bearer {token}
Content-Type: application/json

{
  "investigationId": "inv123",
  "status": "in-progress",
  "findings": {
    "title": "Source identified",
    "description": "Attack originated from 192.168.1.100",
    "severity": "high"
  }
}
```

### Knowledge Base API

#### Get Articles
```http
GET /api/collaboration/knowledge-base?category={category}&search={query}&threatType={type}
Authorization: Bearer {token}
```

#### Get Article by Slug
```http
GET /api/collaboration/knowledge-base?slug={article-slug}
Authorization: Bearer {token}
```

#### Submit Feedback
```http
POST /api/collaboration/knowledge-base
Authorization: Bearer {token}
Content-Type: application/json

{
  "articleId": "article123",
  "helpful": true
}
```

---

## Workflow Examples

### Example 1: Responding to a Brute Force Attack

1. **Detection**: Security event appears for "Brute Force Attack"
2. **Discussion**: Team member clicks **💬 Comment** and types:
   ```
   "Seeing multiple failed attempts from 192.168.1.100. @sarah please check firewall logs"
   ```
3. **Investigation**: Click **🔍 Investigate** to create investigation:
   - Title: "Brute Force Attack from 192.168.1.100"
   - Priority: High
   - Assign: Sarah, John
4. **Knowledge Base**: Click **📚 KB** to access "How to Respond to a Brute Force Attack"
5. **Document Findings**: Add findings to investigation:
   - "IP blocked at firewall level"
   - "No successful authentications detected"
6. **Internal Note**: Add internal comment:
   ```
   Internal: Contacted ISP about malicious IP. Ticket #12345
   ```
7. **Resolution**: Update investigation status to "Resolved"

### Example 2: Malware Incident Response

1. **Alert**: Malware detected on user workstation
2. **Quick Reference**: Click **📚 KB** → "Malware Detection and Removal Procedures"
3. **Start Investigation**: Create investigation and assign security team
4. **Share Progress**: Add comments with findings:
   ```
   @team Malware identified as Trojan.Generic. Following KB article steps.
   ```
5. **Document Actions**: Add findings for each remediation step
6. **Internal Documentation**: 
   ```
   Internal: User clicked phishing email from last week's campaign.
   Need to schedule additional security awareness training.
   ```
7. **Close Out**: Mark investigation as resolved with summary

---

## Security Considerations

### Data Privacy
- Internal notes are encrypted at rest
- Comments are associated with authenticated users
- All actions are logged for audit purposes

### Access Control
- Role-based access control for sensitive features
- Comment visibility based on internal/public flag
- Investigation access restricted to assigned team members

### Audit Trail
- Complete timeline of all actions
- User attribution for all changes
- Timestamps for forensic analysis

---

## Troubleshooting

### Comments Not Appearing
1. Refresh the browser page
2. Check if you have proper authentication
3. Verify the event ID exists
4. Check browser console for errors

### @Mentions Not Working
1. Ensure username is spelled correctly
2. Verify the user exists in the system
3. Check notification settings
4. Confirm user has access to view the event

### Investigation Updates Not Saving
1. Verify your authentication token is valid
2. Check that you're assigned to the investigation
3. Ensure all required fields are filled
4. Check for network connectivity issues

### Knowledge Base Articles Not Loading
1. Clear browser cache
2. Check if articles are published
3. Verify search query syntax
4. Try browsing by category instead

---

## Support

For additional help with collaboration features:
- **Chat Support**: Click the chat icon in the Help tab
- **Knowledge Base**: Browse all articles in the KB
- **Community**: Connect with other users
- **Documentation**: Refer to this guide

---

## Future Enhancements

Planned features for future releases:
- Real-time collaboration indicators (who's viewing what)
- Comment reactions and threading
- Advanced search with filters
- Investigation templates
- Automated KB article suggestions
- Integration with external ticketing systems
- Mobile app support
- Voice notes and attachments
- Custom investigation workflows
- Advanced analytics and reporting

---

*Last updated: February 28, 2026*
