import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req: any, res: any) => {
  if (req.method === 'POST') {
    const { productId, triggerLevel, orderQuantity } = req.body;
    const rule = await prisma.autoOrder.create({
      data: {
        productId: String(productId),
        triggerLevel: Number(triggerLevel),
        orderQuantity: Number(orderQuantity),
        userId: req.user.id,   // обязательно!
      },
    });
    return res.json(rule);
  }
  if (req.method === 'GET') {
    const rules = await prisma.autoOrder.findMany({ include: { product: true } });
    return res.json(rules);
  }
  res.status(405).end();
});
