import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Scan from '../models/Scan.js';
import Domain from '../models/Domain.js';
import User from '../models/User.js';
import { checkPlanLimits } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import discoveryService from '../services/discoveryService.js';
import vulnerabilityService from '../services/vulnerabilityService.js';
import aiAnalysisService from '../services/aiAnalysisService.js';

const router = express.Router();

// Get all scans for user
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('domainId').optional().isMongoId().withMessage('Invalid domain ID'),
  query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled']),
  query('scanType').optional().isIn(['discovery', 'vulnerability', 'full', 'monitoring'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { page = 1, limit = 20, domainId, status, scanType } = req.query;
  
  const filter = { userId: req.user._id };
  
  if (domainId) filter.domainId = domainId;
  if (status) filter.status = status;
  if (scanType) filter.scanType = scanType;

  const scans = await Scan.find(filter)
    .populate('domainId', 'domain displayName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-discoveredData -vulnerabilities'); // Exclude large data for list view

  const total = await Scan.countDocuments(filter);

  res.json({
    success: true,
    data: {
      scans,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
}));

// Get single scan with full details
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid scan ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const scan = await Scan.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).populate('domainId', 'domain displayName');

  if (!scan) {
    return res.status(404).json({
      success: false,
      message: 'Scan not found'
    });
  }

  res.json({
    success: true,
    data: { scan }
  });
}));

// Start new scan
router.post('/start', [
  checkPlanLimits('scan'),
  body('domainId')
    .isMongoId()
    .withMessage('Valid domain ID is required'),
  body('scanType')
    .isIn(['discovery', 'vulnerability', 'full'])
    .withMessage('Invalid scan type'),
  body('enableAI')
    .optional()
    .isBoolean()
    .withMessage('EnableAI must be boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { domainId, scanType, enableAI = false } = req.body;

  // Check if user can use AI analysis
  if (enableAI && !req.user.planLimits.aiAnalysisEnabled) {
    return res.status(402).json({
      success: false,
      message: 'AI analysis not available in your plan'
    });
  }

  // Verify domain exists and belongs to user
  const domain = await Domain.findOne({
    _id: domainId,
    userId: req.user._id
  });

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found'
    });
  }

  // Check for existing running scan on this domain
  const existingRunningScans = await Scan.findOne({
    domainId: domainId,
    status: { $in: ['pending', 'running'] }
  });

  if (existingRunningScans) {
    return res.status(409).json({
      success: false,
      message: 'A scan is already running for this domain'
    });
  }

  // Create new scan
  const scan = new Scan({
    userId: req.user._id,
    domainId: domainId,
    scanType: scanType,
    status: 'pending',
    aiAnalysis: {
      enabled: enableAI
    },
    tools: {
      sublist3r: { used: false, version: '', duration: 0, results: 0 },
      amass: { used: false, version: '', duration: 0, results: 0 },
      shodan: { used: false, queriesUsed: 0, results: 0 },
      owaspZap: { used: false, version: '', duration: 0, alertsGenerated: 0 }
    },
    metadata: {
      startedAt: new Date(),
      triggeredBy: 'manual',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    }
  });

  await scan.save();

  // Update user's scan usage
  req.user.usage.scansThisMonth += 1;
  await req.user.save();

  // Update domain status
  domain.status = 'scanning';
  await domain.save();

  // Start scan asynchronously
  setImmediate(() => {
    executeScan(scan._id);
  });

  res.status(201).json({
    success: true,
    message: 'Scan started successfully',
    data: { 
      scanId: scan._id,
      status: scan.status,
      scanType: scan.scanType
    }
  });
}));

// Cancel running scan
router.post('/:id/cancel', [
  param('id').isMongoId().withMessage('Invalid scan ID')
], asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({
    _id: req.params.id,
    userId: req.user._id,
    status: { $in: ['pending', 'running'] }
  });

  if (!scan) {
    return res.status(404).json({
      success: false,
      message: 'Active scan not found'
    });
  }

  scan.status = 'cancelled';
  scan.metadata.completedAt = new Date();
  await scan.save();

  // Update domain status
  const domain = await Domain.findById(scan.domainId);
  if (domain) {
    domain.status = 'active';
    await domain.save();
  }

  res.json({
    success: true,
    message: 'Scan cancelled successfully'
  });
}));

// Get scan statistics for dashboard
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalScans,
    completedScans,
    recentScans,
    totalVulnerabilities,
    criticalVulnerabilities,
    scansByType
  ] = await Promise.all([
    Scan.countDocuments({ userId }),
    Scan.countDocuments({ userId, status: 'completed' }),
    Scan.countDocuments({ userId, createdAt: { $gte: thirtyDaysAgo } }),
    Scan.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$results.vulnerabilitiesFound' } } }
    ]),
    Scan.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$results.criticalVulnerabilities' } } }
    ]),
    Scan.aggregate([
      { $match: { userId } },
      { $group: { _id: '$scanType', count: { $sum: 1 } } }
    ])
  ]);

  const stats = {
    totalScans,
    completedScans,
    recentScans,
    totalVulnerabilities: totalVulnerabilities[0]?.total || 0,
    criticalVulnerabilities: criticalVulnerabilities[0]?.total || 0,
    scansByType: scansByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };

  res.json({
    success: true,
    data: { stats }
  });
}));

