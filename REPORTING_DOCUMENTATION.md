# Export & Reporting Feature Documentation

## Overview
Complete implementation of report generation, data export, scheduled reports, and custom templates for the BreachBuddy security dashboard.

---

## Table of Contents
1. [Features](#features)
2. [Backend API](#backend-api)
3. [Frontend Integration](#frontend-integration)
4. [Database Models](#database-models)
5. [Usage Examples](#usage-examples)
6. [Dependencies](#dependencies)

---

## Features

### ✅ Implemented Features
- **PDF Report Generation** - Professional security reports with metrics and events
- **CSV/JSON Export** - Export security data for analysis
- **Scheduled Reports** - Automated report generation (daily/weekly/monthly)
- **Custom Templates** - User-defined report layouts and styling
- **Report History** - Track all generated reports
- **Filtering** - Filter reports by date range, severity, event types

---

## Backend API

### Base URL
All API endpoints are prefixed with `/api/reports/`

### Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### 1. Generate PDF Report

**Endpoint:** `POST /api/reports/generate`

**Request Body:**
```json
{
  "title": "Monthly Security Report",
  "description": "Security overview for January 2026",
  "templateId": "optional_template_id",
  "filters": {
    "severity": ["critical", "high"],
    "eventTypes": ["Brute Force Attack", "Malware Detected"],
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    }
  }
}
```

**Response:**
- PDF file download (application/pdf)
- Filename: `{title}_{timestamp}.pdf`

**Features:**
- Executive summary with system metrics
- Security events table with color-coded severity
- Automatic pagination
- Custom template support
- Professional formatting

**Example:**
```javascript
const response = await fetch('/api/reports/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: 'Security Report',
    filters: { severity: ['critical', 'high'] }
  }),
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `report_${Date.now()}.pdf`;
a.click();
```

---

### 2. Export Data (CSV/JSON)

**Endpoint:** `POST /api/reports/export`

**Request Body:**
```json
{
  "format": "csv",
  "includeMetrics": true,
  "filters": {
    "severity": ["critical", "high"],
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    }
  }
}
```

**Parameters:**
- `format`: `"csv"` or `"json"`
- `includeMetrics`: Include summary metrics (JSON only)
- `filters`: Filter options (optional)

**Response:**
- CSV: text/csv file
- JSON: application/json file

**Example:**
```javascript
// CSV Export
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

const blob = await response.blob();
// Download CSV file
```

---

### 3. Schedule Automated Reports

**Endpoint:** `POST /api/reports/schedule`

**Request Body:**
```json
{
  "title": "Weekly Security Report",
  "description": "Automated weekly report",
  "type": "pdf",
  "templateId": "template_id_here",
  "filters": {
    "severity": ["critical", "high", "medium"]
  },
  "schedule": {
    "enabled": true,
    "frequency": "weekly",
    "dayOfWeek": 1,
    "time": "09:00"
  }
}
```

**Schedule Frequencies:**
- `daily`: Runs every day at specified time
- `weekly`: Runs on specified day (0=Sunday, 6=Saturday)
- `monthly`: Runs on specified day of month (1-31)

**Time Format:** 24-hour format (HH:mm)

**Response:**
```json
{
  "success": true,
  "message": "Scheduled report configured successfully",
  "report": {
    "_id": "report_id",
    "title": "Weekly Security Report",
    "schedule": {
      "enabled": true,
      "frequency": "weekly",
      "nextRun": "2026-02-03T09:00:00.000Z"
    }
  }
}
```

**Additional Operations:**
```javascript
// Get all scheduled reports
GET /api/reports/schedule

// Delete scheduled report
DELETE /api/reports/schedule?id=report_id
```

---

### 4. Report Templates

**Endpoint:** `POST /api/reports/templates`

**Request Body:**
```json
{
  "name": "Executive Summary Template",
  "description": "High-level security overview",
  "isPublic": false,
  "sections": [
    {
      "id": "metrics",
      "title": "Key Metrics",
      "type": "metrics",
      "enabled": true
    },
    {
      "id": "critical-events",
      "title": "Critical Events",
      "type": "events",
      "enabled": true,
      "config": {
        "severityFilter": ["critical"]
      }
    }
  ],
  "styling": {
    "primaryColor": "#2563eb",
    "fontFamily": "helvetica",
    "fontSize": 11
  }
}
```

**Section Types:**
- `metrics`: Display system metrics
- `events`: List security events
- `charts`: Visual charts
- `custom`: Custom content

**Additional Operations:**
```javascript
// Get all templates
GET /api/reports/templates

// Get specific template
GET /api/reports/templates?id=template_id

// Update template
PUT /api/reports/templates

// Delete template
DELETE /api/reports/templates?id=template_id
```

---

### 5. Report History

**Endpoint:** `GET /api/reports/generate`

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "_id": "report_id",
      "title": "Security Report",
      "type": "pdf",
      "status": "completed",
      "createdAt": "2026-02-02T10:30:00.000Z"
    }
  ]
}
```

---

## Frontend Integration

### Dashboard Integration

The feature is integrated into the dashboard's Quick Actions section:

**Location:** Dashboard Overview Tab → Quick Actions

**Buttons:**
1. **Generate Report** - Creates and downloads PDF report
2. **Export Data** - Exports security events as CSV

### Component Functions

```typescript
// Generate PDF Report
const handleGenerateReport = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Security Report',
      filters: {}
    }),
  });

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security_report_${Date.now()}.pdf`;
  a.click();
};

// Export CSV
const handleExportCSV = async () => {
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

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security_events_${Date.now()}.csv`;
  a.click();
};
```

### User Flow

1. **Login to Dashboard**
2. **Navigate to Overview Tab**
3. **Click "Generate Report" or "Export Data"**
4. **Report generates and downloads automatically**
5. **Check browser's download folder**

---

## Database Models

### Report Model

**File:** `/models/Report.ts`

**Schema:**
```typescript
{
  userId: ObjectId,
  title: string,
  description?: string,
  type: 'pdf' | 'csv' | 'json',
  status: 'pending' | 'generating' | 'completed' | 'failed',
  data?: any,
  filePath?: string,
  templateId?: string,
  schedule?: {
    enabled: boolean,
    frequency: 'daily' | 'weekly' | 'monthly',
    dayOfWeek?: number,
    dayOfMonth?: number,
    time: string,
    lastRun?: Date,
    nextRun?: Date
  },
  filters?: {
    dateRange?: { start: Date, end: Date },
    severity?: string[],
    eventTypes?: string[]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### ReportTemplate Model

**File:** `/models/ReportTemplate.ts`

**Schema:**
```typescript
{
  userId: ObjectId,
  name: string,
  description?: string,
  isPublic: boolean,
  sections: [{
    id: string,
    title: string,
    type: 'metrics' | 'events' | 'charts' | 'custom',
    enabled: boolean,
    config?: any
  }],
  styling?: {
    primaryColor?: string,
    fontFamily?: string,
    fontSize?: number,
    headerLogo?: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## Usage Examples

### Example 1: Generate Monthly Report

```javascript
const generateMonthlyReport = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'January 2026 Security Report',
      filters: {
        dateRange: {
          start: '2026-01-01',
          end: '2026-01-31'
        },
        severity: ['critical', 'high']
      }
    }),
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'january_report.pdf';
    a.click();
  }
};
```

### Example 2: Schedule Weekly Report

```javascript
const scheduleWeeklyReport = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/reports/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Weekly Security Report',
      type: 'pdf',
      schedule: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        time: '09:00'
      }
    }),
  });

  const data = await response.json();
  console.log('Next run:', data.report.schedule.nextRun);
};
```

### Example 3: Create Custom Template

```javascript
const createTemplate = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/reports/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Critical Events Only',
      sections: [
        {
          id: 'critical',
          title: 'Critical Security Events',
          type: 'events',
          enabled: true,
          config: {
            severityFilter: ['critical']
          }
        }
      ],
      styling: {
        primaryColor: '#dc2626',
        fontSize: 12
      }
    }),
  });

  const data = await response.json();
  return data.template._id;
};
```

### Example 4: Export Data with Filters

```javascript
const exportFilteredData = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/reports/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      format: 'json',
      includeMetrics: true,
      filters: {
        severity: ['critical'],
        eventTypes: ['Brute Force Attack', 'Malware Detected'],
        dateRange: {
          start: '2026-02-01',
          end: '2026-02-02'
        }
      }
    }),
  });

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filtered_events.json';
  a.click();
};
```

---

## Dependencies

### NPM Packages
```json
{
  "jspdf": "^2.x",
  "jspdf-autotable": "^3.x",
  "json2csv": "^6.x",
  "node-cron": "^3.x",
  "@types/json2csv": "^5.x",
  "@types/node-cron": "^3.x"
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
app/
├── api/
│   └── reports/
│       ├── generate/route.ts      # PDF generation
│       ├── export/route.ts        # CSV/JSON export
│       ├── schedule/route.ts      # Scheduled reports
│       └── templates/route.ts     # Template management
├── dashboard/
│   └── page.tsx                   # Frontend integration
lib/
└── reportGenerator.ts             # Core utility functions
models/
├── Report.ts                      # Report database model
└── ReportTemplate.ts              # Template database model
```

---

## Error Handling

All API endpoints return standard error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Security Features

1. ✅ **Authentication Required** - All endpoints require valid JWT token
2. ✅ **User Isolation** - Users can only access their own reports
3. ✅ **Template Privacy** - Templates can be private or public
4. ✅ **Data Filtering** - Support for date range, severity, and event type filters
5. ✅ **Input Validation** - All inputs are validated before processing

---

## Testing

### Manual Testing via Dashboard

1. **Login** to your account
2. **Navigate** to Dashboard → Overview tab
3. **Click** "Generate Report" button
4. **Verify** PDF downloads automatically
5. **Click** "Export Data" button
6. **Verify** CSV downloads successfully
7. **Check** downloaded files in browser's download folder

### API Testing with cURL

```bash
# Generate PDF Report
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Report"}' \
  --output report.pdf

# Export CSV
curl -X POST http://localhost:3000/api/reports/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv"}' \
  --output events.csv

# Schedule Report
curl -X POST http://localhost:3000/api/reports/schedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Weekly Report",
    "type":"pdf",
    "schedule":{
      "enabled":true,
      "frequency":"weekly",
      "dayOfWeek":1,
      "time":"09:00"
    }
  }'
