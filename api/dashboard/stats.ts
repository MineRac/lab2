import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const totalProducts = await prisma.product.count();
  const totalValueAgg = await prisma.product.aggregate({ _sum: { price: true } });
  const totalValue = totalValueAgg._sum.price || 0;
  const lowStock = await prisma.product.count({ where: { stock: { lt: 20 } } }); // или lt: minStock?
  const mlAccuracy = 94.3;
  res.json({ totalProducts, totalValue, lowStock, mlAccuracy });
});