
import { FastifyInstance } from 'fastify';
import authRoutes from './auth.js';
import companyRoutes from './companies.js';
import kycRoutes from './kyc.js';
import financialsRoutes from './financials.js';
import documentRoutes from './documents.js';
import scoreRoutes from './scoring.js';
import notificationRoutes from './notifications.js';
import capitalTableRoutes from './capital-table.js';

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
