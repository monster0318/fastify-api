
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Knock from '@knocklabs/node';
import Ably from 'ably';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    virusScan: {
      scanFile(fileBuffer: Buffer, filename: string): Promise<{ clean: boolean; threats?: string[] }>;
      scanMultipleFiles(files: Array<{ buffer: Buffer; filename: string }>): Promise<Array<{ clean: boolean; threats?: string[] }>>;
    };
    sendNotification(userId: string, type: string, message: string): Promise<{ id: string; createdAt: Date; userId: string; type: string; message: string; readAt: Date | null; }>;
    knock?: Knock;
    ably?: Ably.Rest;
  }
  
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
    };
  }
}
