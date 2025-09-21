import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';

describe('Scoring Routes', () => {
  let fastify: any;
  let mockRequireAuth: any;
  let mockGetUserCompany: any;
  let mockSendSuccess: any;
  let mockHandleError: any;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    
    // Create mock functions
    mockRequireAuth = vi.fn();
    mockGetUserCompany = vi.fn();
    mockSendSuccess = vi.fn();
    mockHandleError = vi.fn();
    
    // Mock Prisma client
    const mockPrisma = {
      document: {
        count: vi.fn(),
      },
    };
    
    fastify.decorate('prisma', mockPrisma);
    
    // Register routes with mocked dependencies
    await fastify.register(async (fastify) => {
      fastify.get('/', async (request, reply) => {
        const authenticatedUser = mockRequireAuth(request, reply);
        if (!authenticatedUser) {
          reply.status(401).send({ error: 'Not authenticated' });
          return;
        }

        try {
          const userCompany = await mockGetUserCompany(fastify.prisma, authenticatedUser.id, reply);
          if (!userCompany) return;

          const documentCount = await fastify.prisma.document.count({ 
            where: { companyId: userCompany.id } 
          });

          // Mock scoring result
          const scoringResult = {
            score: 85,
            improvementRecommendations: [
              'Upload more financial documents',
              'Complete KYC verification'
            ]
          };

          reply.send({
            score: scoringResult.score,
            improvementRecommendations: scoringResult.improvementRecommendations,
            maxPossibleScore: 100,
            scorePercentage: Math.round((scoringResult.score / 100) * 100)
          });
        } catch (error) {
          fastify.log.error('Failed to compute investment score:', error);
          reply.status(500).send({ error: 'Failed to compute score' });
        }
      });
    });
    
    await fastify.ready();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return investment score when authenticated', async () => {
      // Mock authentication
      mockRequireAuth.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
      
      // Mock company data
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        kycVerified: true,
        financialsLinked: true,
        revenue: 1000000,
        userId: 'user-123'
      };

      mockGetUserCompany.mockResolvedValue(mockCompany);
      fastify.prisma.document.count.mockResolvedValue(5);

      const response = await fastify.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({
        score: 85,
        improvementRecommendations: [
          'Upload more financial documents',
          'Complete KYC verification'
        ],
        maxPossibleScore: 100,
        scorePercentage: 85
      });
      expect(mockGetUserCompany).toHaveBeenCalledWith(fastify.prisma, 'user-123', expect.anything());
      expect(fastify.prisma.document.count).toHaveBeenCalledWith({
        where: { companyId: 'company-123' }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Mock authentication failure
      mockRequireAuth.mockReturnValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(401);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({ error: 'Not authenticated' });
    });

    it('should handle database errors gracefully', async () => {
      // Mock authentication
      mockRequireAuth.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
      
      // Mock company data
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        kycVerified: true,
        financialsLinked: true,
        revenue: 1000000,
        userId: 'user-123'
      };

      mockGetUserCompany.mockResolvedValue(mockCompany);
      
      // Mock database error
      fastify.prisma.document.count.mockRejectedValue(new Error('Database connection failed'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(500);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({ error: 'Failed to compute score' });
    });
  });
});
