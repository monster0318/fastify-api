import { FastifyPluginAsync } from 'fastify';
import { requireAuthentication } from '../utils/auth-helpers.js';

const capTableRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const authUser = requireAuthentication(request, reply);
    if (!authUser) return;

    const capTable = [
      { owner: 'Alice', shares: 5000, class: 'Common' },
      { owner: 'Bob', shares: 3000, class: 'Common' },
      { owner: 'Investor 1', shares: 2000, class: 'Preferred' },
    ];

    const totalShares = capTable.reduce((sum, row) => sum + row.shares, 0);

    const capTableWithPercent = capTable.map((row) => ({
      ...row,
      percent: ((row.shares / totalShares) * 100).toFixed(2) + '%',
    }));

    return { capTable: capTableWithPercent, totalShares };
  });
};

export default capTableRoutes;
