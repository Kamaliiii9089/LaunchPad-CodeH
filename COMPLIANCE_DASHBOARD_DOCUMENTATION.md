# Compliance Dashboard Documentation

## 📋 Overview

The **Compliance Dashboard** is a centralized system for monitoring, tracking, and reporting regulatory compliance across multiple frameworks including **GDPR**, **HIPAA**, **PCI DSS**, **SOC 2**, **ISO 27001**, **CCPA**, and **NIST**.

## 🎯 Key Features

### 🌍 GDPR Compliance Tracking
- Monitor privacy controls and data protection measures
- Track data subject rights management
- Maintain consent records and cookie compliance
- Generate GDPR-specific compliance reports

### 🏥 HIPAA Audit Logs
- Detailed audit trail for all compliance activities
- Track PHI access and modifications
- 7-year default retention period for audit logs
- Immutable audit log entries with integrity verification
- User attribution with IP address and device tracking

### 💳 PCI DSS Requirement Monitoring
- Track all 12 PCI DSS requirements
- Monitor security controls for payment data
- Validate network segmentation and encryption
- Quarterly compliance assessments

### 📊 SOC 2 Control Mapping
- Map system controls to SOC 2 trust principles
- Track control implementation and effectiveness
- Continuous monitoring and testing
- Evidence collection and documentation

### 📈 Automated Compliance Reports
- Executive summary reports with key findings
- Gap analysis reports with remediation plans
- Audit readiness reports with evidence summaries
- Trend analysis reports tracking compliance over time
- Export to PDF, Excel, JSON, and HTML formats

## 🏗️ System Architecture

### Database Models

#### 1. ComplianceFramework
Represents regulatory frameworks (GDPR, HIPAA, etc.)

```typescript
interface IComplianceFramework {
  name: string;
  code: 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'SOC2' | 'ISO27001' | 'CCPA' | 'NIST';
  version: string;
  effectiveDate: Date;
  category: 'privacy' | 'healthcare' | 'financial' | 'security' | 'general';
  overallComplianceScore: number; // 0-100
  requirementsMet: number;
  requirementsPending: number;
  requirementsFailed: number;
  lastAssessmentDate?: Date;
  nextAssessmentDue?: Date;
}
```

**Key Features:**
- Tracks overall compliance score (0-100%)
- Counts requirements by status (met, pending, failed)
- Supports multiple jurisdictions
- Links to certification bodies
- Penalty and deadline tracking

#### 2. ComplianceRequirement
Individual requirements within each framework

```typescript
interface IComplianceRequirement {
  frameworkId: ObjectId;
  requirementId: string; // e.g., "GDPR-Art-32", "HIPAA-164.308"
  title: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable' | 'in_progress';
  compliancePercentage: number; // 0-100
  controls: ObjectId[]; // Links to ComplianceControl
  evidence: {
    type: 'document' | 'screenshot' | 'log' | 'certificate';
    url: string;
    verified: boolean;
  }[];
  remediationPlan?: {
    description: string;
    steps: string[];
    assignedTo: ObjectId;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed';
  };
}
```

**Key Features:**
- Links requirements to controls
- Tracks compliance percentage
- Stores evidence with verification status
- Maintains compliance history
- Supports remediation planning

#### 3. ComplianceControl
Security controls mapped to requirements

```typescript
interface IComplianceControl {
  controlId: string; // e.g., "AC-001", "ENC-002"
  name: string;
  category: 'access_control' | 'encryption' | 'audit_logging' | 'network_security';
  type: 'preventive' | 'detective' | 'corrective' | 'compensating';
  status: 'implemented' | 'partial' | 'planned' | 'not_implemented';
  effectiveness: 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';
  effectivenessScore: number; // 0-100
  frameworks: {
    frameworkId: ObjectId;
    requirementIds: ObjectId[];
    mappedRequirements: string[]; // e.g., ["GDPR-Art-32", "HIPAA-164.308"]
  }[];
  testResults: {
    date: Date;
    tester: ObjectId;
    result: 'passed' | 'failed' | 'partial';
    findings: string;
    evidence: string[];
  }[];
}
```

