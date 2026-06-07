import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const months = parseInt(req.query.months as string) || 6;
  // Генерируем последние N месяцев
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleString('ru', { month: 'short' });
    // Здесь можно сделать реальную агрегацию по заказам, но для демо случайные данные
    // В реальности: группировка по месяцам
    result.push({ month: monthName, revenue: 2000000 + Math.random() * 2000000 });
  }
  res.json(result);
});