```

---

## Future Enhancements

### Planned Features
- 📧 **Email Delivery** - Send reports via email
- ☁️ **Cloud Storage** - Integration with S3, Google Drive
- 📈 **Charts & Graphs** - Visual data representation
- 📊 **Excel Export** - .xlsx format support
- 🔗 **Report Sharing** - Share reports with other users
- 🔔 **Webhook Notifications** - API webhooks for report events
- 🚀 **Background Processing** - Bull/Redis queue system
- 📱 **Mobile Optimization** - Responsive report viewing

---

## Troubleshooting

### Common Issues

**Issue:** PDF not downloading
- **Solution:** Check browser download settings, ensure token is valid

**Issue:** 401 Unauthorized error
- **Solution:** Logout and login again to get fresh token

**Issue:** Empty report generated
- **Solution:** Verify security events exist in database

**Issue:** CSV export fails
- **Solution:** Check network tab for error details, verify API endpoint

---

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Check network tab for API response details
4. Verify authentication token is valid

---

## Version History

**v1.0.0** (February 2, 2026)
- ✅ Initial release
- ✅ PDF report generation
- ✅ CSV/JSON export
- ✅ Scheduled reports
- ✅ Custom templates
- ✅ Frontend integration
- ✅ Complete documentation

---

**Last Updated:** February 2, 2026  
**Status:** Production Ready  
**Author:** BreachBuddy Development Team