**Key Features:**
- Maps to multiple frameworks and requirements
- Tracks implementation and effectiveness
- Stores test results with evidence
- Supports automated and manual controls
- Gap identification and remediation tracking

#### 4. ComplianceAuditLog
Immutable audit trail for compliance activities

```typescript
interface IComplianceAuditLog {
  eventType: 'assessment' | 'control_test' | 'requirement_update' | 'evidence_upload';
  action: string;
  description: string;
  userId: ObjectId;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  frameworkId?: ObjectId;
  requirementId?: ObjectId;
  complianceImpact: {
    affected: boolean;
    impactLevel?: 'critical' | 'high' | 'medium' | 'low';
  };
  status: 'success' | 'failure' | 'partial';
  timestamp: Date;
  retentionPeriod: number; // Default: 2555 days (7 years)
}
```

**Key Features:**
- Immutable entries (cannot be modified after creation)
- Comprehensive user tracking
- Compliance impact analysis
- Automatic retention management
- Hash-based integrity verification

#### 5. ComplianceReport
Generated compliance reports

```typescript
interface IComplianceReport {
  reportId: string;
  reportType: 'full_assessment' | 'gap_analysis' | 'audit_readiness' | 'certification';
  frameworks: ObjectId[];
  executiveSummary: {
    overallScore: number;
    complianceLevel: 'excellent' | 'good' | 'needs_improvement' | 'critical';
    keyFindings: string[];
    recommendations: string[];
  };
  frameworkAnalysis: {
    frameworkCode: string;
    complianceScore: number;
    requirementsTotal: number;
    requirementsMet: number;
    criticalGaps: number;
  }[];
  gaps: {
    requirementTitle: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    impact: string;
    recommendation: string;
  }[];
  exports: {
    format: 'pdf' | 'excel' | 'json' | 'html';
    url: string;
  }[];
}
```

## 🚀 Getting Started

### 1. Configure Compliance Frameworks

Navigate to **Dashboard → Compliance → Dashboard** and configure your frameworks:

```javascript
// Example: Adding GDPR framework
POST /api/compliance/frameworks
{
  "name": "General Data Protection Regulation",
  "code": "GDPR",
  "version": "2016/679",
  "effectiveDate": "2018-05-25",
  "jurisdiction": ["EU", "EEA"],
  "category": "privacy",
  "applicability": {
    "industryTypes": ["all"],
    "dataTypes": ["personal_data", "sensitive_data"]
  }
}
```

### 2. Add Requirements

Add specific requirements for each framework:

```javascript
// Example: GDPR Article 32 - Security of Processing
POST /api/compliance/requirements
{
  "frameworkId": "framework_id_here",
  "requirementId": "GDPR-Art-32",
  "title": "Security of Processing",
  "category": "Technical and Organizational Measures",
  "priority": "critical",
  "type": "technical",
  "mandatory": true,
  "evidenceRequired": [
    "Encryption policy",
    "Access control documentation",
    "Security testing reports"
  ]
}
```

### 3. Map Controls to Requirements

Link your security controls to compliance requirements:

```javascript
// Example: Encryption Control
POST /api/compliance/controls
{
  "controlId": "ENC-001",
  "name": "Data Encryption at Rest",
  "category": "encryption",
  "type": "preventive",
  "implementationType": "technical",
  "frameworks": [{
    "frameworkId": "framework_id_here",
    "requirementIds": ["requirement_id_here"],
    "mappedRequirements": ["GDPR-Art-32", "HIPAA-164.312"]
  }],
  "status": "implemented",
  "automationLevel": "fully-automated"
}
```

## 📊 Usage Examples