/**
 * Execute scan asynchronously
 */
async function executeScan(scanId) {
  let scan = null;
  let domain = null;

  try {
    // Get scan and domain data
    scan = await Scan.findById(scanId).populate('domainId');
    if (!scan) {
      logger.error('Scan not found:', scanId);
      return;
    }

    domain = scan.domainId;
    logger.info(`Starting ${scan.scanType} scan for ${domain.domain}`, { scanId, domain: domain.domain });

    // Update scan status
    scan.status = 'running';
    scan.progress = 10;
    await scan.save();

    let discoveryResults = null;
    let vulnerabilityResults = null;

    // Phase 1: Discovery (if needed)
    if (scan.scanType === 'discovery' || scan.scanType === 'full') {
      logger.info('Phase 1: API Discovery', { scanId, scanType: scan.scanType });
      scan.progress = 20;
      await scan.save();

      discoveryResults = await discoveryService.discoverAPIs(domain.domain);
      
      // Update scan with discovery results
      scan.discoveredData = discoveryResults;
      scan.results.discoveredSubdomains = discoveryResults.subdomains.length;
      scan.results.discoveredEndpoints = discoveryResults.endpoints.length;
      
      // Safely merge tools data
      if (discoveryResults.tools) {
        Object.keys(discoveryResults.tools).forEach(toolName => {
          if (scan.tools[toolName] && discoveryResults.tools[toolName]) {
            scan.tools[toolName] = { ...scan.tools[toolName], ...discoveryResults.tools[toolName] };
          }
        });
      }
      
      scan.progress = 50;
      await scan.save();

      // Update domain with new data
      discoveryResults.subdomains.forEach(subdomainData => {
        domain.addSubdomain(subdomainData);
      });

      discoveryResults.endpoints.forEach(endpointData => {
        domain.addEndpoint(endpointData);
      });

      await domain.save();
    }

    // Phase 2: Vulnerability Scanning (if needed)
    if (scan.scanType === 'vulnerability' || scan.scanType === 'full') {
      console.log('🔒 Phase 2: Vulnerability Scanning');
      scan.progress = 60;
      await scan.save();

      const endpointsToScan = scan.scanType === 'full' ? 
        discoveryResults?.endpoints || [] : 
        domain.getActiveEndpoints();

      if (endpointsToScan.length > 0) {
        vulnerabilityResults = await vulnerabilityService.scanVulnerabilities(endpointsToScan);
        
        // Update scan with vulnerability results
        scan.vulnerabilities = vulnerabilityResults.vulnerabilities;
        
        // Safely merge tools data
        if (vulnerabilityResults.tools) {
          Object.keys(vulnerabilityResults.tools).forEach(toolName => {
            if (scan.tools[toolName] && vulnerabilityResults.tools[toolName]) {
              scan.tools[toolName] = { ...scan.tools[toolName], ...vulnerabilityResults.tools[toolName] };
            }
          });
        }
        
        scan.errors.push(...vulnerabilityResults.errors);
        scan.progress = 80;
        await scan.save();
      }
    }

    // Phase 3: AI Analysis (if enabled)
    if (scan.aiAnalysis.enabled && scan.vulnerabilities.length > 0) {
      logger.info('Phase 3: AI Risk Analysis', { scanId, vulnerabilitiesCount: scan.vulnerabilities.length });
      scan.progress = 90;
      await scan.save();

      try {
        const aiAnalysis = await aiAnalysisService.analyzeVulnerabilities(
          scan.vulnerabilities,
          domain,
          scan
        );
        
        scan.aiAnalysis = { ...scan.aiAnalysis, ...aiAnalysis };
        await scan.save();
      } catch (error) {
        logger.error('AI analysis failed', { scanId, error: error.message });
        scan.errors.push({
          message: `AI analysis failed: ${error.message}`,
          tool: 'ai-analysis'
        });
      }
    }

    // Complete scan
    scan.markCompleted();
    await scan.save();

    // Update domain status and statistics
    domain.status = 'active';
    domain.statistics.lastScanDate = new Date();
    domain.statistics.totalScans += 1;
    await domain.save();

    logger.info(`Scan completed for ${domain.domain}`, { scanId, domain: domain.domain, vulnerabilitiesFound: scan.results.vulnerabilitiesFound });

    // TODO: Send notifications if enabled
    // await sendNotifications(scan, domain);

  } catch (error) {
    logger.error('Scan execution failed', { scanId, error: error.message });

    if (scan) {
      scan.status = 'failed';
      scan.progress = 100;
      scan.metadata.completedAt = new Date();
      scan.errors.push({
        message: `Scan failed: ${error.message}`,
        tool: 'scan-executor'
      });
      await scan.save();
    }

    if (domain) {
      domain.status = 'error';
      await domain.save();
    }
  }
}

export default router;
