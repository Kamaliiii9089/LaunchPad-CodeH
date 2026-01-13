import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Domain from '../models/Domain.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all domains
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;
  
  const filter = {};
  
  if (search) {
    filter.$or = [
      { domain: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status) {
    filter.status = status;
  }

  const domains = await Domain.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-subdomains -endpoints'); // Exclude large arrays for list view

  const total = await Domain.countDocuments(filter);

  res.json({
    success: true,
    data: {
      domains,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
}));

// Get single domain with full details
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid domain ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const domain = await Domain.findOne({
    _id: req.params.id
  });

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found'
    });
  }

  res.json({
    success: true,
    data: domain
  });
}));

// Add new domain
router.post('/', [
  body('domain')
    .isLength({ min: 1 })
    .withMessage('Domain is required')
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/)
    .withMessage('Invalid domain format'),
  body('displayName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Display name too long'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { domain: domainName, displayName, tags, notes } = req.body;

  // Check if domain already exists
  const existingDomain = await Domain.findOne({
    domain: domainName.toLowerCase()
  });

  if (existingDomain) {
    return res.status(400).json({
      success: false,
      message: 'Domain already exists'
    });
  }

  // Create new domain
  const domain = new Domain({
    domain: domainName.toLowerCase(),
    displayName: displayName || domainName,
    tags: tags || [],
    notes: notes || ''
  });

  await domain.save();

  res.status(201).json({
    success: true,
    message: 'Domain added successfully',
    data: { domain }
  });
}));

// Update domain
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid domain ID'),
  body('displayName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Display name too long'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes too long'),
  body('monitoringSettings.enabled')
    .optional()
    .isBoolean()
    .withMessage('Monitoring enabled must be boolean'),
  body('monitoringSettings.frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid monitoring frequency')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const allowedUpdates = ['displayName', 'tags', 'notes', 'monitoringSettings'];
  const updates = {};
  
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const domain = await Domain.findOneAndUpdate(
    { _id: req.params.id },
    updates,
    { new: true, runValidators: true }
  );

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found'
    });
  }

  res.json({
    success: true,
    message: 'Domain updated successfully',
    data: { domain }
  });
}));

// Delete domain
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid domain ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const domain = await Domain.findOneAndDelete({
    _id: req.params.id
  });

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found'
    });
  }

  res.json({
    success: true,
    message: 'Domain deleted successfully'
  });
}));

// Get domain statistics
router.get('/:id/stats', [
  param('id').isMongoId().withMessage('Invalid domain ID')
], asyncHandler(async (req, res) => {
  const domain = await Domain.findOne({
    _id: req.params.id
  });

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found'
    });
  }

  const stats = {
    totalSubdomains: domain.subdomains.filter(s => s.isActive).length,
    totalEndpoints: domain.endpoints.filter(e => e.isActive).length,
    publicEndpoints: domain.endpoints.filter(e => e.isActive && e.isPublic).length,
    authenticatedEndpoints: domain.endpoints.filter(e => e.isActive && e.requiresAuth).length,
    httpEndpoints: domain.endpoints.filter(e => e.isActive && e.url.startsWith('http://')).length,
    httpsEndpoints: domain.endpoints.filter(e => e.isActive && e.url.startsWith('https://')).length,
    zombieEndpoints: domain.getZombieEndpoints().length,
    lastScanDate: domain.statistics.lastScanDate,
    totalScans: domain.statistics.totalScans
  };

  res.json({
    success: true,
    data: { stats }
  });
}));

// Get domain endpoints with filtering
router.get('/:id/endpoints', [
  param('id').isMongoId().withMessage('Invalid domain ID'),
  query('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']),
  query('isPublic').optional().isBoolean(),
  query('requiresAuth').optional().isBoolean(),
  query('search').optional().isLength({ max: 100 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { method, isPublic, requiresAuth, search, page = 1, limit = 50 } = req.query;

  const domain = await Domain.findOne({
    _id: req.params.id
  }).select('endpoints');

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found'
    });
  }

  let endpoints = domain.endpoints.filter(e => e.isActive);

  // Apply filters
  if (method) {
    endpoints = endpoints.filter(e => e.method === method);
  }
  
  if (isPublic !== undefined) {
    endpoints = endpoints.filter(e => e.isPublic === (isPublic === 'true'));
  }
  
  if (requiresAuth !== undefined) {
    endpoints = endpoints.filter(e => e.requiresAuth === (requiresAuth === 'true'));
  }
  
  if (search) {
    endpoints = endpoints.filter(e => 
      e.url.toLowerCase().includes(search.toLowerCase()) ||
      e.path.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Pagination
  const total = endpoints.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedEndpoints = endpoints.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      endpoints: paginatedEndpoints,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    }
  });
}));

export default router;