### Example 1: Assess a Requirement

```javascript
const token = localStorage.getItem('token');

const response = await fetch('/api/compliance/requirements/req_id/assess', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    status: 'compliant',
    compliancePercentage: 100,
    findings: 'All controls implemented and tested successfully.',
    recommendations: [
      'Schedule quarterly reviews',
      'Update documentation'
    ],
    evidence: [{
      type: 'document',
      name: 'Encryption Implementation Report',
      url: '/evidence/enc-report-2024.pdf',
      uploadedBy: user_id,
      uploadedAt: new Date()
    }]
  })
});
```

### Example 2: Test a Control

```javascript
const response = await fetch('/api/compliance/controls/ctrl_id/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    result: 'passed',
    findings: 'AES-256 encryption verified on all data stores.',
    evidence: [
      '/tests/encryption-test-Q1-2024.pdf',
      '/screenshots/encryption-verification.png'
    ],
    recommendations: [
      'Consider implementing key rotation automation'
    ]
  })
});
```

### Example 3: Generate Compliance Report

```javascript
const response = await fetch('/api/compliance/reports', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    reportType: 'full_assessment',
    frameworkIds: ['gdpr_id', 'hipaa_id'],
    startDate: '2024-01-01',
    endDate: '2024-03-31'
  })
});

const data = await response.json();
console.log('Overall Score:', data.report.executiveSummary.overallScore);
console.log('Critical Gaps:', data.report.gaps.filter(g => g.severity === 'critical').length);
```

### Example 4: Fetch Dashboard Statistics

```javascript
const response = await fetch('/api/compliance/dashboard?frameworkIds=gdpr_id,hipaa_id', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { stats } = await response.json();

console.log('Average Compliance Score:', stats.frameworks.averageScore);
console.log('Requirements Met:', stats.requirements.compliant);
console.log('Controls Needing Attention:', stats.controls.needsAttention);
```

## 🔌 API Reference

### Frameworks

#### `GET /api/compliance/frameworks`
List all compliance frameworks with optional filters.

**Query Parameters:**
- `category`: Filter by category (privacy, healthcare, financial, security)
- `status`: Filter by status (active, archived, pending)
- `code`: Filter by framework code (GDPR, HIPAA, etc.)

**Response:**
```json
{
  "success": true,
  "frameworks": [...],
  "count": 5
}
```

#### `POST /api/compliance/frameworks`
Create a new compliance framework.

#### `GET /api/compliance/frameworks/:id`
Get detailed information about a specific framework including compliance breakdown.

#### `PUT /api/compliance/frameworks/:id`
Update framework information.

#### `DELETE /api/compliance/frameworks/:id`
Archive a framework (soft delete).

#### `GET /api/compliance/frameworks/:id/gaps`
Identify compliance gaps for a specific framework.

### Requirements

#### `GET /api/compliance/requirements`
List all requirements with filters.

**Query Parameters:**
- `frameworkId`: Filter by framework
- `status`: Filter by compliance status
- `priority`: Filter by priority level
- `category`: Filter by category

#### `POST /api/compliance/requirements`
Create a new requirement.

#### `POST /api/compliance/requirements/:id/assess`
Conduct an assessment for a specific requirement.

**Request Body:**
```json
{
  "status": "compliant",
  "compliancePercentage": 95,
  "findings": "...",
  "recommendations": ["..."],
  "evidence": [...]
}
```

### Controls

#### `GET /api/compliance/controls`
List all security controls.

**Query Parameters:**
- `frameworkId`: Filter by framework
- `category`: Filter by control category
- `status`: Filter by implementation status
- `effectiveness`: Filter by effectiveness level

#### `POST /api/compliance/controls`
Create a new control.

#### `POST /api/compliance/controls/:id/test`
Test a control's effectiveness.

**Request Body:**
```json
{
  "result": "passed",
  "findings": "...",
  "evidence": ["..."],
  "recommendations": ["..."]
}
```

