import { FastifyPluginAsync } from 'fastify';
import { requireAuthentication } from '../utils/auth-helpers.ts';

const notificationRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/', async (request, reply) => {
    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    const { page = 1, limit = 20, unreadOnly = false } = request.query as any;
    const skip = (page - 1) * limit;

    const where: any = { userId: authUser.id };
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
};

export default notificationRoutes;
