
import { FastifyPluginAsync } from 'fastify';
import { requireAuthentication, getUserCompany, sendSuccess, handleError } from '../utils/auth-helpers.js';

const financialsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/link', async (request, reply) => {

    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    try {

      const userCompany = await getUserCompany(fastify.prisma, authUser.id, reply);
      if (!userCompany) return;

      await fastify.prisma.company.update({ 
        where: { id: userCompany.id }, 
        data: { financialsLinked: true } 
      });

      await fastify.sendNotification(
        authUser.id, 
        'financials', 
        'Financials linked successfully'
      );

      sendSuccess(reply, { financialsLinked: true }, 'Financials linked successfully');
    } catch (error) {
      fastify.log.error('Failed to link financials:', error);
      handleError(reply, 500, 'Failed to link financials', 'An error occurred while linking financials');
    }
  });

  fastify.get('/', async (request, reply) => {

    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    try {

      const userCompany = await getUserCompany(fastify.prisma, authUser.id, reply);
      if (!userCompany) return;

      sendSuccess(reply, { 
        financialsLinked: userCompany.financialsLinked 
      });
    } catch (error) {
      fastify.log.error('Failed to get financials status:', error instanceof Error ? error.message : String(error));
      handleError(reply, 500, 'Failed to get financials status', 'An error occurred while fetching financials status');
    }
  });
};

export default financialsRoutes;  
