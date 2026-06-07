import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const rules = await prisma.autoOrder.findMany({ where: { isActive: true }, include: { product: true } });
  for (const rule of rules) {
    if (rule.product.stock <= rule.triggerLevel) {
      await prisma.order.create({
        data: {
          productId: rule.productId,
          quantity: rule.orderQuantity,
          status: 'PENDING',
          totalPrice: rule.orderQuantity * rule.product.price,
        },
      });
      await prisma.autoOrder.update({ where: { id: rule.id }, data: { lastTriggeredAt: new Date() } });
    }
  }
  res.json({ message: 'Auto‑orders processed' });
});