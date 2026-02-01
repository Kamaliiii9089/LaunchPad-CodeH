const request = require('supertest');
const express = require('express');
const breachCheckRoutes = require('../routes/breachCheck');
const { authMiddleware } = require('../middleware/auth');

// Mock dependencies
jest.mock('../services/hibpService');
jest.mock('../middleware/auth');

const hibpService = require('../services/hibpService');

describe('Breach Check Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware to pass through
    authMiddleware.mockImplementation((req, res, next) => {
      req.user = { _id: 'user123', email: 'test@example.com' };
      next();
    });

    app.use('/api/breach-check', breachCheckRoutes);
    jest.clearAllMocks();
  });

  describe('POST /check', () => {
    it('checks single email successfully', async () => {
      const mockBreachResult = {
        isBreached: true,
        breaches: [
          {
            Name: 'Adobe',
            BreachDate: '2013-10-04',
            DataClasses: ['Email addresses', 'Passwords'],
            PwnCount: 152445165
          }
        ],
        breachCount: 1,
        severity: 'high'
      };

      hibpService.checkBreachedAccount.mockResolvedValue(mockBreachResult);

      const response = await request(app)
        .post('/api/breach-check/check')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        email: 'test@example.com',
        ...mockBreachResult
      });

      expect(hibpService.checkBreachedAccount).toHaveBeenCalledWith('test@example.com');
    });

    it('checks multiple emails successfully', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];
      
      hibpService.checkBreachedAccount
        .mockResolvedValueOnce({ isBreached: false, breaches: [], breachCount: 0, severity: 'safe' })
        .mockResolvedValueOnce({ isBreached: true, breaches: [{}], breachCount: 1, severity: 'medium' });

      const response = await request(app)
        .post('/api/breach-check/check')
        .send({ emails });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].email).toBe('test1@example.com');
      expect(response.body.data[1].email).toBe('test2@example.com');
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalChecked).toBe(2);
    });

    it('validates email format', async () => {
      const response = await request(app)
        .post('/api/breach-check/check')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid email/i);
    });

    it('handles missing email/emails', async () => {
      const response = await request(app)
        .post('/api/breach-check/check')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/email.*required/i);
    });

    it('limits batch size to prevent abuse', async () => {
      const emails = Array.from({ length: 101 }, (_, i) => `test${i}@example.com`);

      const response = await request(app)
        .post('/api/breach-check/check')
        .send({ emails });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/too many emails/i);
    });

    it('handles HIBP service errors gracefully', async () => {
      hibpService.checkBreachedAccount.mockRejectedValue(
        new Error('Rate limited by HIBP API')
      );

      const response = await request(app)
        .post('/api/breach-check/check')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/rate limit/i);
    });

    it('handles general service errors', async () => {
      hibpService.checkBreachedAccount.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/api/breach-check/check')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/service.*unavailable/i);
    });

    it('includes security recommendations for breached accounts', async () => {
      hibpService.checkBreachedAccount.mockResolvedValue({
        isBreached: true,
        breaches: [{ Name: 'Adobe', DataClasses: ['Passwords'] }],
        breachCount: 1,
        severity: 'high'
      });

      const response = await request(app)
        .post('/api/breach-check/check')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.recommendations).toContain('Change your password immediately');
    });
  });

  describe('GET /status', () => {
    it('returns user breach status summary', async () => {
      // Mock finding user subscriptions with breach status
      const mockStatus = {
        totalSubscriptions: 5,
        breachedSubscriptions: 2,
        safeSubscriptions: 3,
        lastChecked: new Date().toISOString(),
        securityScore: 60
      };

      // Mock the route handler logic
      const response = await request(app)
        .get('/api/breach-check/status');

      expect(response.status).toBe(200);
      // This would be mocked in a real implementation
    });
  });

  describe('POST /bulk-check', () => {
    it('handles bulk email checking with progress', async () => {
      const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
      
      // Mock multiple successful responses
      hibpService.checkBreachedAccount
        .mockResolvedValueOnce({ isBreached: false, breaches: [], breachCount: 0, severity: 'safe' })
        .mockResolvedValueOnce({ isBreached: true, breaches: [{}], breachCount: 1, severity: 'medium' })
        .mockResolvedValueOnce({ isBreached: false, breaches: [], breachCount: 0, severity: 'safe' });

      const response = await request(app)
        .post('/api/breach-check/bulk-check')
        .send({ emails });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(3);
      expect(response.body.data.breached).toBe(1);
      expect(response.body.data.safe).toBe(2);
    });

    it('continues processing on individual failures', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];
      
      hibpService.checkBreachedAccount
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({ isBreached: false, breaches: [], breachCount: 0, severity: 'safe' });

      const response = await request(app)
        .post('/api/breach-check/bulk-check')
        .send({ emails });

      expect(response.status).toBe(200);
      expect(response.body.data.processed).toBe(1);
      expect(response.body.data.failed).toBe(1);
    });
  });
});