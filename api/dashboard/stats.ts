import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const totalProducts = await prisma.product.count();
  const totalValue = (await prisma.product.aggregate({ _sum: { price: true } }))._sum.price || 0;
  const lowStock = await prisma.product.count({ where: { stock: { lt: 20 } } }); // пример
  res.json({ totalProducts, totalValue, lowStock, mlAccuracy: 94.3 });
});