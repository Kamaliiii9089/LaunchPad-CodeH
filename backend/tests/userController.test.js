const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { getAllUsers } = require('../controllers/userController');

// Mock the User model
jest.mock('../models/User');

describe('UserController', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get('/api/users', getAllUsers);
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('returns paginated users successfully', async () => {
      const mockUsers = [
        { _id: '1', email: 'user1@test.com', name: 'User 1' },
        { _id: '2', email: 'user2@test.com', name: 'User 2' }
      ];

      User.countDocuments.mockResolvedValue(10);
      User.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockUsers)
      });

      const res = await request(app).get('/api/users?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.totalRecords).toBe(10);
      expect(res.body.pagination.totalPages).toBe(5);
    });

    it('handles errors gracefully', async () => {
      User.countDocuments.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/users');
      
      // Error should be passed to next() and handled by error middleware
      // In a real app this would return 500
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('returns empty array when no users exist', async () => {
      User.countDocuments.mockResolvedValue(0);
      User.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([])
      });

      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.totalRecords).toBe(0);
    });
  });
});
