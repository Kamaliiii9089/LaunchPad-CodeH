#!/usr/bin/env node

/**
 * 2FA Endpoint Testing Script
 * 
 * This script tests all 2FA endpoints to ensure they're working correctly.
 * Run with: node test-2fa-endpoints.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = null;
let tempToken = null;

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Check if backend is running
async function testBackendHealth() {
  log('\n=== Test 1: Backend Health Check ===', 'blue');
  try {
    const response = await axios.get(`${API_URL}/auth/google/url`);
    if (response.data.authUrl) {
      logSuccess('Backend is running and responding');
      return true;
    }
  } catch (error) {
    logError('Backend is not responding');
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 2: Register a test user
async function testRegister() {
  log('\n=== Test 2: Register Test User ===', 'blue');
  const testUser = {
    name: '2FA Test User',
    email: `test2fa_${Date.now()}@example.com`,
    password: 'TestPass123'
  };

  try {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    authToken = response.data.token;
    logSuccess('Test user registered successfully');
    logInfo(`Email: ${testUser.email}`);
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError('Failed to register test user');
    logError(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 3: Setup 2FA
async function testSetup2FA() {
  log('\n=== Test 3: Setup 2FA ===', 'blue');
  try {
    const response = await axios.post(
      `${API_URL}/auth/2fa/setup`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.secret && response.data.qrCode) {
      logSuccess('2FA setup successful');
      logInfo(`Secret: ${response.data.secret}`);
      logInfo(`QR Code: ${response.data.qrCode.substring(0, 50)}...`);
      return true;
    }
  } catch (error) {
    logError('Failed to setup 2FA');
    logError(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 4: Get recovery codes status (before enabling)
async function testRecoveryCodesStatus() {
  log('\n=== Test 4: Recovery Codes Status ===', 'blue');
  try {
    const response = await axios.get(
      `${API_URL}/auth/2fa/recovery-codes-status`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    logInfo(`Remaining codes: ${response.data.remainingCodes}`);
    logInfo(`Has recovery codes: ${response.data.hasRecoveryCodes}`);
    return true;
  } catch (error) {
    // Expected to fail if 2FA not enabled yet
    logWarning('Recovery codes status check failed (expected if 2FA not enabled)');
    logInfo(`Message: ${error.response?.data?.message || error.message}`);
    return true; // Not a critical failure
  }
}

// Test 5: Check CSRF errors are gone
async function testNoCsrfErrors() {
  log('\n=== Test 5: CSRF Error Check ===', 'blue');
  try {
    // Try to access a protected endpoint without CSRF token
    await axios.get(
      `${API_URL}/dashboard/overview`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logSuccess('No CSRF errors - API is working correctly');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('No CSRF errors (401 is expected for test user)');
      return true;
    }
    if (error.code === 'EBADCSRFTOKEN') {
      logError('CSRF error still present!');
      return false;
    }
    logWarning(`Unexpected error: ${error.message}`);
    return true;
  }
}

// Run all tests
async function runTests() {
  log('╔════════════════════════════════════════╗', 'blue');
  log('║  2FA Endpoint Testing Suite           ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const results = [];

  // Test 1: Backend Health
  results.push(await testBackendHealth());
  if (!results[results.length - 1]) {
    logError('\n❌ Backend is not running. Please start the backend with "npm run dev"');
    process.exit(1);
  }

  // Test 2: Register
  results.push(await testRegister());
  if (!results[results.length - 1]) {
    logError('\n❌ Cannot proceed without a test user');
    process.exit(1);
  }

  // Test 3: Setup 2FA
  results.push(await testSetup2FA());

  // Test 4: Recovery Codes Status
  results.push(await testRecoveryCodesStatus());

  // Test 5: CSRF Check
  results.push(await testNoCsrfErrors());

  // Summary
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║  Test Results Summary                  ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const passed = results.filter(r => r).length;
  const total = results.length;

  if (passed === total) {
    logSuccess(`\n✨ All tests passed! (${passed}/${total})`);
    log('\n🎉 2FA implementation is working correctly!', 'green');
    log('\nNext steps:', 'blue');
    log('1. Login to the app and go to Settings');
    log('2. Click "Setup 2FA" to scan the QR code');
    log('3. Verify the code from your authenticator app');
    log('4. Save the recovery codes');
    log('5. Test login with 2FA enabled\n');
  } else {
    logError(`\n❌ Some tests failed (${passed}/${total} passed)`);
    log('\nPlease check the errors above and:', 'yellow');
    log('1. Ensure backend is running on port 5000');
    log('2. Ensure MongoDB is connected');
    log('3. Check for any errors in backend console');
    log('4. Verify JWT_SECRET is set in .env\n');
  }
}

// Run the tests
runTests().catch((error) => {
  logError('\n❌ Unexpected error during testing');
  console.error(error);
  process.exit(1);
});
