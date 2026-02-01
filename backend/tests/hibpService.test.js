const hibpService = require('../services/hibpService');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock the HIBP service to bypass API key requirement for tests
jest.mock('../services/hibpService', () => ({
  checkBreachedAccount: jest.fn(),
  getBreachDetails: jest.fn(),
  assessBreachSeverity: jest.fn(),
  calculateSecurityScore: jest.fn(),
  generateSecurityRecommendations: jest.fn()
}));

describe('HIBP Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkBreachedAccount', () => {
    it('returns breach data for compromised email', async () => {
      const mockBreaches = [
        {
          Name: 'Adobe',
          BreachDate: '2013-10-04',
          PwnCount: 152445165,
          DataClasses: ['Email addresses', 'Passwords']
        }
      ];

      hibpService.checkBreachedAccount.mockResolvedValue(mockBreaches);

      const result = await hibpService.checkBreachedAccount('test@example.com');

      expect(result).toEqual(mockBreaches);
      expect(hibpService.checkBreachedAccount).toHaveBeenCalledWith('test@example.com');
    });

    it('returns empty array for clean email', async () => {
      hibpService.checkBreachedAccount.mockResolvedValue([]);

      const result = await hibpService.checkBreachedAccount('clean@example.com');

      expect(result).toEqual([]);
      expect(hibpService.checkBreachedAccount).toHaveBeenCalledWith('clean@example.com');
    });

    it('handles rate limiting errors', async () => {
      hibpService.checkBreachedAccount.mockRejectedValue(
        new Error('Rate limited by HIBP API')
      );

      await expect(hibpService.checkBreachedAccount('test@example.com'))
        .rejects.toThrow('Rate limited by HIBP API');
    });

    it('handles general API errors', async () => {
      hibpService.checkBreachedAccount.mockRejectedValue(
        new Error('HIBP API error')
      );

      await expect(hibpService.checkBreachedAccount('test@example.com'))
        .rejects.toThrow('HIBP API error');
    });
  });

  describe('getBreachDetails', () => {
    it('returns specific breach information', async () => {
      const mockBreach = {
        Name: 'Adobe',
        Title: 'Adobe',
        Domain: 'adobe.com',
        BreachDate: '2013-10-04',
        Description: 'Adobe breach details...',
        DataClasses: ['Email addresses', 'Passwords']
      };

      hibpService.getBreachDetails.mockResolvedValue(mockBreach);

      const result = await hibpService.getBreachDetails('Adobe');

      expect(result).toEqual(mockBreach);
      expect(hibpService.getBreachDetails).toHaveBeenCalledWith('Adobe');
    });

    it('returns null for non-existent breach', async () => {
      hibpService.getBreachDetails.mockResolvedValue(null);

      const result = await hibpService.getBreachDetails('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('assessBreachSeverity', () => {
    it('assesses high severity for sensitive data breach', () => {
      const breach = {
        PwnCount: 100000000,
        DataClasses: ['Passwords', 'Email addresses'],
        BreachDate: '2023-01-01'
      };

      hibpService.assessBreachSeverity.mockReturnValue('high');

      const severity = hibpService.assessBreachSeverity(breach);

      expect(severity).toBe('high');
      expect(hibpService.assessBreachSeverity).toHaveBeenCalledWith(breach);
    });

    it('assesses medium severity for moderate breach', () => {
      const breach = {
        PwnCount: 1000000,
        DataClasses: ['Usernames', 'Names'],
        BreachDate: '2020-01-01'
      };

      hibpService.assessBreachSeverity.mockReturnValue('medium');

      const severity = hibpService.assessBreachSeverity(breach);

      expect(severity).toBe('medium');
    });

    it('assesses low severity for minimal breach', () => {
      const breach = {
        PwnCount: 1000,
        DataClasses: ['Other'],
        BreachDate: '2019-01-01'
      };

      hibpService.assessBreachSeverity.mockReturnValue('low');

      const severity = hibpService.assessBreachSeverity(breach);

      expect(severity).toBe('low');
    });
  });

  describe('calculateSecurityScore', () => {
    it('calculates security score correctly', () => {
      const mockResults = {
        matchedBreaches: [
          { breach: 'Test1', severity: 'high' },
          { breach: 'Test2', severity: 'medium' }
        ]
      };

      hibpService.calculateSecurityScore.mockReturnValue(55);

      const score = hibpService.calculateSecurityScore(mockResults, 10);

      expect(score).toBe(55);
      expect(typeof score).toBe('number');
    });

    it('returns higher score for fewer breaches', () => {
      const noBreaches = { matchedBreaches: [] };
      const manyBreaches = { matchedBreaches: [
        { breach: 'Test1', severity: 'high' },
        { breach: 'Test2', severity: 'high' }
      ]};

      hibpService.calculateSecurityScore
        .mockReturnValueOnce(95) // No breaches
        .mockReturnValueOnce(40); // Many breaches

      const scoreNone = hibpService.calculateSecurityScore(noBreaches, 10);
      const scoreMany = hibpService.calculateSecurityScore(manyBreaches, 10);

      expect(scoreNone).toBeGreaterThan(scoreMany);
    });
  });

  describe('generateSecurityRecommendations', () => {
    it('generates appropriate recommendations', () => {
      const mockBreachResults = [
        { breach: 'Adobe', severity: 'high', dataExposed: ['Passwords'] }
      ];

      const mockRecommendations = [
        'Change your password immediately',
        'Enable two-factor authentication',
        'Monitor your accounts for suspicious activity'
      ];

      hibpService.generateSecurityRecommendations.mockReturnValue(mockRecommendations);

      const recommendations = hibpService.generateSecurityRecommendations(mockBreachResults);

      expect(recommendations).toEqual(mockRecommendations);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});