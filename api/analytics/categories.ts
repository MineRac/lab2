import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const categories = await prisma.product.groupBy({
    by: ['category'],
    _sum: { price: true },
  });
  const total = categories.reduce((sum, c) => sum + (c._sum.price || 0), 0);
  const result = categories.map(c => ({
    name: c.category,
    value: total ? Math.round(((c._sum.price || 0) / total) * 100) : 0,
  }));
  res.json(result);
});