### Reports

#### `GET /api/compliance/reports`
List generated reports.

**Query Parameters:**
- `reportType`: Filter by report type
- `status`: Filter by report status

#### `POST /api/compliance/reports`
Generate a new compliance report.

**Request Body:**
```json
{
  "reportType": "full_assessment",
  "frameworkIds": ["..."],
  "startDate": "2024-01-01",
  "endDate": "2024-03-31"
}
```

#### `GET /api/compliance/reports/:id`
Get a specific report with all details.

### Audit Logs

#### `GET /api/compliance/audit-logs`
Retrieve audit logs with filters.

**Query Parameters:**
- `eventType`: Filter by event type
- `frameworkId`: Filter by framework
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `limit`: Maximum number of results (default: 100)

### Dashboard

#### `GET /api/compliance/dashboard`
Get dashboard statistics and metrics.

**Query Parameters:**
- `frameworkIds`: Comma-separated list of framework IDs (optional)

**Response:**
```json
{
  "success": true,
  "stats": {
    "frameworks": {
      "total": 5,
      "compliant": 2,
      "partial": 2,
      "critical": 1,
      "averageScore": 78
    },
    "requirements": {
      "total": 150,
      "compliant": 110,
      "pending": 25,
      "failed": 15
    },
    "controls": {
      "total": 200,
      "implemented": 180,
      "effective": 165,
      "needsAttention": 15
    },
    "recentActivity": {
      "assessments": 45,
      "controlTests": 32,
      "gapsIdentified": 12,
      "reportsGenerated": 3
    }
  }
}
```

## 🎨 UI Components

### 1. ComplianceDashboard
Main overview component showing all frameworks and key metrics.

**Features:**
- Framework cards with compliance scores
- Color-coded status indicators (green ≥90%, blue ≥75%, yellow ≥60%, red <60%)
- Key metrics summary
- Recent activity tracking
- Framework detail modal

**Usage:**
```tsx
import ComplianceDashboard from '@/components/ComplianceDashboard';

<ComplianceDashboard />
```

### 2. ComplianceRequirementTracker
Track and manage compliance requirements.

**Features:**
- Filterable requirement list
- Status and priority badges
- Compliance progress bars
- Control implementation tracking
- Assessment actions

**Usage:**
```tsx
import ComplianceRequirementTracker from '@/components/ComplianceRequirementTracker';

<ComplianceRequirementTracker />
```

### 3. ComplianceAuditLogViewer
View and filter compliance audit logs.

**Features:**
- Event type filtering
- Date range filtering
- User attribution display
- Compliance impact badges
- Detailed event information

**Usage:**
```tsx
import ComplianceAuditLogViewer from '@/components/ComplianceAuditLogViewer';

<ComplianceAuditLogViewer />
```

## 🔒 Security & Compliance Scoring

### Compliance Score Calculation

The overall compliance score for a framework is calculated as:

```
Overall Score = (Sum of all requirement compliance percentages) / (Total requirements)
```

### Framework Status Classification

- **Compliant** (90-100%): All critical requirements met, minimal gaps
- **Partial** (70-89%): Most requirements met, some gaps exist
- **Non-Compliant** (<70%): Significant gaps, immediate action required

### Control Effectiveness Scoring

Individual controls are scored 0-100 based on test results:
- **Passed**: 100%
- **Partial**: 60%
- **Failed**: 0%
- **Not Tested**: 0%

## 📈 Best Practices

### 1. Framework Setup
- Configure all applicable frameworks before adding requirements
- Set realistic next assessment due dates
- Assign framework owners and teams
- Document applicability criteria

### 2. Requirement Management
- Use consistent requirement IDs (e.g., "GDPR-Art-32")
- Link requirements to relevant controls
- Upload evidence immediately after assessment
- Schedule regular assessments based on requirement priority

