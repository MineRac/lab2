import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  createFirstUser,
  createInventoryItem,
  createOrder,
  createCategory,
  deleteOrder,
  createSupplier,
  updateSupplier,
  deleteCategory,
  deleteInventoryItem,
  deleteSupplier,
  findUser,
  getDashboard,
  hasUsers,
  getSettings,
  listCategories,
  listInventory,
  listOrders,
  listSalesHistory,
  listStockMovements,
  listSuppliers,
  listMlForecasts,
  generateMlForecasts,
  runMlAutoOrders,
  simulateSale,
  updateInventoryItem,
  updateOrderStatus,
  updateSettings,
  checkSupabaseConnection,
  formatSupabaseError,
  type OrderStatus
} from './db.js';

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const distPath = path.resolve(process.cwd(), 'dist');
const indexHtmlPath = path.join(distPath, 'index.html');

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://lab2-beryl.vercel.app',
  'https://lab2-git-main-mineracs-projects.vercel.app',
  'https://lab2-bny619abz-mineracs-projects.vercel.app'
];

const allowedOrigins = (process.env.CLIENT_ORIGINS ?? process.env.CLIENT_ORIGIN ?? defaultAllowedOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true
}));
app.use(express.json());

type AuthRequest = Request & { user?: { id: string; username: string; role: string } };

function sign(user: { id: string; username: string; role: string }) {
  return jwt.sign(user, jwtSecret, { expiresIn: '8h' });
}

function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ message: 'Требуется авторизация' });

  try {
    req.user = jwt.verify(token, jwtSecret) as AuthRequest['user'];
    next();
  } catch {
    return res.status(401).json({ message: 'Недействительный или просроченный токен' });
  }
}

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const setupSchema = z.object({ username: z.string().min(3), password: z.string().min(6) });
const inventorySchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  quantity: z.coerce.number().int().nonnegative(),
  minStock: z.coerce.number().int().nonnegative(),
  price: z.coerce.number().nonnegative(),
  location: z.string().min(1)
});
const supplierSchema = z.object({ name: z.string().min(2), deliveryDays: z.coerce.number().int().min(1).max(365).optional().default(7) });
const categorySchema = z.object({ name: z.string().min(2) });

const simulateSaleSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  soldAt: z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0)
});


const orderSchema = z.object({
  product: z.string().min(2),
  quantity: z.coerce.number().int().positive(),
  supplier: z.string().min(2),
  predictedStock: z.coerce.number().int().nonnegative().optional().default(0),
  aiConfidence: z.coerce.number().min(0).max(100).optional().default(0),
  orderValue: z.coerce.number().nonnegative().optional().default(0),
  status: z.enum(['completed', 'processing', 'pending', 'scheduled', 'paused', 'cancelled']).optional().default('pending'),
  deliveryDate: z.string().optional(),
  reason: z.string().optional().default('Создано вручную')
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/health/db', async (_req, res, next) => {
  try {
    res.json(await checkSupabaseConnection());
  } catch (err) {
    next(err);
  }
});

