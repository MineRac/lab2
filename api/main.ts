// api/[...catchall].ts
import { withAuth } from '../lib/authMiddleware';
import { prisma } from '../lib/db';
import { StockMovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../lib/jwt';

// ----------------------------------------------------------------------
//  Маршрутизация (публичные эндпоинты)
// ----------------------------------------------------------------------
export default async function handler(req: any, res: any) {
  const { url, method } = req;

  // --- auth (public) ---
  if (url === '/api/auth/login' && method === 'POST') {
    return handleLogin(req, res);
  }
  if (url === '/api/auth/logout' && method === 'POST') {
    return handleLogout(req, res);
  }

  // --- всё остальное требует авторизации ---
  return withAuth(async (req: any, res: any) => {
    const { url, method } = req;

    // --- auth (protected) ---
    if (url === '/api/auth/me' && method === 'GET') {
      return handleMe(req, res);
    }

    // --- analytics ---
    if (url === '/api/analytics/categories' && method === 'GET') {
      return handleCategories(req, res);
    }
    if (url === '/api/analytics/overview' && method === 'GET') {
      return handleOverview(req, res);
    }
    if (url === '/api/analytics/revenue' && method === 'GET') {
      return handleRevenue(req, res);
    }
    if (url === '/api/analytics/seasonality' && method === 'GET') {
      return handleSeasonality(req, res);
    }
    if (url === '/api/analytics/turnover' && method === 'GET') {
      return handleTurnover(req, res);
    }
    if (url === '/api/analytics/turnover-by-category' && method === 'GET') {
      return handleTurnoverByCategory(req, res);
    }

    // --- predictions ---
    if (url === '/api/predictions/demand' && method === 'GET') {
      return handleDemand(req, res);
    }
    if (url === '/api/predictions/restock' && method === 'GET') {
      return handleRestock(req, res);
    }
    if (url === '/api/predictions/forecast' && method === 'GET') {
      return handleForecast(req, res);
    }

    // --- orders ---
    if (url === '/api/orders/history' && method === 'GET') {
      return handleOrdersHistory(req, res);
    }

    // --- settings ---
    if (url === '/api/settings' && method === 'POST') {
      return handleSettings(req, res);
    }

    // --- auto-orders (коллекция) ---
    if (url === '/api/auto-orders' && method === 'GET') {
      return handleGetAutoOrders(req, res);
    }
    if (url === '/api/auto-orders' && method === 'POST') {
      return handleCreateAutoOrder(req, res);
    }
    if (url === '/api/auto-orders/run' && method === 'POST') {
      return handleRunAutoOrders(req, res);
    }

    // --- auto-orders (один элемент) ---
    // URL вида /api/auto-orders/123
    const match = url.match(/^\/api\/auto-orders\/([^\/]+)$/);
    if (match) {
      const id = match[1];
      if (method === 'GET') {
        return handleGetAutoOrderById(req, res, id);
      }
      if (method === 'PUT') {
        return handleUpdateAutoOrder(req, res, id);
      }
      if (method === 'DELETE') {
        return handleDeleteAutoOrder(req, res, id);
      }
    }

    res.status(404).json({ error: 'API endpoint not found' });
  })(req, res);
}

// ----------------------------------------------------------------------
//  Публичные обработчики (login / logout)
// ----------------------------------------------------------------------
async function handleLogin(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user.id, user.role);
  res.json({ token, user: { id: user.id, email, name: user.name, role: user.role } });
}

async function handleLogout(req: any, res: any) {
  // Клиент сам удаляет токен; можно добавить чёрный список, но для простоты:
  res.status(200).json({ message: 'Logged out successfully' });
}

// ----------------------------------------------------------------------
//  Защищённые обработчики (withAuth)
// ----------------------------------------------------------------------
async function handleMe(req: any, res: any) {
  const userId = req.user.userId; // предположим, что withAuth кладёт userId в req.user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json(user);
}

// ---------- analytics ----------
async function handleCategories(req: any, res: any) {
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
}

async function handleOverview(req: any, res: any) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const orders = await prisma.order.findMany({
    where: { orderedAt: { gte: startDate } },
  });
  const revenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const profit = revenue * 0.3;
  const turnover = 11.2;
  const orderCount = orders.length;
  res.json({ revenue, profit, turnover, orders: orderCount });
}

async function handleRevenue(req: any, res: any) {
  const months = parseInt(req.query.months as string) || 6;
  const result: { month: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleString('ru', { month: 'short' });
    result.push({ month: monthName, revenue: 2000000 + Math.random() * 2000000 });
  }
  res.json(result);
}

async function handleSeasonality(req: any, res: any) {
  const data = [
    { month: 'Янв', sales: 3200 }, { month: 'Фев', sales: 2900 }, { month: 'Мар', sales: 3400 },
    { month: 'Апр', sales: 3800 }, { month: 'Май', sales: 4100 }, { month: 'Июн', sales: 4500 },
    { month: 'Июл', sales: 4200 }, { month: 'Авг', sales: 3900 }, { month: 'Сен', sales: 5200 },
    { month: 'Окт', sales: 4800 }, { month: 'Ноя', sales: 6100 }, { month: 'Дек', sales: 5800 },
  ];
  res.json(data);
}

async function handleTurnover(req: any, res: any) {
  const period = req.query.period as string || '6months';
  const months = period === '12months' ? 12 : 6;
  const data: { month: string; quantity: number }[] = [];
  for (let i = 0; i < months; i++) {
    data.push({ month: `Месяц ${i+1}`, quantity: 3000 + Math.random() * 3000 });
  }
  res.json(data);
}

