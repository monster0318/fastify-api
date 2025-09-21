import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { 
  validateRequestBody, 
  userRegistrationSchema, 
  userLoginSchema 
} from '../utils/validation-helpers.js';
import { sendSuccess, handleError } from '../utils/auth-helpers.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {

    const validationResult = validateRequestBody(request, userRegistrationSchema);
    if (!validationResult.success) {
      return handleError(reply, 400, 'Validation failed', validationResult.error);
    }

    const { name, email, password } = validationResult.data;

    try {

      const existingUser = await fastify.prisma.user.findUnique({ 
        where: { email } 
      });
      
      if (existingUser) {
        return handleError(reply, 400, 'Email already registered', 'An account with this email address already exists');
      }


      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);


      const newUser = await fastify.prisma.user.create({ 
        data: { 
          name, 
          email, 
          password: hashedPassword 
        } 
      });


      const authToken = fastify.jwt.sign({ 
        userId: newUser.id, 
        email: newUser.email 
      });


      reply.setCookie('session', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      sendSuccess(reply, {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        token: authToken
      }, 'Account created successfully');
    } catch (error) {
      fastify.log.error(error as Error, 'User registration error:');
      handleError(reply, 500, 'Registration failed', 'An error occurred while creating your account');
    }
  });

  fastify.post('/login', async (request, reply) => {

    const validationResult = validateRequestBody(request, userLoginSchema);
    if (!validationResult.success) {
      return handleError(reply, 400, 'Validation failed', validationResult.error);
    }

    const { email, password } = validationResult.data;

    try {

      const user = await fastify.prisma.user.findUnique({ 
        where: { email } 
      });
      
      if (!user) {
        return handleError(reply, 401, 'Invalid credentials', 'Email or password is incorrect');
      }


      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return handleError(reply, 401, 'Invalid credentials', 'Email or password is incorrect');
      }


      const authToken = fastify.jwt.sign({ 
        userId: user.id, 
        email: user.email 
      });


      reply.setCookie('session', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      sendSuccess(reply, {
        id: user.id,
        email: user.email,
        name: user.name,
        token: authToken
      }, 'Login successful');
    } catch (error) {
      fastify.log.error(error as Error, 'User login error:');
      handleError(reply, 500, 'Login failed', 'An error occurred while authenticating');
    }
  });

  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('session', { 
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    sendSuccess(reply, null, 'Logout successful');
  });

  fastify.get('/me', async (request, reply) => {

    if (!request.user) {
      return handleError(reply, 401, 'Not authenticated', 'Please log in to access this resource');
    }

    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: (request.user as any).id },
        include: {
          companies: true,
        }
      });

      if (!user) {
        return handleError(reply, 404, 'User not found', 'User account not found');
      }

      sendSuccess(reply, user);
    } catch (error) {
      fastify.log.error(error as Error, 'Failed to fetch user data:');
      handleError(reply, 500, 'Failed to fetch user data', 'An error occurred while fetching user information');
    }
  });
};

export default authRoutes;
