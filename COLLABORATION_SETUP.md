# Collaboration Features - Setup Instructions

## 🚀 Quick Setup

### 1. Install Dependencies
All required dependencies are already in the project's `package.json`. If you need to reinstall:

```bash
cd c:\Users\HP\LaunchPad-CodeH
npm install
```

### 2. Seed the Knowledge Base
Populate the knowledge base with sample articles:

```bash
npx tsx scripts/seedKnowledgeBase.ts
```

Expected output:
```
Clearing existing articles...
Seeding knowledge base articles...
✓ Created: How to Respond to a Brute Force Attack
✓ Created: Malware Detection and Removal Procedures
✓ Created: DDoS Attack Mitigation Best Practices
✓ Created: SQL Injection Prevention Guide
✓ Created: Phishing Email Identification and Response
✓ Created: Ransomware Prevention and Recovery
✓ Created: Zero-Day Vulnerability Response Protocol
✓ Created: Security Information and Event Management (SIEM) Best Practices

✨ Successfully seeded 8 knowledge base articles!
```

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Access the Features

1. Navigate to `http://localhost:3000/dashboard`
2. Log in with your credentials
3. Go to the **Threats** tab
4. You'll see three new buttons on each event:
   - 💬 **Comment** - Add comments and @mention team members
   - 🔍 **Investigate** - Start a shared investigation
   - 📚 **KB** - View related knowledge base articles

## 📁 What Was Added

### New API Routes
```
app/api/collaboration/
  ├── comments/route.ts         # Event comments with @mentions
  ├── investigations/route.ts    # Shared investigations
  └── knowledge-base/route.ts    # Knowledge base articles
```

### New Components
```
components/
  ├── CommentsPanel.tsx          # Comments UI
  ├── InvestigationPanel.tsx     # Investigations UI
  └── KnowledgeBasePanel.tsx     # Knowledge Base UI
```

### New Models
```
models/
  ├── EventComment.ts            # Comment data model
  ├── Investigation.ts           # Investigation data model
  └── KnowledgeBaseArticle.ts    # KB article data model
```

### Documentation
```
COLLABORATION_FEATURES_DOCUMENTATION.md    # Comprehensive guide
COLLABORATION_QUICK_START.md               # Quick reference
COLLABORATION_IMPLEMENTATION_SUMMARY.md    # Implementation details
```

## 🔧 Configuration

### Environment Variables
Make sure these are set in your `.env.local`:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Database Indexes
The models include automatic index creation. They will be created when you first use the features:
- Comments indexed by eventId and createdAt
- Investigations indexed by status, priority, and assignedTo
- KB articles indexed for full-text search

## ✅ Verification

### Test Comments Feature
1. Go to Dashboard → Threats tab
2. Click 💬 Comment on any event
3. Add a comment: "Testing @yourname"
4. Verify comment appears with highlighted mention

### Test Investigation Feature
1. Click 🔍 Investigate on an event
2. Create a new investigation
3. Add findings
4. Update status
5. Verify timeline updates

### Test Knowledge Base
1. Click 📚 KB on any event
2. Browse articles by category
3. Search for "brute force"
4. Read an article and provide feedback

## 🐛 Troubleshooting

### "Module has no default export" errors in IDE
This is a TypeScript caching issue. Try:
1. Restart your IDE/editor
2. Delete `.next` folder and restart dev server
3. Run `npm run build` to verify it compiles correctly

### Seed script fails
Make sure:
1. MongoDB is running and accessible
2. MONGODB_URI is correctly set
3. You have write permissions to the database

### Features not appearing in dashboard
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors

### Comments/Investigations not saving
1. Check authentication (localStorage should have 'token')
2. Verify MongoDB connection
3. Check browser network tab for API errors

## 📊 Database Collections

After seeding and using the features, you should see these collections in MongoDB:

```
- users                  # Existing user collection
- reports               # Existing reports
- reporttemplates       # Existing templates
- eventcomments         # NEW: Event comments
- investigations        # NEW: Investigations
- knowledgebasearticles # NEW: KB articles
```

## 🎯 Next Steps

1. **Customize KB Articles**: Add your own organization-specific procedures
2. **Configure Notifications**: Set up email/in-app notifications for @mentions
3. **Train Your Team**: Share COLLABORATION_QUICK_START.md with users
4. **Monitor Usage**: Track engagement with collaboration features
5. **Gather Feedback**: Ask users what additional features they need

## 📚 Additional Resources

- **Full Documentation**: See `COLLABORATION_FEATURES_DOCUMENTATION.md`
- **Quick Start Guide**: See `COLLABORATION_QUICK_START.md`
- **Implementation Details**: See `COLLABORATION_IMPLEMENTATION_SUMMARY.md`
- **API Endpoints**: Documented in COLLABORATION_FEATURES_DOCUMENTATION.md

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the full documentation
3. Check browser console and terminal for errors
4. Verify all dependencies are installed
5. Ensure MongoDB is running and accessible

## ✨ You're All Set!

The collaboration features are now ready to use. Start by:
1. Creating a comment on a security event
2. Starting an investigation for a critical issue
3. Browsing the knowledge base for procedures

Happy collaborating! 🎉

---

*Last updated: February 28, 2026*
