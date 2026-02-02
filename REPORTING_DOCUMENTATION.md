# Export & Reporting Feature Documentation

## Overview

The Export & Reporting feature provides comprehensive functionality for generating, exporting, and scheduling security reports in your BreachBuddy cybersecurity dashboard. This feature includes PDF report generation, CSV/JSON data export, scheduled automated reports, and custom report templates.

## Table of Contents

1. [Features](#features)
2. [API Endpoints](#api-endpoints)
3. [Database Models](#database-models)
4. [Frontend Integration](#frontend-integration)
5. [Usage Examples](#usage-examples)
6. [Scheduled Reports](#scheduled-reports)
7. [Custom Templates](#custom-templates)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Security Features](#security-features)
11. [Dependencies](#dependencies)

---

## Features

### 1. PDF Report Generation
- Professional PDF reports with security metrics and events
- Customizable templates with sections for metrics, events, and charts
- Automatic filename generation with timestamps
- Browser download functionality

### 2. CSV/JSON Export
- Export security events in CSV or JSON format
- Filtering by severity, date range, and event types
- Structured data format for external analysis
- Automatic file download

### 3. Scheduled Reports
- Automated report generation on daily, weekly, or monthly schedules
- Configurable delivery time and frequency
- Email delivery support (configurable)
- Cloud storage integration (configurable)

### 4. Custom Templates
- Create and manage custom report templates
- Define sections (metrics, events, charts, custom content)
- Styling and layout customization
- Public/private template sharing

---

## API Endpoints

### 1. Generate PDF Report

**Endpoint:** `POST /api/reports/generate`

**Description:** Generates a professional PDF security report.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Security Report",
  "templateId": "optional-template-id",
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "severity": ["critical", "high"],
    "eventTypes": ["malware", "brute-force"]
  }
}
```

**Response:**
- Content-Type: `application/pdf`
- Binary PDF file download

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Monthly Security Report"}' \
  --output report.pdf
```

---

### 2. Export Data (CSV/JSON)

**Endpoint:** `POST /api/reports/export`

**Description:** Exports security events in CSV or JSON format.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "severity": ["critical", "high"],
    "eventTypes": ["malware"]
  }
}
```

**Response:**
- CSV format: Content-Type: `text/csv`
- JSON format: Content-Type: `application/json`

**Example (cURL - CSV):**
```bash
curl -X POST http://localhost:3000/api/reports/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "csv"}' \
  --output events.csv
```

**Example (cURL - JSON):**
```bash
curl -X POST http://localhost:3000/api/reports/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}' \
  --output events.json
```

---

### 3. Schedule Reports

**Endpoint:** `POST /api/reports/schedule`

**Description:** Create a new scheduled report.

**Request Body:**
```json
{
  "title": "Weekly Security Report",
  "type": "pdf",
  "frequency": "weekly",
  "time": "09:00",
  "dayOfWeek": 1,
  "deliveryMethod": "email",
  "templateId": "optional-template-id",
  "filters": {
    "severity": ["critical", "high"]
  }
}
```

**Endpoint:** `GET /api/reports/schedule`

**Description:** Get all scheduled reports for the authenticated user.

**Endpoint:** `DELETE /api/reports/schedule?id=<schedule-id>`

**Description:** Delete a scheduled report.

**Frequency Options:**
- `daily`: Runs every day at the specified time
- `weekly`: Runs once per week on the specified day (0=Sunday, 1=Monday, etc.)
- `monthly`: Runs once per month on the specified day (1-31)

**Time Format:** HH:mm (24-hour format, e.g., "09:00", "14:30")

---

### 4. Report Templates

**Endpoint:** `POST /api/reports/templates`

**Description:** Create a new report template.

**Request Body:**
```json
{
  "name": "Executive Summary",
  "description": "High-level security overview",
  "sections": [
    {
      "type": "metrics",
      "enabled": true,
      "config": {
        "metrics": ["threats", "vulnerabilities", "uptime"]
      }
    },
    {
      "type": "events",
      "enabled": true,
      "config": {
        "limit": 10,
        "severityFilter": ["critical", "high"]
      }
    }
  ],
  "styling": {
    "primaryColor": "#0066cc",
    "fontSize": "12pt"
  },
  "isPublic": false
}
```

**Endpoint:** `GET /api/reports/templates`

**Description:** Get all templates (user's private + public templates).

**Endpoint:** `PUT /api/reports/templates?id=<template-id>`

**Description:** Update an existing template.

**Endpoint:** `DELETE /api/reports/templates?id=<template-id>`

**Description:** Delete a template.

**Section Types:**
- `metrics`: Display key security metrics
- `events`: List recent security events
- `charts`: Visual charts and graphs
- `custom`: Custom text or HTML content

---

## Database Models

### Report Model

```typescript
{
  userId: ObjectId,           // Reference to User
  title: String,              // Report title
  type: 'pdf' | 'csv' | 'json', // Report format
  status: 'pending' | 'generating' | 'completed' | 'failed',
  fileUrl: String,            // Storage URL (optional)
  fileSize: Number,           // File size in bytes
  generatedAt: Date,          // Generation timestamp
  
  // Scheduling (optional)
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly',
    time: String,             // HH:mm format
    dayOfWeek: Number,        // 0-6 (for weekly)
    dayOfMonth: Number,       // 1-31 (for monthly)
    nextRun: Date,            // Next scheduled run
    lastRun: Date,            // Last execution time
    enabled: Boolean
  },
  
  // Delivery (optional)
  deliveryMethod: 'download' | 'email' | 'storage',
  deliveryConfig: {
    email: String,            // Email address
    storageProvider: String,  // 's3', 'gcs', etc.
    storagePath: String
  },
  
  // Filters
  filters: {
    dateRange: {
      start: Date,
      end: Date
    },
    severity: [String],       // ['critical', 'high', ...]
    eventTypes: [String]      // ['malware', 'brute-force', ...]
  },
  
  // Metadata
  metadata: {
    recordsIncluded: Number,
    generationTime: Number    // Milliseconds
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### ReportTemplate Model

```typescript
{
  userId: ObjectId,           // Creator
  name: String,               // Template name
  description: String,        // Template description
  
  sections: [
    {
      type: 'metrics' | 'events' | 'charts' | 'custom',
      enabled: Boolean,
      order: Number,
      config: Object          // Section-specific config
    }
  ],
  
  styling: {
    primaryColor: String,
    secondaryColor: String,
    fontSize: String,
    fontFamily: String,
    headerImage: String       // URL
  },
  
  isPublic: Boolean,          // Shareable with all users
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## Frontend Integration

### Dashboard Integration

The reporting features are integrated into the dashboard's "Overview" tab with Quick Actions buttons:

#### 1. Generate Report Button

```typescript
const handleGenerateReport = async () => {
  try {
    setGeneratingReport(true);

    const token = localStorage.getItem('token');
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Security Report',
        filters: {
          // Optional filters
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate report');
    }

    // Download PDF
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `security_report_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Report generated and downloaded successfully!');
  } catch (error) {
    alert(error.message || 'Failed to generate report');
  } finally {
    setGeneratingReport(false);
  }
};
```

#### 2. Export Data Button

```typescript
const handleExportCSV = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/reports/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        format: 'csv',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to export data');
    }

    // Download CSV
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `security_events_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Data exported successfully!');
  } catch (error) {
    alert(error.message || 'Failed to export data');
  }
};
```

### How to Download Reports

**Step 1:** Log in to your dashboard
**Step 2:** Navigate to the "Overview" tab
**Step 3:** In the "Quick Actions" section, you'll see:
- **Generate Report** button (📊) - Downloads PDF report
- **Export Data** button (📥) - Downloads CSV file

**Step 4:** Click the desired button
**Step 5:** The file will automatically download to your browser's download folder

The download location depends on your browser settings. By default:
- **Chrome:** `C:\Users\YourName\Downloads\`
- **Firefox:** `C:\Users\YourName\Downloads\`
- **Edge:** `C:\Users\YourName\Downloads\`

---

## Usage Examples

### Example 1: Generate a Basic PDF Report

```javascript
const token = localStorage.getItem('token');

const response = await fetch('/api/reports/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Daily Security Report'
  })
});

const blob = await response.blob();
// Handle download...
```

### Example 2: Export Critical Events as CSV

```javascript
const response = await fetch('/api/reports/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    format: 'csv',
    filters: {
      severity: ['critical'],
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31'
      }
    }
  })
});
```

### Example 3: Schedule Weekly Report

```javascript
const response = await fetch('/api/reports/schedule', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Weekly Executive Report',
    type: 'pdf',
    frequency: 'weekly',
    time: '09:00',
    dayOfWeek: 1, // Monday
    deliveryMethod: 'email'
  })
});
```

### Example 4: Create Custom Template

```javascript
const response = await fetch('/api/reports/templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Executive Summary',
    description: 'High-level overview for executives',
    sections: [
      {
        type: 'metrics',
        enabled: true,
        config: {
          metrics: ['threats', 'vulnerabilities', 'uptime']
        }
      },
      {
        type: 'events',
        enabled: true,
        config: {
          limit: 5,
          severityFilter: ['critical']
        }
      }
    ],
    styling: {
      primaryColor: '#0066cc',
      fontSize: '14pt'
    }
  })
});
```

---

## Scheduled Reports

### How Scheduling Works

1. **Configuration:** Create a schedule with frequency, time, and delivery method
2. **Next Run Calculation:** System automatically calculates next execution time
3. **Cron Job:** Background process checks for pending reports every minute
4. **Generation:** Reports are generated automatically at scheduled times
5. **Delivery:** Reports are delivered via email or saved to cloud storage

### Frequency Options

#### Daily Reports
- Runs every day at the specified time
- Example: `09:00` = 9:00 AM daily

#### Weekly Reports
- Runs once per week on the specified day
- Days: 0=Sunday, 1=Monday, 2=Tuesday, etc.
- Example: `dayOfWeek: 1, time: "09:00"` = Every Monday at 9:00 AM

#### Monthly Reports
- Runs once per month on the specified day
- Days: 1-31 (if day doesn't exist in month, uses last day)
- Example: `dayOfMonth: 1, time: "09:00"` = 1st of every month at 9:00 AM

### Managing Schedules

```javascript
// Get all schedules
const schedules = await fetch('/api/reports/schedule', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Delete a schedule
await fetch(`/api/reports/schedule?id=${scheduleId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Custom Templates

### Template Structure

Templates define how reports are structured and styled:

1. **Sections:** Define what content to include (metrics, events, charts)
2. **Styling:** Customize colors, fonts, and layout
3. **Configuration:** Section-specific settings

### Creating a Template

```javascript
const template = {
  name: "Security Overview",
  description: "Complete security status report",
  sections: [
    {
      type: "metrics",
      enabled: true,
      order: 1,
      config: {
        metrics: ["threats", "vulnerabilities", "uptime"],
        displayStyle: "cards"
      }
    },
    {
      type: "events",
      enabled: true,
      order: 2,
      config: {
        limit: 20,
        severityFilter: ["critical", "high"],
        groupBy: "type"
      }
    },
    {
      type: "charts",
      enabled: true,
      order: 3,
      config: {
        chartType: "bar",
        dataRange: "7days"
      }
    }
  ],
  styling: {
    primaryColor: "#0066cc",
    secondaryColor: "#00cc66",
    fontSize: "12pt",
    fontFamily: "Arial, sans-serif"
  },
  isPublic: false
};
```

### Using a Template

```javascript
const response = await fetch('/api/reports/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Custom Report',
    templateId: 'your-template-id'
  })
});
```

---

## Testing

### Testing PDF Generation

1. Navigate to Dashboard > Overview tab
2. Click "Generate Report" button
3. Check your Downloads folder for `security_report_<timestamp>.pdf`
4. Verify PDF contains:
   - Security metrics
   - Recent events
   - Proper formatting

### Testing CSV Export

1. Click "Export Data" button
2. Check Downloads folder for `security_events_<timestamp>.csv`
3. Open in Excel/Google Sheets
4. Verify columns: ID, Type, Severity, Description, Timestamp, Status

### Testing API with cURL

```bash
# Get your token from localStorage in browser console
TOKEN=$(echo "localStorage.getItem('token')" | npx browser-repl)

