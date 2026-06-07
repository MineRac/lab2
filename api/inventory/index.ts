import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  if (req.method === 'GET') {
    const { search, category, limit = 100 } = req.query;
    const products = await prisma.product.findMany({
      where: {
        ...(search && { name: { contains: search as string, mode: 'insensitive' } }),
        ...(category && category !== 'all' && { category: category as string }),
      },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });
    return res.json(products);
  }
  if (req.method === 'POST') {
    const { sku, name, category, price, stock, minStock, location } = req.body;
    const product = await prisma.product.create({
      data: { sku, name, category, price, stock, minStock, location },
    });
    return res.json(product);
  }
  res.status(405).end();
});