### 3. Control Implementation
- Map each control to all applicable requirements
- Document technical implementation details
- Test controls at appropriate frequencies
- Maintain evidence of control effectiveness

### 4. Assessment Best Practices
- Conduct assessments quarterly for critical requirements
- Involve multiple stakeholders in assessments
- Document findings comprehensively
- Create remediation plans for non-compliant items

### 5. Audit Log Management
- Review audit logs regularly for anomalies
- Use filters to investigate specific activities
- Export logs for external audits
- Maintain 7-year retention for regulated industries

### 6. Report Generation
- Generate reports quarterly or before audits
- Share executive summaries with leadership
- Use technical reports for remediation planning
- Track trends over time with historical reports

## 🐛 Troubleshooting

### Issue 1: Compliance Score Not Updating

**Cause:** Requirements not linked to framework or controls not tested.

**Solution:**
```javascript
// Verify requirements are linked
GET /api/compliance/requirements?frameworkId=your_framework_id

// Recalculate compliance score
// Happens automatically after requirement assessment
POST /api/compliance/requirements/:id/assess
```

### Issue 2: Audit Logs Not Appearing

**Cause:** Authentication issues or database connection problems.

**Solution:**
- Verify JWT token is valid
- Check database connection
- Ensure user has proper permissions
- Review API logs for errors

### Issue 3: Report Generation Fails

**Cause:** No frameworks or requirements configured.

**Solution:**
1. Ensure at least one framework is active
2. Add requirements to the framework
3. Conduct initial assessments
4. Try generating report again

### Issue 4: Controls Not Affecting Requirements

**Cause:** Control not properly mapped to requirements.

**Solution:**
```javascript
// Update control with proper framework mapping
PUT /api/compliance/controls/:id
{
  "frameworks": [{
    "frameworkId": "framework_id",
    "requirementIds": ["req_id_1", "req_id_2"],
    "mappedRequirements": ["GDPR-Art-32", "HIPAA-164.312"]
  }]
}
```

## 🔐 Regulatory Standards Coverage

### GDPR (General Data Protection Regulation)
- **Articles Covered:** 5, 6, 25, 30, 32, 33, 34, 35, 37
- **Key Requirements:** Data protection by design, security of processing, breach notification
- **Audit Requirements:** Processing records, DPIAs, breach logs

### HIPAA (Health Insurance Portability and Accountability Act)
- **Rules Covered:** Privacy Rule, Security Rule, Breach Notification Rule
- **Key Standards:** 164.308 (Administrative), 164.310 (Physical), 164.312 (Technical)
- **Audit Requirements:** Access logs, PHI access tracking, 7-year retention

### PCI DSS (Payment Card Industry Data Security Standard)
- **Requirements:** All 12 requirements and sub-requirements
- **Key Controls:** Network security, encryption, access control, monitoring
- **Validation:** Quarterly scans, annual assessments

### SOC 2 (Service Organization Control 2)
- **Trust Principles:** Security, Availability, Processing Integrity, Confidentiality, Privacy
- **Controls:** CC (Common Criteria), Additional Criteria per principle
- **Reporting:** Type I (design), Type II (operating effectiveness)

### ISO 27001
- **Controls:** Annex A controls (114 total)
- **Categories:** Organizational, People, Physical, Technological
- **Certification:** Third-party audit and certification

## 📞 Support

For questions or issues with the Compliance Dashboard:

- **Email:** compliance@breachbuddy.com
- **Documentation:** https://docs.breachbuddy.com/compliance
- **Support Portal:** https://support.breachbuddy.com

## 🔄 Changelog

### Version 1.0.0 (March 2024)
- Initial release
- Support for GDPR, HIPAA, PCI DSS, SOC 2, ISO 27001, CCPA, NIST
- Automated compliance scoring
- Gap analysis and recommendations
- Comprehensive audit logging
- Multi-format report generation
- Dashboard with real-time metrics
