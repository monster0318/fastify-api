
import { FastifyPluginAsync } from 'fastify';
import { calculateScore } from '../services/scoring.js';
import { 
  requireAuthentication, 
  getUserCompany, 
  sendSuccess, 
  handleError 
} from '../utils/auth-helpers.js';

const scoringRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    try {
      const userCompany = await getUserCompany(fastify.prisma, authUser.id, reply);
      if (!userCompany) return;

      const documentCount = await fastify.prisma.document.count({ 
        where: { companyId: userCompany.id } 
      });

      const scoringResult = calculateScore({
        kycVerified: userCompany.kycVerified,
        financialsLinked: userCompany.financialsLinked,
        docCount: documentCount,
        revenue: userCompany.revenue ?? 0
      });

      sendSuccess(reply, {
        score: scoringResult.score,
        improvementRecommendations: scoringResult.recommendations,
        maxPossibleScore: 100,
        scorePercentage: Math.round((scoringResult.score / 100) * 100)
      });
    } catch (error) {
      fastify.log.error('Failed to compute investment score:', error);
      handleError(reply, 500, 'Failed to compute score', 'An error occurred while computing the investment score');
    }
  });
};

export default scoringRoutes; 
