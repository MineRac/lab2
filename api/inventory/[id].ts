import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

export default withAuth(async (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });
  if (req.method === 'GET') {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Not found' });
    return res.json(product);
  }
  if (req.method === 'PUT') {
    const { sku, name, category, price, stock, minStock, location } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: { sku, name, category, price, stock, minStock, location },
    });
    return res.json(product);
  }
  if (req.method === 'DELETE') {
    await prisma.product.delete({ where: { id } });
    return res.status(204).end();
  }
  res.status(405).end();
});