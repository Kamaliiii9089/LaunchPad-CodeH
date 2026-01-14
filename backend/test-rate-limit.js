#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 * 
 * This script tests the rate limiting implementation by making multiple
 * requests to authentication endpoints and verifying the rate limiting behavior.
 * 
 * Usage:
 *   node test-rate-limit.js [endpoint] [attempts]
 * 
 * Examples:
 *   node test-rate-limit.js /api/auth/google/url 10
 *   node test-rate-limit.js /api/auth/profile 60
 */

const http = require('http');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const endpoint = process.argv[2] || '/api/auth/google/url';
const totalAttempts = parseInt(process.argv[3]) || 10;
const delayBetweenRequests = 500; // ms

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║        Rate Limiting Test Script                          ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.gray}Configuration:${colors.reset}`);
console.log(`  Base URL:     ${BASE_URL}`);
console.log(`  Endpoint:     ${endpoint}`);
console.log(`  Attempts:     ${totalAttempts}`);
console.log(`  Delay:        ${delayBetweenRequests}ms\n`);

console.log(`${colors.yellow}Starting test...${colors.reset}\n`);

let successCount = 0;
let rateLimitCount = 0;
let errorCount = 0;

// Make a single request
function makeRequest(attemptNumber) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'RateLimitTestScript/1.0',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const statusCode = res.statusCode;
        const rateLimitHeaders = {
          limit: res.headers['ratelimit-limit'],
          remaining: res.headers['ratelimit-remaining'],
          reset: res.headers['ratelimit-reset']
        };

        let result = {
          attempt: attemptNumber,
          statusCode,
          rateLimitHeaders,
          success: statusCode >= 200 && statusCode < 300
        };

        // Parse response body
        try {
          result.body = JSON.parse(data);
        } catch (e) {
          result.body = data;
        }

        resolve(result);
      });
    });

    req.on('error', (error) => {
      resolve({
        attempt: attemptNumber,
        error: error.message,
        success: false
      });
    });

    req.end();
  });
}

// Display result
function displayResult(result) {
  const attempt = `Attempt ${result.attempt}`.padEnd(12);
  
  if (result.error) {
    console.log(`${colors.red}✗ ${attempt} ERROR: ${result.error}${colors.reset}`);
    errorCount++;
    return;
  }

  const status = result.statusCode;
  let statusDisplay;
  
  if (status === 200) {
    statusDisplay = `${colors.green}✓ ${status} OK${colors.reset}`;
    successCount++;
  } else if (status === 429) {
    statusDisplay = `${colors.red}✗ ${status} RATE LIMITED${colors.reset}`;
    rateLimitCount++;
  } else {
    statusDisplay = `${colors.yellow}! ${status}${colors.reset}`;
    errorCount++;
  }

  // Rate limit info
  const limitInfo = result.rateLimitHeaders.remaining 
    ? `[${result.rateLimitHeaders.remaining}/${result.rateLimitHeaders.limit} remaining]`
    : '';

  console.log(`${statusDisplay.padEnd(30)} ${attempt} ${colors.gray}${limitInfo}${colors.reset}`);

  // Show retry info on rate limit
  if (status === 429 && result.body.retryAfter) {
    console.log(`${colors.yellow}   ⏱  Retry after: ${result.body.retryAfter}s${colors.reset}`);
  }
}

// Run all tests
async function runTests() {
  for (let i = 1; i <= totalAttempts; i++) {
    const result = await makeRequest(i);
    displayResult(result);
    
    // Delay between requests (except for the last one)
    if (i < totalAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }

  // Summary
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║        Test Summary                                        ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`  Total Attempts:    ${totalAttempts}`);
  console.log(`  ${colors.green}✓ Successful:      ${successCount}${colors.reset}`);
  console.log(`  ${colors.red}✗ Rate Limited:    ${rateLimitCount}${colors.reset}`);
  console.log(`  ${colors.yellow}! Errors:          ${errorCount}${colors.reset}\n`);

  // Assessment
  if (rateLimitCount > 0) {
    console.log(`${colors.green}✓ Rate limiting is working correctly!${colors.reset}`);
    console.log(`  Requests were blocked after exceeding the limit.\n`);
  } else if (successCount === totalAttempts) {
    console.log(`${colors.yellow}⚠ Warning: No rate limiting detected!${colors.reset}`);
    console.log(`  All requests succeeded. Check your configuration:${colors.reset}`);
    console.log(`  - Is SKIP_RATE_LIMIT_DEV=true in .env?`);
    console.log(`  - Is the server running?`);
    console.log(`  - Are you testing from localhost?\n`);
  } else {
    console.log(`${colors.red}✗ Unexpected results${colors.reset}`);
    console.log(`  Review the test output above for details.\n`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
