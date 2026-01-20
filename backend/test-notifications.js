#!/usr/bin/env node

/**
 * Notification System Test Script
 *
 * Tests the notification sending functionality after fixes
 * - Verifies nodemailer createTransport method works
 * - Tests email notification sending
 * - Tests Slack notification sending (if configured)
 * - Checks console logging for success/failure messages
 *
 * Usage: node test-notifications.js [base-url]
 * Example: node test-notifications.js http://localhost:5000
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:5000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}║        Notification System Test Script                   ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.gray}Testing notification system at: ${colors.reset}${colors.bold}${BASE_URL}${colors.reset}\n`);

// Test configuration
const testConfig = {
  email: {
    enabled: process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS,
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  slack: {
    enabled: process.env.SLACK_WEBHOOK_URL,
