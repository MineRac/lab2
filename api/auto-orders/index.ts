import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const rules = await prisma.autoOrder.findMany({ include: { product: true } });
    return res.json(rules);
  }
  if (req.method === 'POST') {
    const { productId, triggerLevel, orderQuantity } = req.body;
    const rule = await prisma.autoOrder.create({
      data: { productId, triggerLevel: parseInt(triggerLevel), orderQuantity: parseInt(orderQuantity) },
    });
    return res.json(rule);
  }
  res.status(405).end();
});