app.get('/api/auth/status', async (_req, res, next) => {
  try {
    res.json({ hasUsers: await hasUsers() });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/setup', async (req, res, next) => {
  try {
    const body = setupSchema.parse(req.body);
    const user = await createFirstUser(body.username, body.password);
    const safeUser = { id: user.id, username: user.username, role: user.role };
    return res.status(201).json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    if (err instanceof Error && err.message === 'SETUP_ALREADY_COMPLETED') {
      return res.status(409).json({ message: 'Первичный администратор уже создан' });
    }
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await findUser(body.username, body.password);
    if (!user) return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    const safeUser = { id: user.id, username: user.username, role: user.role };
    return res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    next(err);
  }
});

app.get('/api/me', auth, (req: AuthRequest, res) => res.json({ user: req.user }));

app.get('/api/inventory', auth, async (req, res, next) => {
  try {
    const { search = '', category = 'all', status = 'all' } = req.query;
    const rows = await listInventory({
      search: String(search || ''),
      category: String(category || 'all'),
      status: String(status || 'all')
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/inventory', auth, async (req, res, next) => {
  try {
    const body = inventorySchema.parse(req.body);
    const item = await createInventoryItem(body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/inventory/:id', auth, async (req, res, next) => {
  try {
    const item = await updateInventoryItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ message: 'Товар не найден' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/inventory/:id', auth, async (req, res, next) => {
  try {
    const deleted = await deleteInventoryItem(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Товар не найден' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/api/categories', auth, async (_req, res, next) => {
  try {
    res.json(await listCategories());
  } catch (err) {
    next(err);
  }
});

app.post('/api/categories', auth, async (req, res, next) => {
  try {
    const body = categorySchema.parse(req.body);
    res.status(201).json(await createCategory(body.name));
  } catch (err) {
    next(err);
  }
});

app.delete('/api/categories/:id', auth, async (req, res, next) => {
  try {
    const deleted = await deleteCategory(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Категория не найдена' });
    if (deleted === 'in_use') return res.status(409).json({ message: 'Нельзя удалить категорию, пока к ней привязаны товары' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders', auth, async (_req, res, next) => {
  try {
    res.json(await listOrders());
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders', auth, async (req, res, next) => {
  try {
    const body = orderSchema.parse(req.body);
    const [suppliers, inventory] = await Promise.all([listSuppliers(), listInventory({})]);
    const selectedSupplier = suppliers.find((supplier) => supplier.name === body.supplier);
    const selectedItem = inventory.find((item) => item.name === body.product);
    const deliveryDays = selectedSupplier?.deliveryDays ?? 7;
    const deliveryDate = body.deliveryDate ?? new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const orderValue = body.orderValue > 0 ? body.orderValue : selectedItem ? selectedItem.price * body.quantity : 0;
    const predictedStock = body.predictedStock > 0 ? body.predictedStock : selectedItem?.quantity ?? 0;
    const order = await createOrder({
      id: `MO-${Date.now()}`,
      ...body,
      predictedStock,
      orderValue,
      status: body.status as OrderStatus,
      createdAt: new Date().toLocaleString('ru-RU'),
      deliveryDate
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

app.get('/api/suppliers', auth, async (_req, res, next) => {
  try {
    res.json(await listSuppliers());
  } catch (err) {
    next(err);
  }
});

app.post('/api/suppliers', auth, async (req, res, next) => {
  try {
    const body = supplierSchema.parse(req.body);
    res.status(201).json(await createSupplier(body.name, body.deliveryDays));
  } catch (err) {
    next(err);
  }
});


app.patch('/api/suppliers/:id', auth, async (req, res, next) => {
  try {
    const body = supplierSchema.partial().parse(req.body);
    const supplier = await updateSupplier(req.params.id, body);
    if (!supplier) return res.status(404).json({ message: 'Поставщик не найден' });
    res.json(supplier);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/suppliers/:id', auth, async (req, res, next) => {
  try {
    const deleted = await deleteSupplier(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Поставщик не найден' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.patch('/api/orders/:id/status', auth, async (req, res, next) => {
  try {
    const statusSchema = z.object({ status: z.enum(['completed', 'processing', 'pending', 'scheduled', 'paused', 'cancelled']) });
    const { status } = statusSchema.parse(req.body);
    const order = await updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ message: 'Заказ не найден' });
    if (order === 'completed_locked') return res.status(409).json({ message: 'Выполненный заказ нельзя изменить' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/orders/:id', auth, async (req, res, next) => {
  try {
    const deleted = await deleteOrder(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Заказ не найден' });
    if (deleted === 'not_cancelled') return res.status(409).json({ message: 'Удалить можно только отменённый заказ' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post('/api/ml/auto-orders/run', auth, async (_req, res, next) => {
  try {
    res.json(await runMlAutoOrders());
  } catch (err) {
    next(err);
  }
});

app.get('/api/stock-movements', auth, async (_req, res, next) => {
  try {
    res.json(await listStockMovements());
  } catch (err) {
    next(err);
  }
});

app.get('/api/sales-history', auth, async (_req, res, next) => {
  try {
    res.json(await listSalesHistory());
  } catch (err) {
    next(err);
  }
});

app.post('/api/sales-history/simulate', auth, async (req, res, next) => {
  try {
    const body = simulateSaleSchema.parse(req.body);
    const result = await simulateSale(body);
    if (result === 'not_found') return res.status(404).json({ message: 'Товар не найден' });
    if (result === 'insufficient_stock') return res.status(409).json({ message: 'Недостаточно товара на складе' });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/ml/forecasts', auth, async (_req, res, next) => {
  try {
    res.json(await listMlForecasts());
  } catch (err) {
    next(err);
  }
});

app.post('/api/ml/forecasts/generate', auth, async (_req, res, next) => {
  try {
    res.json(await generateMlForecasts());
  } catch (err) {
    next(err);
  }
});

app.get('/api/settings', auth, async (_req, res, next) => {
  try {
    res.json(await getSettings());
  } catch (err) {
    next(err);
  }
});

app.put('/api/settings', auth, async (req, res, next) => {
  try {
    res.json(await updateSettings(req.body));
  } catch (err) {
    next(err);
  }
});

app.get('/api/dashboard', auth, async (_req, res, next) => {
  try {
    res.json(await getDashboard());
  } catch (err) {
    next(err);
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API endpoint не найден' });
});

if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(indexHtmlPath));
} else {
  app.get('/', (_req, res) => {
    res.type('html').send(`
      <main style="font-family: system-ui, sans-serif; max-width: 760px; margin: 48px auto; line-height: 1.5">
        <h1>Backend работает</h1>
        <p>Это API-сервер проекта. В режиме разработки фронтенд открывается отдельно:</p>
        <p><a href="http://localhost:5173">http://localhost:5173</a></p>
        <p>Проверка API: <a href="/api/health">/api/health</a></p>
        <p>Чтобы открыть всё с одного адреса, выполните:</p>
        <pre style="background:#f4f4f5;padding:12px;border-radius:8px">npm run build
npm run start</pre>
      </main>
    `);
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ message: 'Ошибка валидации', issues: err.issues });
  const message = formatSupabaseError(err);
  console.error('[server error]', message);
  return res.status(500).json({ message });
});

app.listen(port, () => {
  console.log(`API server started: http://localhost:${port}`);
});
