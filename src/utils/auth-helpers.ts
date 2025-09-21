import { FastifyRequest, FastifyReply } from 'fastify';

export function requireAuthentication(request: FastifyRequest, reply: FastifyReply): { id: string; email: string; name: string } | null {
  if (!request.user) {
    reply.status(401).send({ 
      error: 'Authentication required',
      message: 'Please provide a valid authentication token' 
    });
    return null;
  }
  return request.user;
}

export async function getUserCompany(
  prisma: any, 
  userId: string, 
  reply: FastifyReply
): Promise<any | null> {
  try {
    const company = await prisma.company.findFirst({ 
      where: { userId } 
    });
    
    if (!company) {
      reply.status(404).send({ 
        error: 'Company not found',
        message: 'No company associated with this user' 
      });
      return null;
    }
    
    return company;
  } catch (error) {
    reply.status(500).send({ 
      error: 'Database error',
      message: 'Failed to fetch company information' 
    });
    return null;
  }
}

export function handleError(
  reply: FastifyReply, 
  statusCode: number, 
  error: string
): void;
export function handleError(
  reply: FastifyReply, 
  statusCode: number, 
  error: string, 
  message: string | unknown | string[]
): void;
export function handleError(
  reply: FastifyReply, 
  statusCode: number, 
  error: string, 
  message?: string | unknown | string[]
): void {
  const messageText = Array.isArray(message) 
    ? message.join(' ') 
    : typeof message === 'string' 
      ? message 
      : error;
      
  reply.status(statusCode).send({
    error,
    message: messageText,
    timestamp: new Date().toISOString()
  });
}

export function sendSuccess<T>(
  reply: FastifyReply, 
  data?: T, 
  message: string = 'Operation completed successfully'
): void {
  const response: any = { 
    success: true, 
    message 
  };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  reply.send(response);
}
