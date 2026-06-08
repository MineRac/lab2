import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req: any, res: any) => {
  const rules = await prisma.autoOrder.findMany({
    where: { isActive: true },
    include: { product: true }
  });

  const createdOrders: Awaited<ReturnType<typeof prisma.order.create>>[] = [];

  for (const rule of rules) {
    if (rule.product.stock <= rule.triggerLevel) {
      const order = await prisma.order.create({
        data: {
          productId: rule.productId,
          quantity: rule.orderQuantity,
          status: 'PENDING',
          totalPrice: rule.orderQuantity * rule.product.price,
        },
      });
      createdOrders.push(order);
      await prisma.autoOrder.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date() }
      });
    }
  }
  res.json({ created: createdOrders.length, orders: createdOrders });
});
