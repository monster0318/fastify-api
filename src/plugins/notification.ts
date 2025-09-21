// notificationPlugin.ts
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Knock from '@knocklabs/node';

const notificationPlugin = fp(async (fastify: FastifyInstance) => {
  const knock = process.env.KNOCK_API_KEY
    ? new Knock({ apiKey: process.env.KNOCK_API_KEY })
    : null;

  // Decorate the fastify instance with a sendNotification method
  fastify.decorate(
    'sendNotification',
    async (userId: string, type: string, message: string) => {
      try {
        if (!userId || !type || !message) {
          throw new Error('Missing required notification parameters');
        }

        const validatedMessage = message.trim();
        if (validatedMessage.length > 500) {
          throw new Error('Notification message too long (max 500 characters)');
        }

        // Create notification in your database first (this is a good practice)
        const notification = await fastify.prisma.notification.create({
          data: {
            userId,
            type: type.toLowerCase().trim(),
            message: validatedMessage,
          },
        });

        // Trigger the Knock workflow if Knock is configured
        if (knock && process.env.KNOCK_WORKFLOW_ID) {
          try {
            await knock.workflows.trigger(process.env.KNOCK_WORKFLOW_ID, {
              recipients: [userId], // Sends only to the specified user
              data: {
                message: validatedMessage,
                type: type.toLowerCase().trim(),
              },
            });
          } 
          catch (knockError) {
            fastify.log.error('Knock workflow trigger failed:', knockError);
          }
        } 
        else {
          fastify.log.warn('Knock API key or workflow ID not configured. Skipping Knock notification.');
        }

        return notification;
      } catch (error) {
        fastify.log.error('Failed to send notification:', error);
        throw error;
      }
    }
  );
});

export default notificationPlugin;
