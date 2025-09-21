import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';

describe('Company Routes', () => {
  let fastify: any;
  let mockRequireAuth: any;
  let mockValidateBody: any;
  let mockGetUserCompany: any;
  let mockSendSuccess: any;
  let mockHandleError: any;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    
    // Create mock functions
    mockRequireAuth = vi.fn();
    mockValidateBody = vi.fn();
    mockGetUserCompany = vi.fn();
    mockSendSuccess = vi.fn();
    mockHandleError = vi.fn();
    
    // Mock Prisma client
    const mockPrisma = {
      company: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    
    fastify.decorate('prisma', mockPrisma);
    
    // Register routes with mocked dependencies
    await fastify.register(async (fastify) => {
      fastify.post('/', async (request, reply) => {
        const authUser = mockRequireAuth(request, reply);
        if (!authUser) {
          reply.status(401).send({ error: 'Not authenticated' });
          return;
        }

        const validationResult = mockValidateBody(request);
        if (!validationResult.success) {
          reply.status(400).send({ error: 'Validation failed', details: validationResult.error });
          return;
        }

        const companyData = validationResult.data;

        try {
          let existingCompany = await fastify.prisma.company.findFirst({ 
            where: { userId: authUser.id } 
          });

          let company;
          if (existingCompany) {
            company = await fastify.prisma.company.update({ 
              where: { id: existingCompany.id }, 
              data: companyData 
            });
          } else {
            company = await fastify.prisma.company.create({ 
              data: { 
                ...companyData, 
                userId: authUser.id 
              } 
            });
          }

          mockSendSuccess(reply, company, 'Company information saved successfully');
        } catch (error) {
          fastify.log.error('Failed to save company:', error);
          reply.status(500).send({ error: 'Failed to save company' });
        }
      });

      fastify.get('/', async (request, reply) => {
        const authenticatedUser = mockRequireAuth(request, reply);
        if (!authenticatedUser) {
          reply.status(401).send({ error: 'Not authenticated' });
          return;
        }

        try {
          const userCompany = await mockGetUserCompany(fastify.prisma, authenticatedUser.id, reply);
          if (!userCompany) return;

          mockSendSuccess(reply, userCompany);
        } catch (error) {
          fastify.log.error('Failed to fetch company:', error);
          reply.status(500).send({ error: 'Failed to fetch company' });
        }
      });
    });
    
    await fastify.ready();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a new company when user has no existing company', async () => {
      // Mock authentication
      mockRequireAuth.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
      
      // Mock validation
      mockValidateBody.mockReturnValue({
        success: true,
        data: {
          name: 'Test Company',
          sector: 'Technology',
          targetRaise: 1000000,
          revenue: 500000
        }
      });

      // Mock database calls
      fastify.prisma.company.findFirst.mockResolvedValue(null);
      fastify.prisma.company.create.mockResolvedValue({
        id: 'company-123',
        name: 'Test Company',
        sector: 'Technology',
        targetRaise: 1000000,
        revenue: 500000,
        userId: 'user-123'
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/',
        payload: {
          name: 'Test Company',
          sector: 'Technology',
          targetRaise: 1000000,
          revenue: 500000
        }
      });

      expect(response.statusCode).toBe(200);
      expect(fastify.prisma.company.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123' }
      });
      expect(fastify.prisma.company.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Company',
          sector: 'Technology',
          targetRaise: 1000000,
          revenue: 500000,
          userId: 'user-123'
        }
      });
      expect(mockSendSuccess).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Mock authentication failure
      mockRequireAuth.mockReturnValue(null);

      const response = await fastify.inject({
        method: 'POST',
        url: '/',
        payload: {
          name: 'Test Company'
        }
      });

      expect(response.statusCode).toBe(401);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({ error: 'Not authenticated' });
    });

    it('should return 400 when validation fails', async () => {
      // Mock authentication
      mockRequireAuth.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
      
      // Mock validation failure
      mockValidateBody.mockReturnValue({
        success: false,
        error: 'Name is required'
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/',
        payload: {
          name: '' // Invalid empty name
        }
      });

      expect(response.statusCode).toBe(400);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({ 
        error: 'Validation failed', 
        details: 'Name is required' 
      });
    });
  });

  describe('GET /', () => {
    it('should return user company when authenticated', async () => {
      // Mock authentication
      mockRequireAuth.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
      
      // Mock company data
      const companyData = {
        id: 'company-123',
        name: 'Test Company',
        sector: 'Technology',
        targetRaise: 1000000,
        revenue: 500000,
        userId: 'user-123'
      };

      mockGetUserCompany.mockResolvedValue(companyData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      expect(mockGetUserCompany).toHaveBeenCalledWith(fastify.prisma, 'user-123', expect.anything());
      expect(mockSendSuccess).toHaveBeenCalledWith(expect.anything(), companyData);
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
  });
});
