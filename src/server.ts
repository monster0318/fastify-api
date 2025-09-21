import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifycookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const server = Fastify({ logger: false });

await server.register(cors, { 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});
await server.register(helmet);
await server.register(fastifycookie);
await server.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });
await server.register(multipart, {
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_BYTES || 8_000_000) }
});
await server.register(websocket);

server.decorate('prisma', prisma);


const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });


import registerRoutes from './routes/index.ts';
import authenticationPlugin from './plugins/authentication.ts';
import notificationPlugin from './plugins/notification.ts';
import rateLimitPlugin from './plugins/rate-limiting.ts';
import virusScanPlugin from './plugins/virus-scanning.ts';

await server.register(notificationPlugin);
await server.register(authenticationPlugin);
await server.register(rateLimitPlugin);
await server.register(virusScanPlugin);
await registerRoutes(server);

const port = Number(process.env.PORT || 4000);
server.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server listening at ${address}`);
});
