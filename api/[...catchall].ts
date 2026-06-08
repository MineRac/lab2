// api/[...catchall].ts
import { withAuth } from '../lib/authMiddleware';
import { prisma } from '../lib/db';
import { StockMovementType } from '@prisma/client';

export default async function handler(req: any, res: any) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  // Все запросы (кроме /api/auth/login) идут через withAuth
  return withAuth(async (req: any, res: any) => {
    const path = (req.url || '').split('?')[0];
    const method = (req.method || '').toUpperCase();

    // ---------- dashboard ----------
    if (path === '/api/dashboard/stats' && method === 'GET') {
      const totalProducts = await prisma.product.count();
      const totalValueAgg = await prisma.product.aggregate({ _sum: { price: true } });
      const totalValue = totalValueAgg._sum.price || 0;
      const lowStock = await prisma.product.count({ where: { stock: { lt: 20 } } });
      return res.json({ totalProducts, totalValue, lowStock, mlAccuracy: 94.3 });
    }

    // ---------- analytics ----------
    if (path === '/api/analytics/turnover' && method === 'GET') {
      const period = req.query.period as string || '6months';
      const months = period === '12months' ? 12 : 6;
      const data: { month: string; quantity: number }[] = [];
      for (let i = 0; i < months; i++) {
        data.push({ month: `Месяц ${i+1}`, quantity: 3000 + Math.random() * 3000 });
      }
      return res.json(data);
    }

    if (path === '/api/analytics/revenue' && method === 'GET') {
      const months = parseInt(req.query.months as string) || 6;
      const result: { month: string; revenue: number }[] = [];
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('ru', { month: 'short' });
        result.push({ month: monthName, revenue: 2000000 + Math.random() * 2000000 });
      }
      return res.json(result);
    }

    if (path === '/api/analytics/categories' && method === 'GET') {
      const categories = await prisma.product.groupBy({
        by: ['category'],
        _sum: { price: true },
      });
      const total = categories.reduce((sum, c) => sum + (c._sum.price || 0), 0);
      const result = categories.map(c => ({
        name: c.category,
        value: total ? Math.round(((c._sum.price || 0) / total) * 100) : 0,
      }));
      return res.json(result);
    }

    if (path === '/api/analytics/overview' && method === 'GET') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const orders = await prisma.order.findMany({
        where: { orderedAt: { gte: startDate } },
      });
      const revenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const profit = revenue * 0.3;
      const turnover = 11.2;
      const orderCount = orders.length;
      return res.json({ revenue, profit, turnover, orders: orderCount });
    }

    if (path === '/api/analytics/seasonality' && method === 'GET') {
      const data = [
        { month: 'Янв', sales: 3200 }, { month: 'Фев', sales: 2900 }, { month: 'Мар', sales: 3400 },
        { month: 'Апр', sales: 3800 }, { month: 'Май', sales: 4100 }, { month: 'Июн', sales: 4500 },
        { month: 'Июл', sales: 4200 }, { month: 'Авг', sales: 3900 }, { month: 'Сен', sales: 5200 },
        { month: 'Окт', sales: 4800 }, { month: 'Ноя', sales: 6100 }, { month: 'Дек', sales: 5800 },
      ];
      return res.json(data);
    }

    if (path === '/api/analytics/turnover-by-category' && method === 'GET') {
      const categories = await prisma.product.groupBy({ by: ['category'] });
      const result = categories.map(c => ({
        category: c.category,
        turnover: Math.random() * 10 + 5,
      }));
      return res.json(result);
    }

    // ---------- inventory (список товаров) ----------
    if (path === '/api/inventory' && method === 'GET') {
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

    if (path === '/api/inventory' && method === 'POST') {
      const { sku, name, category, price, stock, minStock, location } = req.body;
      const product = await prisma.product.create({
        data: {
          sku, name, category,
          price: parseFloat(price), stock: parseInt(stock), minStock: parseInt(minStock), location,
        },
      });
      return res.json(product);
    }

    // Обработка /api/inventory/:id
    const invMatch = path.match(/^\/api\/inventory\/([^\/]+)$/);
    if (invMatch) {
      const id = invMatch[1];
      if (method === 'GET') {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        return res.json(product);
      }
      if (method === 'PUT') {
        const { sku, name, category, price, stock, minStock, location } = req.body;
        const product = await prisma.product.update({
          where: { id },
          data: { sku, name, category, price, stock, minStock, location },
        });
        return res.json(product);
      }
      if (method === 'DELETE') {
        await prisma.product.delete({ where: { id } });
        return res.status(204).end();
      }
    }

    // ---------- predictions (заглушки) ----------
    if (path === '/api/predictions/model-info' && method === 'GET') {
      return res.json({ accuracy: 94.3, predictionsCount: 2847, avgConfidence: 91.8, savings: 1200000 });
    }
    if (path === '/api/predictions/forecast' && method === 'GET') {
      const weeks = parseInt(req.query.weeks as string) || 8;
      const data: { week: string; predicted: number }[] = [];
      for (let i = 1; i <= weeks; i++) {
        data.push({ week: `Неделя ${i}`, predicted: 800 + Math.random() * 400 });
      }
      return res.json(data);
    }
    if (path === '/api/predictions/restock-recommendations' && method === 'GET') {
      const products = await prisma.product.findMany({ where: { stock: { lt: 50 } }, take: 5 });
      const recommendations = products.map(p => ({
        productId: p.id,
        productName: p.name,
        currentStock: p.stock,
        recommendedOrder: Math.max(0, p.minStock - p.stock + 20),
        confidence: 85 + Math.random() * 10,
      }));
      return res.json(recommendations);
    }

    // ---------- auto-orders ----------
    if (path === '/api/auto-orders' && method === 'GET') {
      const rules = await prisma.autoOrder.findMany({ include: { product: true } });
      return res.json(rules);
    }
    if (path === '/api/auto-orders/run' && method === 'POST') {
      // Заглушка – можно реализовать позже
      return res.json({ created: 0, orders: [] });
    }
    if (path === '/api/auto-orders/history' && method === 'GET') {
      const orders = await prisma.order.findMany({ include: { product: true }, orderBy: { orderedAt: 'desc' }, take: 50 });
      const enriched = orders.map(o => ({ ...o, confidence: 85 }));
      return res.json(enriched);
    }

    // ---------- orders/history ----------
    if (path === '/api/orders/history' && method === 'GET') {
      const orders = await prisma.order.findMany({ include: { product: true }, orderBy: { orderedAt: 'desc' }, take: 50 });
      const enriched = orders.map(o => ({ ...o, confidence: 85 }));
      return res.json(enriched);
    }

    // ---------- settings ----------
    if (path === '/api/settings' && method === 'POST') {
      const { enabled, confidenceThreshold } = req.body;
      return res.json({ success: true, enabled, confidenceThreshold });
    }

    // ---------- Не найдено ----------
    res.status(404).json({ error: 'API endpoint not found' });
  })(req, res);
}
