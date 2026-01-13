import express from 'express';
import { body, validationResult } from 'express-validator';
import Scan from '../models/Scan.js';
import Domain from '../models/Domain.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Slack webhook endpoint for notifications
router.post('/slack', [
  body('token').optional().isString(),
  body('challenge').optional().isString(),
  body('event').optional().isObject()
], asyncHandler(async (req, res) => {
  const { token, challenge, event } = req.body;

  // Handle URL verification challenge
  if (challenge) {
    return res.json({ challenge });
  }

  // Handle actual webhook events
  if (event) {
    // Process Slack webhook event
    console.log('Received Slack webhook event:', event);
  }

  res.json({ success: true });
}));

// Generic webhook endpoint for third-party integrations
router.post('/generic', [
  body('event_type').isString().withMessage('Event type is required'),
  body('data').isObject().withMessage('Event data is required')
], asyncHandler(async (req, res) => {
  const { event_type, data } = req.body;

  // Process webhook based on event type
  switch (event_type) {
    case 'scan_completed':
      await handleScanCompletedWebhook(data);
      break;
    case 'vulnerability_found':
      await handleVulnerabilityWebhook(data);
      break;
    case 'domain_added':
      await handleDomainWebhook(data);
      break;
    default:
      console.log(`Unknown webhook event type: ${event_type}`);
  }

  res.json({
    success: true,
    message: 'Webhook processed successfully'
  });
}));

// Test webhook endpoint (for development)
router.post('/test', asyncHandler(async (req, res) => {
  console.log('Test webhook received:', req.body);
  
  res.json({
    success: true,
    message: 'Test webhook received',
    timestamp: new Date().toISOString(),
    data: req.body
  });
}));

/**
 * Handle scan completed webhook
 */
async function handleScanCompletedWebhook(data) {
  try {
    const { scanId, vulnerabilities, riskScore } = data;
    
    console.log('Scan completed webhook:', { scanId, vulnerabilities, riskScore });
    
    // Additional processing can be added here
  } catch (error) {
    console.error('Failed to handle scan completed webhook:', error);
  }
}

/**
 * Handle vulnerability found webhook
 */
async function handleVulnerabilityWebhook(data) {
  try {
    const { severity, title, domain } = data;
    
    console.log('Vulnerability webhook:', { severity, title, domain });
    
    // Additional processing can be added here
  } catch (error) {
    console.error('Failed to handle vulnerability webhook:', error);
  }
}

/**
 * Handle domain added webhook
 */
async function handleDomainWebhook(data) {
  try {
    const { domain } = data;
    
    console.log(`New domain ${domain} added`);
    
    // Could trigger initial scan or other actions
    // For now, just log the event
  } catch (error) {
    console.error('Failed to handle domain webhook:', error);
  }
}

export default router;
