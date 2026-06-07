import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  // Упрощённо: для каждой категории считаем turnover как отношение продаж к среднему запасу
  // Здесь можно сделать сложный запрос, но для демо фиксированные данные
  const categories = await prisma.product.groupBy({ by: ['category'] });
  const result = categories.map(c => ({
    category: c.category,
    turnover: Math.random() * 10 + 5,
  }));
  res.json(result);
});