# Test PDF generation
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Report"}' \
  --output test-report.pdf

# Test CSV export
curl -X POST http://localhost:3000/api/reports/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "csv"}' \
  --output test-export.csv

# Test schedule creation
curl -X POST http://localhost:3000/api/reports/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily Report",
    "type": "pdf",
    "frequency": "daily",
    "time": "09:00"
  }'

# List schedules
curl -X GET http://localhost:3000/api/reports/schedule \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Issue: PDF doesn't download

**Solutions:**
- Check browser console for errors
- Verify JWT token is valid
- Check browser's download settings
- Try different browser
- Check MongoDB connection

### Issue: "Failed to generate report" error

**Solutions:**
- Check server logs: `npm run dev`
- Verify MongoDB is running
- Check JWT token in localStorage
- Verify user is authenticated
- Check API route logs

### Issue: Empty or malformed PDF

**Solutions:**
- Verify sample data is being generated
- Check PDF generation code in `/lib/reportGenerator.ts`
- Ensure jsPDF and jspdf-autotable are installed
- Check for console errors

### Issue: CSV export has no data

**Solutions:**
- Verify filters aren't too restrictive
- Check if any events exist in database
- Review API response in Network tab
- Check CSV generation function

### Issue: Scheduled reports not running

**Solutions:**
- Verify cron job is initialized
- Check schedule's `nextRun` field
- Ensure schedule is enabled
- Check server logs for cron execution
- Verify time format is correct (HH:mm)

