import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  if (req.method === 'GET') {
    const { search, category, limit = '20', page = '1', sort = 'createdAt:desc' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (category && category !== 'all') where.category = category as string;

    const [data, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: parseInt(limit as string), orderBy: { [sort.split(':')[0]]: sort.split(':')[1] as any } }),
      prisma.product.count({ where }),
    ]);
    return res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  }
  if (req.method === 'POST') {
    const { sku, name, category, price, stock, minStock, location } = req.body;
    const product = await prisma.product.create({
      data: { sku, name, category, price: parseFloat(price), stock: parseInt(stock), minStock: parseInt(minStock), location },
    });
    return res.json(product);
  }
  res.status(405).end();
});