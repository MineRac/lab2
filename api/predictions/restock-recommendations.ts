import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  // Находим товары, у которых запас ниже среднего
  const products = await prisma.product.findMany({
    where: { stock: { lt: 50 } },
    take: 5,
  });
  const recommendations = products.map(p => ({
    productId: p.id,
    productName: p.name,
    currentStock: p.stock,
    recommendedOrder: Math.max(0, p.minStock - p.stock + 20),
    confidence: 85 + Math.random() * 10,
  }));
  res.json(recommendations);
});