const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');

jest.mock('../models/User');
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get('/protected', authMiddleware, (req, res) => {
      res.json({ success: true, userId: req.userId });
    });
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('allows access with valid token', async () => {
      const mockUser = { 
        _id: 'user123', 
        email: 'test@example.com', 
        isActive: true 
      };

      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer validtoken123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects request without token', async () => {
      const res = await request(app).get('/protected');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no token/i);
    });

    it('rejects request with invalid token format', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token123');

      expect(res.status).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    it('rejects expired token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer expiredtoken');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('TOKEN_EXPIRED_OR_INVALID');
    });

    it('rejects inactive user', async () => {
      const mockUser = { 
        _id: 'user123', 
        email: 'test@example.com', 
        isActive: false 
      };

      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer validtoken');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/inactive/i);
    });

    it('rejects when user not found', async () => {
      jwt.verify.mockReturnValue({ userId: 'nonexistent' });
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer validtoken');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
});
