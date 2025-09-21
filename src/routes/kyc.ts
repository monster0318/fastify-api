import { FastifyPluginAsync } from 'fastify';
import axios from 'axios';
import { requireAuthentication } from '../utils/auth-helpers.js';

const kycRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.post('/verify', async (request, reply) => {
    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    const company = await fastify.prisma.company.findFirst({
      where: { userId: authUser.id },
    });
    if (!company) return reply.status(404).send({ error: 'No company found' });

    try {
      const verified = Math.random() < 0.5; // Sandbox always returns predictable result

      await fastify.prisma.company.update({
        where: { id: company.id },
        data: { kycVerified: verified },
      });

      if (fastify.sendNotification) {
        await fastify.sendNotification(
          authUser.id,
          'kyc',
          verified ? 'KYC verified successfully' : 'KYC verification failed'
        );
      }

      return reply.send({ ok: true, verified });
    } catch (err: any) {
      fastify.log.error(err);

      if (axios.isAxiosError(err)) {
        return reply.status(err.response?.status || 500).send({
          error: 'Persona API error',
          details: err.response?.data || err.message,
        });
      }

      return reply.status(500).send({ error: 'KYC verification failed' });
    }
  });

  fastify.get('/', async (request, reply) => {
    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    const company = await fastify.prisma.company.findFirst({
      where: { userId: authUser.id },
    });
    if (!company) return reply.status(404).send({ error: 'No company found' });

    return reply.send({ kycVerified: company.kycVerified, personaId: company.personaId || null });
  });
};

export default kycRoutes;