### Issue: Template not applying

**Solutions:**
- Verify templateId exists
- Check template's sections configuration
- Ensure user has access to template (public or owned)
- Check API response for errors

---

## Security Features

### Authentication & Authorization

- **JWT Verification:** All endpoints require valid JWT token
- **User Isolation:** Users can only access their own reports and schedules
- **Token Validation:** Tokens verified on every request

### Data Privacy

- **User-Specific Data:** Reports only include user's security events
- **Template Privacy:** Private templates only visible to creator
- **Secure Storage:** File URLs use secure storage (when configured)

### Rate Limiting (Recommended)

Consider implementing rate limiting for report generation:

```javascript
// Example with express-rate-limit
const rateLimit = require('express-rate-limit');

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each user to 10 reports per window
});
```

### Input Validation

All endpoints validate:
- Required fields presence
- Data types and formats
- Date ranges
- Enum values (frequency, type, etc.)

---

## Dependencies

### Installed Packages

```json
{
  "jspdf": "^2.5.2",
  "jspdf-autotable": "^3.8.3",
  "json2csv": "^6.0.0-alpha.2",
  "node-cron": "^3.0.3"
}
```

### TypeScript Types

```json
{
  "@types/json2csv": "^5.0.7",
  "@types/node-cron": "^3.0.11"
}
```

