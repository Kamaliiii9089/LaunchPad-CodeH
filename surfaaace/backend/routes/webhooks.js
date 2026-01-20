import express from 'express';
import { body, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import Scan from '../models/Scan.js';
import Domain from '../models/Domain.js';
import User from '../models/User.js';
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
router.post('/generic/:userId', [
  body('event_type').isString().withMessage('Event type is required'),
  body('data').isObject().withMessage('Event data is required')
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { event_type, data } = req.body;

  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Process webhook based on event type
  switch (event_type) {
    case 'scan_completed':
      await handleScanCompletedWebhook(data, user);
      break;
    case 'vulnerability_found':
      await handleVulnerabilityWebhook(data, user);
      break;
    case 'domain_added':
      await handleDomainWebhook(data, user);
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
async function handleScanCompletedWebhook(data, user) {
  try {
    const { scanId, vulnerabilities, riskScore } = data;
    
    // Send notification if user has notifications enabled
    if (user.notifications.email) {
      await sendEmailNotification(user, {
        type: 'scan_completed',
        subject: 'Security Scan Completed',
        message: `Your security scan has completed and found ${vulnerabilities} vulnerabilities with a risk score of ${riskScore}.`
      });
    }

    if (user.notifications.slack.enabled && user.notifications.slack.webhookUrl) {
      await sendSlackNotification(user.notifications.slack.webhookUrl, {
        text: `🔒 Security scan completed for your domain`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Security Scan Results*\n• Vulnerabilities found: ${vulnerabilities}\n• Risk score: ${riskScore}/10`
            }
          }
        ]
      });
    }
  } catch (error) {
    console.error('Failed to handle scan completed webhook:', error);
  }
}

/**
 * Handle vulnerability found webhook
 */
async function handleVulnerabilityWebhook(data, user) {
  try {
    const { severity, title, domain } = data;
    
    // Only send notifications for high and critical vulnerabilities
    if (severity === 'high' || severity === 'critical') {
      if (user.notifications.email) {
        await sendEmailNotification(user, {
          type: 'high_risk_vulnerability',
          subject: `${severity.toUpperCase()} Security Vulnerability Detected`,
          message: `A ${severity} severity vulnerability "${title}" was detected on ${domain}.`
        });
      }

      if (user.notifications.slack.enabled && user.notifications.slack.webhookUrl) {
        const emoji = severity === 'critical' ? '🚨' : '⚠️';
        await sendSlackNotification(user.notifications.slack.webhookUrl, {
          text: `${emoji} ${severity.toUpperCase()} vulnerability detected`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${emoji} ${severity.toUpperCase()} Vulnerability Alert*\n• Domain: ${domain}\n• Issue: ${title}\n• Action: Immediate review required`
              }
            }
          ]
        });
      }
    }
  } catch (error) {
    console.error('Failed to handle vulnerability webhook:', error);
  }
}

/**
 * Handle domain added webhook
 */
async function handleDomainWebhook(data, user) {
  try {
    const { domain } = data;
    
    console.log(`New domain ${domain} added for user ${user.email}`);
    
    // Could trigger initial scan or other actions
    // For now, just log the event
  } catch (error) {
    console.error('Failed to handle domain webhook:', error);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(user, notification) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: notification.subject,
      text: notification.message,
      html: generateEmailTemplate(notification)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Failed to send email notification:', error);
    throw error;
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(webhookUrl, message) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }

    console.log('Slack notification sent successfully');
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

/**
 * Generate HTML email template
 */
function generateEmailTemplate(notification) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Security Alert</h1>
        </div>
        <div class="content">
          <h2>${notification.subject}</h2>
          <p>${notification.message}</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from your security monitoring system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default router;
