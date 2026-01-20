import express from 'express';
import { param, query, validationResult } from 'express-validator';
import Scan from '../models/Scan.js';
import Domain from '../models/Domain.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Generate vulnerability report for a scan
router.get('/scan/:scanId', [
  param('scanId').isMongoId().withMessage('Invalid scan ID'),
  query('format').optional().isIn(['json', 'pdf', 'csv']).withMessage('Invalid format')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { format = 'json' } = req.query;
  
  const scan = await Scan.findOne({
    _id: req.params.scanId,
    userId: req.user._id
  }).populate('domainId', 'domain displayName');

  if (!scan) {
    return res.status(404).json({
      success: false,
      message: 'Scan not found'
    });
  }

  const report = await generateScanReport(scan, format);

  if (format === 'json') {
    res.json({
      success: true,
      data: { report }
    });
  } else {
    // For PDF/CSV, return file download
    res.setHeader('Content-Disposition', `attachment; filename="scan-report-${scan._id}.${format}"`);
    res.setHeader('Content-Type', getContentType(format));
    res.send(report);
  }
}));

// Generate domain summary report
router.get('/domain/:domainId', [
  param('domainId').isMongoId().withMessage('Invalid domain ID'),
  query('format').optional().isIn(['json', 'pdf', 'csv']).withMessage('Invalid format'),
  query('includeScans').optional().isInt({ min: 1, max: 10 }).withMessage('Include scans must be 1-10')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { format = 'json', includeScans = 5 } = req.query;
  
  const domain = await Domain.findOne({
    _id: req.params.domainId,
    userId: req.user._id
  });

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found'
    });
  }

  // Get recent scans for this domain
  const recentScans = await Scan.find({
    domainId: req.params.domainId,
    userId: req.user._id,
    status: 'completed'
  }).sort({ createdAt: -1 }).limit(parseInt(includeScans));

  const report = await generateDomainReport(domain, recentScans, format);

  if (format === 'json') {
    res.json({
      success: true,
      data: { report }
    });
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="domain-report-${domain.domain}.${format}"`);
    res.setHeader('Content-Type', getContentType(format));
    res.send(report);
  }
}));

// Generate executive summary report
router.get('/executive-summary', [
  query('format').optional().isIn(['json', 'pdf']).withMessage('Invalid format'),
  query('period').optional().isIn(['week', 'month', 'quarter']).withMessage('Invalid period')
], asyncHandler(async (req, res) => {
  const { format = 'json', period = 'month' } = req.query;
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
  }

  // Get user's domains and scans in the period
  const [domains, scans] = await Promise.all([
    Domain.find({ userId: req.user._id }),
    Scan.find({
      userId: req.user._id,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('domainId', 'domain displayName')
  ]);

  const report = await generateExecutiveSummary(domains, scans, period);

  if (format === 'json') {
    res.json({
      success: true,
      data: { report }
    });
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="executive-summary-${period}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(report);
  }
}));

// Get vulnerability trends
router.get('/trends/vulnerabilities', [
  query('domainId').optional().isMongoId().withMessage('Invalid domain ID'),
  query('days').optional().isInt({ min: 7, max: 365 }).withMessage('Days must be 7-365')
], asyncHandler(async (req, res) => {
  const { domainId, days = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  
  const filter = {
    userId: req.user._id,
    status: 'completed',
    createdAt: { $gte: startDate }
  };
  
  if (domainId) {
    filter.domainId = domainId;
  }

  const scans = await Scan.find(filter)
    .select('createdAt results vulnerabilities')
    .sort({ createdAt: 1 });

  const trends = analyzeTrends(scans, parseInt(days));

  res.json({
    success: true,
    data: { trends }
  });
}));

/**
 * Generate detailed scan report
 */
async function generateScanReport(scan, format) {
  const report = {
    metadata: {
      reportType: 'Vulnerability Scan Report',
      domain: scan.domainId.domain,
      scanId: scan._id,
      scanType: scan.scanType,
      generatedAt: new Date().toISOString(),
      scanDate: scan.createdAt.toISOString(),
      duration: scan.getDuration()
    },
    summary: {
      totalVulnerabilities: scan.results.vulnerabilitiesFound,
      severityBreakdown: {
        critical: scan.results.criticalVulnerabilities,
        high: scan.results.highVulnerabilities,
        medium: scan.results.mediumVulnerabilities,
        low: scan.results.lowVulnerabilities
      },
      discoveredAssets: {
        subdomains: scan.results.discoveredSubdomains,
        endpoints: scan.results.discoveredEndpoints
      }
    },
    vulnerabilities: scan.vulnerabilities.map(vuln => ({
      title: vuln.title,
      severity: vuln.severity,
      type: vuln.type,
      description: vuln.description,
      recommendation: vuln.recommendation,
      cweId: vuln.cweId,
      cvssScore: vuln.cvssScore,
      evidence: vuln.evidence
    })),
    tools: scan.tools,
    aiAnalysis: scan.aiAnalysis.enabled ? {
      riskScore: scan.aiAnalysis.riskScore,
      executiveSummary: scan.aiAnalysis.executiveSummary,
      topRecommendations: scan.aiAnalysis.topRecommendations
    } : null
  };

  if (format === 'csv') {
    return generateCSVReport(report);
  }

  return report;
}

/**
 * Generate domain summary report
 */
async function generateDomainReport(domain, recentScans, format) {
  const latestScan = recentScans[0];
  
  const report = {
    metadata: {
      reportType: 'Domain Security Report',
      domain: domain.domain,
      displayName: domain.displayName,
      generatedAt: new Date().toISOString(),
      reportPeriod: recentScans.length > 0 ? {
        from: recentScans[recentScans.length - 1].createdAt,
        to: recentScans[0].createdAt
      } : null
    },
    currentState: {
      status: domain.status,
      totalSubdomains: domain.statistics.totalSubdomains,
      totalEndpoints: domain.statistics.totalEndpoints,
      publicEndpoints: domain.statistics.publicEndpoints,
      lastScanDate: domain.statistics.lastScanDate,
      zombieEndpoints: domain.getZombieEndpoints().length
    },
    latestFindings: latestScan ? {
      scanDate: latestScan.createdAt,
      totalVulnerabilities: latestScan.results.vulnerabilitiesFound,
      criticalVulnerabilities: latestScan.results.criticalVulnerabilities,
      highVulnerabilities: latestScan.results.highVulnerabilities,
      riskScore: latestScan.aiAnalysis?.riskScore || latestScan.calculateRiskScore()
    } : null,
    scanHistory: recentScans.map(scan => ({
      id: scan._id,
      date: scan.createdAt,
      type: scan.scanType,
      vulnerabilities: scan.results.vulnerabilitiesFound,
      riskScore: scan.aiAnalysis?.riskScore || scan.calculateRiskScore()
    })),
    recommendations: latestScan?.aiAnalysis?.topRecommendations || []
  };

  return report;
}

/**
 * Generate executive summary
 */
async function generateExecutiveSummary(domains, scans, period) {
  const totalVulns = scans.reduce((sum, scan) => sum + scan.results.vulnerabilitiesFound, 0);
  const criticalVulns = scans.reduce((sum, scan) => sum + scan.results.criticalVulnerabilities, 0);
  const highVulns = scans.reduce((sum, scan) => sum + scan.results.highVulnerabilities, 0);

  // Calculate average risk score
  const scansWithRisk = scans.filter(s => s.aiAnalysis?.riskScore || s.results.vulnerabilitiesFound > 0);
  const avgRiskScore = scansWithRisk.length > 0 ? 
    scansWithRisk.reduce((sum, scan) => sum + (scan.aiAnalysis?.riskScore || scan.calculateRiskScore()), 0) / scansWithRisk.length : 0;

  // Determine overall security posture
  let securityPosture = 'Good';
  if (criticalVulns > 0 || avgRiskScore > 7) {
    securityPosture = 'Poor';
  } else if (highVulns > 5 || avgRiskScore > 5) {
    securityPosture = 'Fair';
  }

  // Get user to fetch organization name
  const user = await User.findById(req.user._id);

  return {
    metadata: {
      reportType: 'Executive Security Summary',
      period: period,
      generatedAt: new Date().toISOString(),
      organizationName: user.organizationName || 'Your Organization'
    },
    overview: {
      totalDomains: domains.length,
      totalScans: scans.length,
      securityPosture: securityPosture,
      overallRiskScore: Math.round(avgRiskScore * 10) / 10
    },
    keyFindings: {
      totalVulnerabilities: totalVulns,
      criticalVulnerabilities: criticalVulns,
      highPriorityVulnerabilities: highVulns,
      domainsAtRisk: domains.filter(d => {
        const domainScans = scans.filter(s => s.domainId.equals(d._id));
        return domainScans.some(s => s.results.criticalVulnerabilities > 0 || s.results.highVulnerabilities > 2);
      }).length
    },
    topRisks: getTopRisks(scans),
    recommendations: getExecutiveRecommendations(securityPosture, criticalVulns, highVulns),
    domainSummary: domains.map(domain => {
      const domainScans = scans.filter(s => s.domainId.equals(domain._id));
      const latestScan = domainScans[0];
      
      return {
        domain: domain.domain,
        riskLevel: getRiskLevel(latestScan),
        lastScanned: latestScan?.createdAt,
        vulnerabilities: latestScan?.results.vulnerabilitiesFound || 0
      };
    })
  };
}

/**
 * Get top risks across all scans
 */
function getTopRisks(scans) {
  const riskCounts = {};
  
  scans.forEach(scan => {
    scan.vulnerabilities.forEach(vuln => {
      if (vuln.severity === 'critical' || vuln.severity === 'high') {
        const key = vuln.type;
        riskCounts[key] = (riskCounts[key] || 0) + 1;
      }
    });
  });

  return Object.entries(riskCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({
      riskType: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      occurrences: count,
      impact: count > 5 ? 'High' : count > 2 ? 'Medium' : 'Low'
    }));
}

/**
 * Get executive recommendations
 */
function getExecutiveRecommendations(posture, critical, high) {
  const recommendations = [];
  
  if (critical > 0) {
    recommendations.push('Immediate action required: Address all critical vulnerabilities within 24-48 hours');
  }
  
  if (high > 0) {
    recommendations.push('High priority: Fix high-severity vulnerabilities within 1 week');
  }
  
  recommendations.push('Implement regular automated security scanning');
  recommendations.push('Establish security monitoring and alerting procedures');
  
  if (posture === 'Poor') {
    recommendations.push('Consider engaging external security consultants for immediate assessment');
  }
  
  return recommendations;
}

/**
 * Get risk level for a domain
 */
function getRiskLevel(scan) {
  if (!scan) return 'Unknown';
  
  if (scan.results.criticalVulnerabilities > 0) return 'Critical';
  if (scan.results.highVulnerabilities > 2) return 'High';
  if (scan.results.highVulnerabilities > 0 || scan.results.mediumVulnerabilities > 5) return 'Medium';
  return 'Low';
}

/**
 * Analyze vulnerability trends
 */
function analyzeTrends(scans, days) {
  // Group scans by day
  const dailyData = {};
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = {
      date: dateKey,
      scans: 0,
      vulnerabilities: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
  }

  // Fill in actual data
  scans.forEach(scan => {
    const dateKey = scan.createdAt.toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].scans += 1;
      dailyData[dateKey].vulnerabilities += scan.results.vulnerabilitiesFound;
      dailyData[dateKey].critical += scan.results.criticalVulnerabilities;
      dailyData[dateKey].high += scan.results.highVulnerabilities;
      dailyData[dateKey].medium += scan.results.mediumVulnerabilities;
      dailyData[dateKey].low += scan.results.lowVulnerabilities;
    }
  });

  return Object.values(dailyData);
}

/**
 * Generate CSV report
 */
function generateCSVReport(report) {
  const headers = [
    'Vulnerability Title',
    'Severity',
    'Type',
    'Description',
    'Recommendation',
    'CWE ID',
    'CVSS Score',
    'Evidence Location'
  ];

  const rows = report.vulnerabilities.map(vuln => [
    `"${vuln.title}"`,
    vuln.severity,
    vuln.type,
    `"${vuln.description}"`,
    `"${vuln.recommendation}"`,
    vuln.cweId || '',
    vuln.cvssScore || '',
    `"${vuln.evidence?.location || ''}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Get content type for file format
 */
function getContentType(format) {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv';
    default:
      return 'application/json';
  }
}

export default router;
