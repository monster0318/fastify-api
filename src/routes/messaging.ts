import { FastifyPluginAsync } from 'fastify';
import { requireAuthentication } from '../utils/auth-helpers.ts';
import { messageSchema } from '../utils/validation-helpers.ts';
import Ably from 'ably';

const messageRoutes: FastifyPluginAsync = async (fastify) => {
  const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  fastify.decorate('ably', ably);

  fastify.get('/token', async (request, reply) => {
    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    const company = await fastify.prisma.company.findFirst({ 
      where: { userId: authUser.id } 
    });
    if (!company) return reply.status(404).send({ error: 'no company' });

    try {
      const tokenRequest = await ably.auth.createTokenRequest({
        clientId: authUser.id,
        capability: {
          [`chat:${company.id}`]: ['subscribe', 'publish']
        }
      });

      return reply.send({ token: tokenRequest });
    } catch (error) {
      fastify.log.error('Failed to generate Ably token:', error as Error);
      return reply.status(500).send({ error: 'Failed to generate chat token' });
    }
  });

  fastify.post('/', async (request, reply) => {
    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const { text } = parsed.data;

    try {
      const company = await fastify.prisma.company.findFirst({ 
        where: { userId: authUser.id } 
      });
      if (!company) return reply.status(404).send({ error: 'no company' });

      const message = await fastify.prisma.message.create({
        data: { 
          companyId: company.id, 
          userId: authUser.id, 
          sender: authUser.name, 
          text 
        },
      });

      const channel = ably.channels.get(`chat:${company.id}`);
      await channel.publish('message', {
        text: message.text,
        sender: message.sender,
        userId: message.userId,
        createdAt: message.createdAt.toISOString(),
        companyId: message.companyId
      });

      return reply.send({
        id: message.id,
        text: message.text,
        sender: message.sender,
        userId: message.userId,
        createdAt: message.createdAt,
        companyId: message.companyId
      });
    } catch (error) {
      fastify.log.error('Failed to send message:', error as Error);
      return reply.status(500).send({ error: 'Failed to send message' });
    }
  });

  fastify.get('/', async (request, reply) => {
      const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    const { page = 1, limit = 50 } = request.query as any;
    const skip = (page - 1) * limit;

    try {
      const company = await fastify.prisma.company.findFirst({ 
        where: { userId: authUser.id } 
      });
      if (!company) return reply.status(404).send({ error: 'no company' });

      const [messages, total] = await Promise.all([
        fastify.prisma.message.findMany({
          where: { companyId: company.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            text: true,
            sender: true,
            userId: true,
            createdAt: true,
            companyId: true
          }
        }),
        fastify.prisma.message.count({
          where: { companyId: company.id }
        })
      ]);

      return reply.send({
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      fastify.log.error('Failed to fetch messages:', error as Error);
      return reply.status(500).send({ error: 'Failed to fetch messages' });
    }
  });
};

export default messageRoutes;