async function handleTurnoverByCategory(req: any, res: any) {
  const categories = await prisma.product.groupBy({ by: ['category'] });
  const result = categories.map(c => ({
    category: c.category,
    turnover: Math.random() * 10 + 5,
  }));
  res.json(result);
}

// ---------- predictions ----------
async function handleDemand(req: any, res: any) {
  const { productId, days = 30 } = req.query;
  const movements = await prisma.stockMovement.findMany({
    where: {
      productId: productId as string,
      type: StockMovementType.OUT,
    },
    orderBy: { createdAt: 'asc' },
  });
  const sales = movements.map(m => m.quantity);
  const forecast = simpleExponentialSmoothing(sales, Number(days));
  res.json({ forecast });
}

function simpleExponentialSmoothing(data: number[], steps: number, alpha = 0.3) {
  if (data.length === 0) return new Array(steps).fill(0);
  let last = data[0];
  for (let i = 1; i < data.length; i++) {
    last = alpha * data[i] + (1 - alpha) * last;
  }
  return new Array(steps).fill(last);
}

async function handleRestock(req: any, res: any) {
  const allProducts = await prisma.product.findMany();
  const products = allProducts.filter(p => p.stock < p.minStock);
  const recommendations: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    recommendedOrder: any;
    confidence: any;
  }> = [];

  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  for (const product of products) {
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          current_stock: product.stock,
          min_stock: product.minStock,
          max_stock: product.maxStock,
          history: await getDemandHistory(product.id),
        }),
      });
      const mlData = await mlResponse.json();
      recommendations.push({
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        recommendedOrder: mlData.recommended_order,
        confidence: mlData.confidence,
      });
    } catch (err) {
      console.error(`ML error for ${product.id}`, err);
    }
  }
  res.json(recommendations);
}

async function getDemandHistory(productId: string, days = 30) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      productId,
      type: StockMovementType.OUT,
      createdAt: { gte: new Date(Date.now() - days * 86400000) },
    },
    orderBy: { createdAt: 'asc' },
  });
  return movements.map(m => m.quantity);
}

async function handleForecast(req: any, res: any) {
  const weeks = parseInt(req.query.weeks as string) || 8;
  const data: { week: string; predicted: number }[] = [];
  for (let i = 1; i <= weeks; i++) {
    data.push({ week: `Неделя ${i}`, predicted: 800 + Math.random() * 400 });
  }
  res.json(data);
}

// ---------- orders ----------
async function handleOrdersHistory(req: any, res: any) {
  const orders = await prisma.order.findMany({
    include: { product: true },
    orderBy: { orderedAt: 'desc' },
    take: 50,
  });
  const enriched = orders.map(o => ({ ...o, confidence: 85 }));
  res.json(enriched);
}

// ---------- settings ----------
async function handleSettings(req: any, res: any) {
  const { enabled, confidenceThreshold } = req.body;
  // Здесь можно сохранить в базу данных, например, в таблицу Setting
  // Пока просто возвращаем успех
  res.json({ success: true, enabled, confidenceThreshold });
}

// ---------- auto-orders (коллекция) ----------
async function handleGetAutoOrders(req: any, res: any) {
  const rules = await prisma.autoOrder.findMany({ include: { product: true } });
  res.json(rules);
}

async function handleCreateAutoOrder(req: any, res: any) {
  const { productId, triggerLevel, orderQuantity } = req.body;
  const rule = await prisma.autoOrder.create({
    data: {
      productId: String(productId),
      triggerLevel: Number(triggerLevel),
      orderQuantity: Number(orderQuantity),
      userId: req.user.userId, // используем userId из req.user
    },
  });
  res.json(rule);
}

async function handleRunAutoOrders(req: any, res: any) {
  const rules = await prisma.autoOrder.findMany({
    where: { isActive: true },
    include: { product: true },
  });
  const createdOrders: Awaited<ReturnType<typeof prisma.order.create>>[] = [];
  for (const rule of rules) {
    if (rule.product.stock <= rule.triggerLevel) {
      const order = await prisma.order.create({
        data: {
          productId: rule.productId,
          quantity: rule.orderQuantity,
          status: 'PENDING',
          totalPrice: rule.orderQuantity * rule.product.price,
        },
      });
      createdOrders.push(order);
      await prisma.autoOrder.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date() },
      });
    }
  }
  res.json({ created: createdOrders.length, orders: createdOrders });
}

// ---------- auto-orders (один элемент) ----------
async function handleGetAutoOrderById(req: any, res: any, id: string) {
  const rule = await prisma.autoOrder.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!rule) return res.status(404).json({ error: 'Auto order rule not found' });
  res.json(rule);
}

async function handleUpdateAutoOrder(req: any, res: any, id: string) {
  const { triggerLevel, orderQuantity, isActive } = req.body;
  try {
    const updated = await prisma.autoOrder.update({
      where: { id },
      data: {
        triggerLevel: triggerLevel !== undefined ? Number(triggerLevel) : undefined,
        orderQuantity: orderQuantity !== undefined ? Number(orderQuantity) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Rule not found' });
    throw error;
  }
}

async function handleDeleteAutoOrder(req: any, res: any, id: string) {
  try {
    await prisma.autoOrder.delete({ where: { id } });
    res.status(204).end();
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Rule not found' });
    throw error;
  }
}
