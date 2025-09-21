import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
interface AuthUser {
  id: string;
  email: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

const AUTHENTICATION_CONFIG = {
  ROUTES_PREFIX: '/api/auth',
  ME_ENDPOINT: '/api/auth/me',
  BEARER_PREFIX: 'Bearer ',
  UNAUTHORIZED_STATUS_CODE: 401,
} as const;

async function authenticationPlugin(fastify: FastifyInstance): Promise<void> {
  if (!fastify.hasRequestDecorator('user')) {
    fastify.decorateRequest('user', null as any);
  }

  const extractJwtToken = (authorizationHeader?: string): string | null => {
    if (!authorizationHeader?.startsWith(AUTHENTICATION_CONFIG.BEARER_PREFIX)) {
      return null;
    }
    
    const token = authorizationHeader.slice(AUTHENTICATION_CONFIG.BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : null;
  };

  const shouldSkipAuthentication = (requestUrl?: string): boolean => {
    if (!requestUrl) return false;
    
    return requestUrl.startsWith(AUTHENTICATION_CONFIG.ROUTES_PREFIX) && 
           !requestUrl.endsWith(AUTHENTICATION_CONFIG.ME_ENDPOINT);
  };

  const verifyJwtToken = async (token: string): Promise<AuthUser> => {
    try {
      const payload = await fastify.jwt.verify<JWTPayload>(token);

      if (!payload.userId || !payload.email) {
        throw new Error('Invalid token payload: missing required fields');
      }
      
      return { 
        id: payload.userId, 
        email: payload.email 
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Token verification failed: ${error.message}`);
      }
      throw new Error('Token verification failed: unknown error');
    }
  };

  const handleAuthError = (
    request: FastifyRequest,
    reply: FastifyReply,
    errorMessage: string,
    errorType: string
  ): void => {
    request.log.warn(
      {
        error: errorMessage,
        errorType,
        url: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      },
      'Authentication failed'
    );

    reply.status(AUTHENTICATION_CONFIG.UNAUTHORIZED_STATUS_CODE).send({
      error: 'Authentication required',
      message: 'Please provide a valid authentication token',
      timestamp: new Date().toISOString(),
    });
  };

  fastify.addHook('preHandler', async (request, reply) => {
    if (shouldSkipAuthentication(request.raw.url)) {
      return;
    }

    try {
      const jwtToken = extractJwtToken(request.headers.authorization);
      if (!jwtToken) {
        return handleAuthError(
          request, 
          reply, 
          'No authentication token provided', 
          'MISSING_TOKEN'
        );
      }

      const authenticatedUser = await verifyJwtToken(jwtToken);
      request.user = authenticatedUser;

      request.log.debug(
        { 
          userId: authenticatedUser.id, 
          email: authenticatedUser.email,
          timestamp: new Date().toISOString(),
        },
        'User authenticated successfully'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      handleAuthError(
        request,
        reply,
        errorMessage,
        'TOKEN_VERIFICATION_FAILED'
      );
    }
  });
}

export default fp(authenticationPlugin);
