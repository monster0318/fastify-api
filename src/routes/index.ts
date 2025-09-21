
import { FastifyInstance } from 'fastify';
import authRoutes from './auth.ts';
import companyRoutes from './companies.ts';
import kycRoutes from './kyc.ts';
import financialsRoutes from './financials.ts';
import documentRoutes from './documents.ts';
import scoreRoutes from './scoring.ts';
import notificationRoutes from './notifications.ts';
import capitalTableRoutes from './capital-table.ts';

export default async function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      };
    }
  });

  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(companyRoutes, { prefix: '/api/company' });
  fastify.register(kycRoutes, { prefix: '/api/kyc' });
  fastify.register(financialsRoutes, { prefix: '/api/financials' });
  fastify.register(documentRoutes, { prefix: '/api/files' });
  fastify.register(scoreRoutes, { prefix: '/api/score' });
  fastify.register(notificationRoutes, { prefix: '/api/notifications' });
  fastify.register(capitalTableRoutes, { prefix: '/api/cap-table' });
}
