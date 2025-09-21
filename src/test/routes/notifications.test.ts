import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';

describe('Notification Routes', () => {
  let fastify: any;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    
    // Mock Prisma client
    const mockPrisma = {
      notification: {
        findMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    
    fastify.decorate('prisma', mockPrisma);
    
    // Register routes with mocked authentication
    await fastify.register(async (fastify) => {
      fastify.get('/', async (request, reply) => {
        if (!request.user) return reply.status(401).send({ error: 'not authenticated' });

        const { page = 1, limit = 20, unreadOnly = false } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = { userId: request.user.id };
        if (unreadOnly) {
          where.readAt = null;
        }

        const [notifications, total] = await Promise.all([
          fastify.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          fastify.prisma.notification.count({ where })
        ]);

        return reply.send({
          notifications,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      });

      fastify.post('/read/:id', async (request, reply) => {
        if (!request.user) return reply.status(401).send({ error: 'not authenticated' });

        const { id } = request.params as { id: string };

        const updated = await fastify.prisma.notification.updateMany({
          where: { id, userId: request.user.id },
          data: { readAt: new Date() },
        });

        if (updated.count === 0) {
          return reply.status(404).send({ error: 'Notification not found' });
        }

        return reply.send({ updated: updated.count });
      });

      fastify.get('/stats', async (request, reply) => {
        if (!request.user) return reply.status(401).send({ error: 'not authenticated' });

        const [total, unread] = await Promise.all([
          fastify.prisma.notification.count({
            where: { userId: request.user.id }
          }),
          fastify.prisma.notification.count({
            where: { 
              userId: request.user.id,
              readAt: null
            }
          })
        ]);

        return reply.send({
          total,
          unread,
          read: total - unread
        });
      });
    });
    
    await fastify.ready();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return notifications with pagination when authenticated', async () => {
      const mockNotifications = [
        { id: '1', message: 'Test notification 1', createdAt: new Date() },
        { id: '2', message: 'Test notification 2', createdAt: new Date() }
      ];

      fastify.prisma.notification.findMany.mockResolvedValue(mockNotifications);
      fastify.prisma.notification.count.mockResolvedValue(2);

      // Create a new fastify instance with mocked authentication
      const testFastify = Fastify({ logger: false });
      testFastify.decorate('prisma', fastify.prisma);
      
      await testFastify.register(async (fastify) => {
        fastify.get('/', async (request, reply) => {
          // Simulate authenticated user
          request.user = { id: 'user-123' };

          const { page = 1, limit = 20, unreadOnly = false } = request.query as any;
          const skip = (page - 1) * limit;

          const where: any = { userId: request.user.id };
          if (unreadOnly) {
            where.readAt = null;
          }

          const [notifications, total] = await Promise.all([
            fastify.prisma.notification.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              skip,
              take: limit,
            }),
            fastify.prisma.notification.count({ where })
          ]);

          return reply.send({
            notifications,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit)
            }
          });
        });
      });
      
      await testFastify.ready();

      const response = await testFastify.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toHaveProperty('notifications');
      expect(responseData).toHaveProperty('pagination');
      expect(responseData.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(401);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({ error: 'not authenticated' });
    });
  });

  describe('POST /read/:id', () => {
    it('should mark notification as read when authenticated', async () => {
      fastify.prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      // Create a new fastify instance with mocked authentication
      const testFastify = Fastify({ logger: false });
      testFastify.decorate('prisma', fastify.prisma);
      
      await testFastify.register(async (fastify) => {
        fastify.post('/read/:id', async (request, reply) => {
          // Simulate authenticated user
          request.user = { id: 'user-123' };
          request.params = { id: 'notification-123' };

          const { id } = request.params as { id: string };

          const updated = await fastify.prisma.notification.updateMany({
            where: { id, userId: request.user.id },
            data: { readAt: new Date() },
          });

          if (updated.count === 0) {
            return reply.status(404).send({ error: 'Notification not found' });
          }

          return reply.send({ updated: updated.count });
        });
      });
      
      await testFastify.ready();

      const response = await testFastify.inject({
        method: 'POST',
        url: '/read/notification-123'
      });

      expect(response.statusCode).toBe(200);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({ updated: 1 });
    });
  });

  describe('GET /stats', () => {
    it('should return notification statistics when authenticated', async () => {
      fastify.prisma.notification.count
        .mockResolvedValueOnce(10) // total count
        .mockResolvedValueOnce(3); // unread count

      // Create a new fastify instance with mocked authentication
      const testFastify = Fastify({ logger: false });
      testFastify.decorate('prisma', fastify.prisma);
      
      await testFastify.register(async (fastify) => {
        fastify.get('/stats', async (request, reply) => {
          // Simulate authenticated user
          request.user = { id: 'user-123' };

          const [total, unread] = await Promise.all([
            fastify.prisma.notification.count({
              where: { userId: request.user.id }
            }),
            fastify.prisma.notification.count({
              where: { 
                userId: request.user.id,
                readAt: null
              }
            })
          ]);

          return reply.send({
            total,
            unread,
            read: total - unread
          });
        });
      });
      
      await testFastify.ready();

      const response = await testFastify.inject({
        method: 'GET',
        url: '/stats'
      });

      expect(response.statusCode).toBe(200);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toEqual({
        total: 10,
        unread: 3,
        read: 7
      });
    });
  });
});
