import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const { productId, days = 30 } = req.query;
  // Получаем историю продаж за последние 90 дней
  const movements = await prisma.stockMovement.findMany({
    where: { productId: productId as string, type: 'OUTBOUND' },
    orderBy: { createdAt: 'asc' },
  });
  const sales = movements.map(m => m.quantity); // дневные продажи
  const forecast = simpleExponentialSmoothing(sales, days);
  res.json({ forecast });
});

function simpleExponentialSmoothing(data: number[], steps: number, alpha = 0.3) {
  if (data.length === 0) return new Array(steps).fill(0);
  let last = data[0];
  for (let i = 1; i < data.length; i++) {
    last = alpha * data[i] + (1 - alpha) * last;
  }
  return new Array(steps).fill(last);
}