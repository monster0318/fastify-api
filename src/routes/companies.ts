
import { FastifyPluginAsync } from 'fastify';
import { 
  requireAuthentication, 
  getUserCompany, 
  sendSuccess, 
  handleError 
} from '../utils/auth-helpers.js';
import { 
  validateRequestBody, 
  companyUpdateSchema 
} from '../utils/validation-helpers.js';

const companyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', async (request, reply) => {

    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;


    const validationResult = validateRequestBody(request, companyUpdateSchema);
    if (!validationResult.success) {
      return handleError(reply, 400, 'Validation failed', validationResult.error);
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

      sendSuccess(reply, company, 'Company information saved successfully');
    } catch (error) {
      fastify.log.error(error as Error, 'Failed to save company:');
      handleError(reply, 500, 'Failed to save company', 'An error occurred while saving company information');
    }
  });

  fastify.get('/', async (request, reply) => {

    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    try {

      const userCompany = await getUserCompany(fastify.prisma, authUser.id, reply);
      if (!userCompany) return;

      sendSuccess(reply, userCompany);
    } catch (error) {
      fastify.log.error(error as Error, 'Failed to fetch company:');
      handleError(reply, 500, 'Failed to fetch company', 'An error occurred while fetching company information');
    }
  });
};

export default companyRoutes;
