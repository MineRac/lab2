import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { product: true },
    orderBy: { orderedAt: 'desc' },
    take: 50,
  });
  // Добавляем искусственное поле confidence для совместимости с фронтом
  const enriched = orders.map(o => ({ ...o, confidence: 85 }));
  res.json(enriched);
});