#!/usr/bin/env node

/**
 * Health Endpoint Test Script
 * 
 * Tests all health check endpoints to verify they're working correctly
 * 
 * Usage: node test-health-endpoints.js [base-url]
 * Example: node test-health-endpoints.js http://localhost:5000
 */

const http = require('http');

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
console.log(`${colors.cyan}${colors.bold}║        Health Endpoint Test Script                       ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.gray}Testing endpoints at: ${colors.reset}${colors.bold}${BASE_URL}${colors.reset}\n`);

const endpoints = [
  { path: '/health', name: 'Basic Health Check', expectedStatus: [200, 503] },
  { path: '/health/detailed', name: 'Detailed Health Check', expectedStatus: [200, 503] },
  { path: '/health/live', name: 'Liveness Probe', expectedStatus: [200] },
  { path: '/health/ready', name: 'Readiness Probe', expectedStatus: [200, 503] },
  { path: '/api/status', name: 'API Status (Legacy)', expectedStatus: [200] }
];

let passedTests = 0;
let failedTests = 0;

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, BASE_URL);
    
    const startTime = Date.now();
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = null;
        }

        resolve({
          statusCode: res.statusCode,
          responseTime,
          data: parsedData,
          success: endpoint.expectedStatus.includes(res.statusCode)
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
        success: false
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        error: 'Request timeout',
        success: false
      });
    });
  });
}

async function runTests() {
  for (const endpoint of endpoints) {
    process.stdout.write(`${colors.gray}Testing ${endpoint.name.padEnd(30)}${colors.reset}`);
    
    const result = await testEndpoint(endpoint);
    
    if (result.error) {
      console.log(`${colors.red}✗ ERROR${colors.reset}`);
      console.log(`  ${colors.red}Error: ${result.error}${colors.reset}\n`);
      failedTests++;
      continue;
    }

    if (result.success) {
      console.log(`${colors.green}✓ PASS${colors.reset} ${colors.gray}(${result.statusCode}, ${result.responseTime}ms)${colors.reset}`);
      
      // Show key information from response
      if (result.data) {
        if (result.data.status) {
          console.log(`  ${colors.gray}Status: ${result.data.status}${colors.reset}`);
        }
        if (result.data.database) {
          const dbStatus = result.data.database.status || result.data.database;
          const dbColor = dbStatus === 'connected' ? colors.green : colors.yellow;
          console.log(`  ${colors.gray}Database: ${dbColor}${dbStatus}${colors.reset}`);
        }
        if (result.data.rateLimiting) {
          const rlColor = result.data.rateLimiting.enabled ? colors.green : colors.yellow;
          console.log(`  ${colors.gray}Rate Limiting: ${rlColor}${result.data.rateLimiting.enabled ? 'enabled' : 'disabled'}${colors.reset}`);
        }
        if (result.data.memory) {
          console.log(`  ${colors.gray}Memory: ${result.data.memory.heapUsed || 'N/A'}${colors.reset}`);
        }
      }
      console.log();
      passedTests++;
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset} ${colors.gray}(${result.statusCode})${colors.reset}`);
      console.log(`  ${colors.yellow}Expected: ${endpoint.expectedStatus.join(' or ')}${colors.reset}`);
      console.log(`  ${colors.yellow}Got: ${result.statusCode}${colors.reset}\n`);
      failedTests++;
    }
  }

  // Summary
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}Test Summary${colors.reset}\n`);
  console.log(`  Total Tests:  ${endpoints.length}`);
  console.log(`  ${colors.green}✓ Passed:     ${passedTests}${colors.reset}`);
  console.log(`  ${colors.red}✗ Failed:     ${failedTests}${colors.reset}\n`);

  if (failedTests === 0) {
    console.log(`${colors.green}${colors.bold}All health checks passed! ✓${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}Some health checks failed! ✗${colors.reset}\n`);
    console.log(`${colors.yellow}Troubleshooting:${colors.reset}`);
    console.log(`  1. Make sure the server is running: npm run dev`);
    console.log(`  2. Check if MongoDB is connected`);
    console.log(`  3. Verify environment variables are set correctly\n`);
    process.exit(1);
  }
}

// Run the tests
console.log(`${colors.gray}Starting health check tests...${colors.reset}\n`);
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