### Installation

```bash
npm install jspdf jspdf-autotable json2csv node-cron
npm install --save-dev @types/json2csv @types/node-cron
```

---

## File Structure

```
LaunchPad-CodeH/
├── app/
│   ├── api/
│   │   └── reports/
│   │       ├── generate/
│   │       │   └── route.ts          # PDF generation endpoint
│   │       ├── export/
│   │       │   └── route.ts          # CSV/JSON export endpoint
│   │       ├── schedule/
│   │       │   └── route.ts          # Schedule management endpoint
│   │       └── templates/
│   │           └── route.ts          # Template CRUD endpoint
│   └── dashboard/
│       └── page.tsx                  # Dashboard with report buttons
├── lib/
│   └── reportGenerator.ts            # Report generation utilities
├── models/
│   ├── Report.ts                     # Report database model
│   └── ReportTemplate.ts             # Template database model
└── REPORTING_DOCUMENTATION.md        # This file
```

---

## Error Handling

### API Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "details": "Additional context (optional)"
}
```

### Common Error Codes

- **401 Unauthorized:** Missing or invalid JWT token
- **404 Not Found:** Resource doesn't exist
- **400 Bad Request:** Invalid input parameters
- **500 Internal Server Error:** Server-side error

### Frontend Error Handling

```javascript
try {
  const response = await fetch('/api/reports/generate', {
    // ... request config
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Request failed');
  }

  // Handle success
} catch (error) {
  console.error('Error:', error);
  alert(error.message);
}
```

---

## Future Enhancements

### Planned Features

1. **Email Delivery:** Automatic email delivery for scheduled reports
2. **Cloud Storage:** Integration with AWS S3, Google Cloud Storage
3. **Advanced Charts:** Interactive charts with Chart.js or D3.js
4. **Report History:** View and download previously generated reports
5. **Template Marketplace:** Share templates with community
6. **Custom Branding:** Logo and company branding in reports
7. **Multi-format Export:** Support for Excel, Word formats
8. **Report Annotations:** Add notes and comments to reports
9. **Comparative Reports:** Compare metrics across time periods
10. **Real-time Reports:** Live-updating dashboards

---

## Support

For issues or questions:

1. Check this documentation
2. Review error messages in browser console
3. Check server logs (`npm run dev`)
4. Verify all dependencies are installed
5. Ensure MongoDB is running

---

## Changelog

### Version 1.0.0 (Current)

- Initial release
- PDF report generation
- CSV/JSON export
- Scheduled reports
- Custom templates
- Dashboard integration

---

**Last Updated:** February 2, 2026

**Author:** BreachBuddy Development Team

**License:** MIT
