const request = require('supertest');
const express = require('express');
const { authStrictLimiter, apiGeneralLimiter } = require('../middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('authStrictLimiter', () => {
    it('allows requests within limit', async () => {
      app.get('/test-auth', authStrictLimiter, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/test-auth');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('blocks requests exceeding strict limit', async () => {
      app.get('/test-auth-strict', authStrictLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to the limit
      const limit = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5;
      
      for (let i = 0; i < limit; i++) {
        await request(app).get('/test-auth-strict');
      }

      // Next request should be rate limited
      const blockedRes = await request(app).get('/test-auth-strict');
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toBeDefined();
    });
  });

  describe('apiGeneralLimiter', () => {
    it('allows many requests within generous limit', async () => {
      app.get('/test-api', apiGeneralLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make several requests (well under the limit)
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/test-api');
        expect(res.status).toBe(200);
      }
    });
  });

  describe('Rate limit headers', () => {
    it('includes rate limit info in response headers', async () => {
      app.get('/test-headers', authStrictLimiter, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/test-headers');
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });
  });
});
