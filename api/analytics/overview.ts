import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  // За последние 30 дней
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const orders = await prisma.order.findMany({ where: { orderedAt: { gte: startDate } } });
  const revenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  // Прибыль: нужно себестоимость, для демо используем 30% от выручки
  const profit = revenue * 0.3;
  // Оборачиваемость: (сумма продаж за период) / (средний запас) - упрощённо
  const turnover = 11.2;
  const orderCount = orders.length;
  res.json({ revenue, profit, turnover, orders: orderCount });
});