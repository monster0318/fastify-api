import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

async function rateLimitPlugin(fastify: FastifyInstance) {

  const rateLimits = {

    auth: { max: 500, timeWindow: '15 minutes' },

    upload: { max: 1000, timeWindow: '1 hour' },

    general: { max: 20000, timeWindow: '1 minute' },

    download: { max: 5000, timeWindow: '1 minute' }
  };


  await fastify.register(rateLimit, {
    keyGenerator: (request: FastifyRequest) => {

      return request.user?.id || request.ip;
    },
    ...rateLimits.general
  });


  const authStore = new Map<string, { count: number; resetTime: number }>();
  
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.raw.url?.startsWith('/api/auth')) {
      const key = request.user?.id || request.ip;
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      

      for (const [k, v] of authStore.entries()) {
        if (now > v.resetTime) {
          authStore.delete(k);
        }
      }
      
      const current = authStore.get(key) || { count: 0, resetTime: now + windowMs };
      
      if (now > current.resetTime) {

        current.count = 1;
        current.resetTime = now + windowMs;
      } else {
        current.count++;
      }
      
      authStore.set(key, current);
      
      if (current.count > rateLimits.auth.max) {
        reply.status(429).send({ 
          error: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        });
        return;
      }
    }
  });
}

export default fp(rateLimitPlugin);
