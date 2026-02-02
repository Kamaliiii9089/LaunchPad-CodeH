import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Parser } from 'json2csv';

export interface SecurityEvent {
  id?: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'investigating';
}

export interface ReportData {
  title: string;
  generatedDate: string;
  userName: string;
  userEmail: string;
  metrics: {
    totalThreatsBlocked: number;
    activeVulnerabilities: number;
    systemHealth: number;
    activeMonitors: number;
  };
  events: SecurityEvent[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface TemplateConfig {
  sections: {
    id: string;
    title: string;
    type: 'metrics' | 'events' | 'charts' | 'custom';
    enabled: boolean;
  }[];
  styling?: {
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: number;
  };
}

/**
 * Generate PDF report with security data
 */
export function generatePDFReport(data: ReportData, template?: TemplateConfig): Buffer {
  const doc = new jsPDF();
  const primaryColor = template?.styling?.primaryColor || '#2563eb';
  
  // Set font
  doc.setFont('helvetica');
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text('BreachBuddy Security Report', 14, 20);
  
  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${data.generatedDate}`, 14, 28);
  doc.text(`User: ${data.userName} (${data.userEmail})`, 14, 33);
  
  if (data.dateRange) {
    doc.text(`Period: ${data.dateRange.start} - ${data.dateRange.end}`, 14, 38);
  }
  
  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 42, 196, 42);
  
  let yPosition = 50;
  
  // Check if metrics section is enabled
  const metricsSection = template?.sections?.find(s => s.type === 'metrics');
  if (!metricsSection || metricsSection.enabled !== false) {
    // Summary Metrics
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', 14, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    const metrics = [
      ['Total Threats Blocked', data.metrics.totalThreatsBlocked.toLocaleString()],
      ['Active Vulnerabilities', data.metrics.activeVulnerabilities.toString()],
      ['System Health', `${data.metrics.systemHealth}%`],
      ['Active Monitors', data.metrics.activeMonitors.toString()],
    ];
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: metrics,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Check if events section is enabled
  const eventsSection = template?.sections?.find(s => s.type === 'events');
  if (!eventsSection || eventsSection.enabled !== false) {
    // Security Events
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Security Events', 14, yPosition);
    yPosition += 10;
    
    const eventRows = data.events.map((event) => [
      event.type,
      event.severity.toUpperCase(),
      event.status,
      event.timestamp,
      event.description.length > 60 
        ? event.description.substring(0, 60) + '...' 
        : event.description,
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Type', 'Severity', 'Status', 'Time', 'Description']],
      body: eventRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        // Color code severity
        if (data.column.index === 1 && data.row.section === 'body') {
          const severity = data.cell.text[0]?.toLowerCase();
          if (severity === 'critical') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (severity === 'high') {
            data.cell.styles.textColor = [234, 88, 12]; // Orange
            data.cell.styles.fontStyle = 'bold';
          } else if (severity === 'medium') {
            data.cell.styles.textColor = [202, 138, 4]; // Yellow
          }
        }
      },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'BreachBuddy - Cybersecurity Dashboard',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }
  
  // Return buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate CSV export
 */
export function generateCSVExport(events: SecurityEvent[]): string {
  const fields = ['id', 'type', 'severity', 'description', 'timestamp', 'status'];
  const parser = new Parser({ fields });
  return parser.parse(events);
}

/**
 * Generate JSON export
 */
export function generateJSONExport(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Get sample security events (replace with actual database query)
 */
export function getSampleSecurityEvents(): SecurityEvent[] {
  return [
    {
      id: 1,
      type: 'Brute Force Attack',
      severity: 'critical',
      description: 'Multiple failed login attempts detected from IP 192.168.1.100',
      timestamp: new Date().toISOString(),
      status: 'investigating',
    },
    {
      id: 2,
      type: 'Malware Detected',
      severity: 'high',
      description: 'Suspicious file activity in /system/temp/',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'active',
    },
    {
      id: 3,
      type: 'Unauthorized Access',
      severity: 'high',
      description: 'Attempt to access restricted directory',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      status: 'resolved',
    },
    {
      id: 4,
      type: 'Port Scan',
      severity: 'medium',
      description: 'Port scanning activity from external IP',
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      status: 'resolved',
    },
    {
      id: 5,
      type: 'SSL Certificate',
      severity: 'low',
      description: 'SSL certificate expiring in 30 days',
      timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
      status: 'active',
    },
  ];
}

/**
 * Calculate next run time for scheduled reports
 */
export function calculateNextRun(
  frequency: 'daily' | 'weekly' | 'monthly',
  time: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  let nextRun = new Date();
  
  nextRun.setHours(hours, minutes, 0, 0);
  
  if (frequency === 'daily') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const currentDay = nextRun.getDay();
    let daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
    
    if (daysUntilNext === 0 && nextRun <= now) {
      daysUntilNext = 7;
    }
    
    nextRun.setDate(nextRun.getDate() + daysUntilNext);
  } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
    nextRun.setDate(dayOfMonth);
    
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
    
    // Handle months with fewer days
    if (nextRun.getDate() !== dayOfMonth) {
      nextRun.setDate(0); // Last day of previous month
    }
  }
  
  return nextRun;
}
