import { createClient } from '@supabase/supabase-js';
import { getMlRecommendation } from './mlClient.js';

export type InventoryStatus = 'В наличии' | 'Низкий запас' | 'Критический';
export type OrderStatus = 'completed' | 'processing' | 'pending' | 'scheduled' | 'paused' | 'cancelled';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
  status: InventoryStatus;
  location: string;
}

export interface AutoOrder {
  id: string;
  product: string;
  quantity: number;
  supplier: string;
  predictedStock: number;
  aiConfidence: number;
  orderValue: number;
  status: OrderStatus;
  createdAt: string;
  deliveryDate: string;
  reason: string;
}

export interface Settings {
  mlEnabled: boolean;
  mlConfidenceThreshold: number;
  mlUpdateFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  mlTrainingDataDays: number;
  autoOrderEnabled: boolean;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  orderBuffer: number;
  approvalRequired: boolean;
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  orderConfirmations: boolean;
  mlRecommendations: boolean;
  defaultSupplier: string;
  orderLeadTime: number;
  autoOrderStrategy: 'ml_forecast' | 'min_stock' | 'hybrid';
  orderPriority: 'critical_only' | 'critical_and_low' | 'all_below_min';
  notificationEmail: string;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
  seasonalityMode: 'auto' | 'manual';
  seasonalityCoefficients: Record<string, number>;
}

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'manager';
}

export interface Supplier {
  id: string;
  name: string;
  deliveryDays: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface DashboardData {
  totalItems: number;
  totalValue: number;
  lowStock: number;
  activeOrders: number;
  mlAccuracy: number | null;
}

export interface MlAutoOrderRunResult {
  created: AutoOrder[];
  skipped: string[];
  message: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'inbound' | 'outbound' | 'adjustment';
  quantity: number;
  source: string;
  createdAt: string;
}

export interface SalesRecord {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  soldAt: string;
}

export interface SimulateSaleInput {
  productId: string;
  quantity: number;
  soldAt?: string;
  discountPercent?: number;
}

export interface SimulateSaleResult {
  sale: SalesRecord;
  item: InventoryItem;
}

export interface MlForecast {
  id: string;
  productId: string;
  productName: string;
  forecastDate: string;
  horizonLabel: string;
  actualDemand: number;
  predictedDemand: number;
  confidence: number;
  recommendedOrder: number;
  leadDays: number;
  status: 'Критическая' | 'Средняя' | 'Низкая';
  createdAt: string;
}

export function calculateStatus(quantity: number, minStock: number): InventoryStatus {
  if (quantity <= Math.ceil(minStock * 0.35)) return 'Критический';
  if (quantity < minStock) return 'Низкий запас';
  return 'В наличии';
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

let supabaseClient: ReturnType<typeof createClient> | null = null;

function validateSupabaseConfig() {
  if (!supabaseUrl) throw new Error('SUPABASE_URL не указан в .env');
  if (supabaseUrl.includes('YOUR_PROJECT_ID') || supabaseUrl.includes('xxxxxxxx')) {
    throw new Error('SUPABASE_URL всё ещё содержит placeholder. Вставьте Project URL из Supabase.');
  }
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error('SUPABASE_URL должен выглядеть как https://project-ref.supabase.co');
  }
  if (!supabaseServiceRoleKey && !supabaseAnonKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY или SUPABASE_ANON_KEY не указан в .env');
  }
  const key = supabaseServiceRoleKey ?? supabaseAnonKey!;
  if (key.includes('YOUR_') || key.length < 40) {
    throw new Error('Supabase key выглядит как placeholder или слишком короткий. Вставьте реальный ключ из Supabase Dashboard.');
  }
}

function db() {
  validateSupabaseConfig();
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseServiceRoleKey ?? supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabaseClient;
}

export function formatSupabaseError(error: unknown) {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    const causeMessage = cause instanceof Error ? ` Причина: ${cause.message}` : '';
    if (error.message === 'fetch failed') {
      return `Не удалось подключиться к Supabase.${causeMessage} Проверьте SUPABASE_URL, ключи, интернет/DNS и перезапустите backend.`;
    }
    return error.message + causeMessage;
  }

  if (typeof error === 'object' && error !== null) {
    const anyError = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [anyError.message, anyError.details, anyError.hint, anyError.code].filter(Boolean);
    if (anyError.message === 'TypeError: fetch failed' || anyError.details === 'TypeError: fetch failed') {
      return 'Не удалось подключиться к Supabase. Проверьте SUPABASE_URL, ключи, интернет/DNS и перезапустите backend.';
    }
    if (parts.length > 0) return parts.join(' | ');
  }

  return 'Неизвестная ошибка Supabase';
}

function throwIfError(error: unknown) {
  if (error) throw new Error(formatSupabaseError(error));
}

export async function checkSupabaseConnection() {
  const { error } = await db().from('app_users').select('id', { head: true, count: 'exact' });
  throwIfError(error);
  return { ok: true };
}

function toInventoryItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    minStock: row.min_stock,
    price: Number(row.price),
    status: row.status,
    location: row.location
  };
}

function fromInventoryItem(item: Omit<InventoryItem, 'status'> & { status?: InventoryStatus }) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    min_stock: item.minStock,
    price: item.price,
    status: item.status ?? calculateStatus(item.quantity, item.minStock),
    location: item.location
  };
}

function toOrder(row: any): AutoOrder {
  return {
    id: row.id,
    product: row.product,
    quantity: row.quantity,
    supplier: row.supplier,
    predictedStock: row.predicted_stock,
    aiConfidence: row.ai_confidence,
    orderValue: Number(row.order_value),
    status: row.status,
    createdAt: row.created_at_display ?? new Date(row.created_at).toLocaleString('ru-RU'),
    deliveryDate: row.delivery_date,
    reason: row.reason
  };
}

function fromOrder(order: AutoOrder) {
  return {
    id: order.id,
    product: order.product,
    quantity: order.quantity,
    supplier: order.supplier,
    predicted_stock: order.predictedStock,
    ai_confidence: order.aiConfidence,
    order_value: order.orderValue,
    status: order.status,
    created_at_display: order.createdAt,
    delivery_date: order.deliveryDate,
    reason: order.reason
  };
}

function toSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    deliveryDays: row.delivery_days ?? 7,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString('ru-RU') : ''
  };
}

function toCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString('ru-RU') : ''
  };
}

function toStockMovement(row: any): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    type: row.type,
    quantity: row.quantity,
    source: row.source,
    createdAt: row.created_at
  };
}

function toSalesRecord(row: any): SalesRecord {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    category: row.category,
    quantity: row.quantity,
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    soldAt: row.sold_at
  };
}

function toMlForecast(row: any): MlForecast {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    forecastDate: row.forecast_date,
    horizonLabel: row.horizon_label,
    actualDemand: row.actual_demand,
    predictedDemand: row.predicted_demand,
    confidence: row.confidence,
    recommendedOrder: row.recommended_order,
    leadDays: row.lead_days,
    status: row.status,
    createdAt: row.created_at
  };
}

function toSettings(row: any): Settings {
  return {
    mlEnabled: row.ml_enabled,
    mlConfidenceThreshold: row.ml_confidence_threshold,
    mlUpdateFrequency: row.ml_update_frequency,
    mlTrainingDataDays: row.ml_training_data_days,
    autoOrderEnabled: row.auto_order_enabled,
    minOrderQuantity: row.min_order_quantity,
    maxOrderQuantity: row.max_order_quantity,
    orderBuffer: row.order_buffer,
    approvalRequired: row.approval_required,
    emailNotifications: row.email_notifications,
    lowStockAlerts: row.low_stock_alerts,
    orderConfirmations: row.order_confirmations,
    mlRecommendations: row.ml_recommendations,
    defaultSupplier: row.default_supplier,
    orderLeadTime: row.order_lead_time,
    autoOrderStrategy: row.auto_order_strategy ?? 'ml_forecast',
    orderPriority: row.order_priority ?? 'critical_only',
    notificationEmail: row.notification_email ?? '',
    digestFrequency: row.digest_frequency ?? 'daily',
    seasonalityMode: row.seasonality_mode ?? 'auto',
    seasonalityCoefficients: row.seasonality_coefficients ?? {}
  };
}

function fromSettings(settings: Settings) {
  return {
    id: 1,
    ml_enabled: settings.mlEnabled,
    ml_confidence_threshold: settings.mlConfidenceThreshold,
    ml_update_frequency: settings.mlUpdateFrequency,
    ml_training_data_days: settings.mlTrainingDataDays,
    auto_order_enabled: settings.autoOrderEnabled,
    min_order_quantity: settings.minOrderQuantity,
    max_order_quantity: settings.maxOrderQuantity,
    order_buffer: settings.orderBuffer,
    approval_required: settings.approvalRequired,
    email_notifications: settings.emailNotifications,
    low_stock_alerts: settings.lowStockAlerts,
    order_confirmations: settings.orderConfirmations,
    ml_recommendations: settings.mlRecommendations,
    default_supplier: settings.defaultSupplier,
    order_lead_time: settings.orderLeadTime,
    auto_order_strategy: settings.autoOrderStrategy,
    order_priority: settings.orderPriority,
    notification_email: settings.notificationEmail,
    digest_frequency: settings.digestFrequency,
    seasonality_mode: settings.seasonalityMode,
    seasonality_coefficients: settings.seasonalityCoefficients ?? {}
  };
}

export async function hasUsers(): Promise<boolean> {
  const { count, error } = await db()
    .from('app_users')
    .select('id', { count: 'exact', head: true });
  throwIfError(error);
  return Number(count ?? 0) > 0;
}

export async function createFirstUser(username: string, password: string): Promise<AppUser> {
  if (await hasUsers()) throw new Error('SETUP_ALREADY_COMPLETED');
  const row = { id: `USR-${Date.now()}`, username, password, role: 'admin' as const };
  const { data, error } = await db().from('app_users').insert(row).select('id, username, password, role').single();
  throwIfError(error);
  return data as AppUser;
}

export async function findUser(username: string, password: string): Promise<AppUser | null> {
  const { data, error } = await db()
    .from('app_users')
    .select('id, username, password, role')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();
  throwIfError(error);
  return data as AppUser | null;
}

export async function listInventory(filters: { search?: string; category?: string; status?: string } = {}) {
  let query = db().from('inventory').select('*').order('created_at', { ascending: false });
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map(toInventoryItem);
}

async function recordStockMovement(input: Omit<StockMovement, 'id' | 'createdAt'>) {
  const row = {
    id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_id: input.productId,
    product_name: input.productName,
    type: input.type,
    quantity: input.quantity,
    source: input.source
  };

  const { error } = await db().from('stock_movements').insert(row);
  throwIfError(error);
}

export async function createInventoryItem(body: Omit<InventoryItem, 'id' | 'status'>) {
  const { data: ids, error: idsError } = await db().from('inventory').select('id');
  throwIfError(idsError);
  const max = (ids ?? []).reduce((n, row: any) => Math.max(n, Number(String(row.id).replace('SKU-', '')) || 0), 0);
  const id = `SKU-${String(max + 1).padStart(3, '0')}`;
  const row = fromInventoryItem({ id, ...body });
  const { data, error } = await db().from('inventory').insert(row).select('*').single();
  throwIfError(error);
  if (body.quantity > 0) {
    await recordStockMovement({
      productId: id,
      productName: body.name,
      type: 'inbound',
      quantity: body.quantity,
      source: 'Создание товара'
    });
  }
  return toInventoryItem(data);
}

export async function updateInventoryItem(id: string, patch: Partial<InventoryItem>) {
  const currentRows = await listInventory({});
  const current = currentRows.find((item) => item.id === id);
  if (!current) return null;
  const next = { ...current, ...patch };
  next.status = calculateStatus(Number(next.quantity), Number(next.minStock));
  const { data, error } = await db().from('inventory').update(fromInventoryItem(next)).eq('id', id).select('*').single();
  throwIfError(error);
  return toInventoryItem(data);
}

export async function deleteInventoryItem(id: string) {
  const { data, error } = await db().from('inventory').delete().eq('id', id).select('id');
  throwIfError(error);
  return Boolean(data?.length);
}

export async function listOrders() {
  const { data, error } = await db().from('orders').select('*').order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(toOrder);
}

export async function createOrder(order: AutoOrder) {
  const { data, error } = await db().from('orders').insert(fromOrder(order)).select('*').single();
  throwIfError(error);
  return toOrder(data);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { data: existing, error: existingError } = await db().from('orders').select('*').eq('id', id).maybeSingle();
  throwIfError(existingError);
  if (!existing) return null;
  if (existing.status === 'completed' && status !== 'completed') return 'completed_locked' as const;

  if (status === 'completed' && existing.status !== 'completed') {
    const { data: item, error: itemError } = await db()
      .from('inventory')
      .select('*')
      .eq('name', existing.product)
      .maybeSingle();
    throwIfError(itemError);

    if (item) {
      const nextQuantity = Number(item.quantity) + Number(existing.quantity);
      const nextStatus = calculateStatus(nextQuantity, Number(item.min_stock));
      const { error: updateInventoryError } = await db()
        .from('inventory')
        .update({ quantity: nextQuantity, status: nextStatus })
        .eq('id', item.id);
      throwIfError(updateInventoryError);

      await recordStockMovement({
        productId: item.id,
        productName: existing.product,
        type: 'inbound',
        quantity: Number(existing.quantity),
        source: `Выполненный заказ ${id}`
      });

      const unitCost = Number(item.price);
      const revenue = Number(existing.order_value);
      const cost = Math.min(revenue, unitCost * Number(existing.quantity));
      const { error: salesError } = await db().from('sales_history').insert({
        id: `SALE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        product_id: item.id,
        product_name: existing.product,
        category: item.category,
        quantity: Number(existing.quantity),
        revenue,
        cost,
        sold_at: new Date().toISOString()
      });
      throwIfError(salesError);
    }
  }

  const { data, error } = await db().from('orders').update({ status }).eq('id', id).select('*').single();
  throwIfError(error);
  return toOrder(data);
}

export async function deleteOrder(id: string) {
  const { data: existing, error: existingError } = await db().from('orders').select('id,status').eq('id', id).maybeSingle();
  throwIfError(existingError);
  if (!existing) return null;
  if (existing.status !== 'cancelled') return 'not_cancelled' as const;

  const { data, error } = await db().from('orders').delete().eq('id', id).select('id');
  throwIfError(error);
  return Boolean(data?.length);
}


export async function listSuppliers() {
  const { data, error } = await db().from('suppliers').select('*').order('name', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(toSupplier);
}

export async function createSupplier(name: string, deliveryDays = 7) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Название поставщика не указано');

  const { data: existing, error: existingError } = await db()
    .from('suppliers')
    .select('*')
    .ilike('name', normalizedName)
    .maybeSingle();
  throwIfError(existingError);
  if (existing) return toSupplier(existing);

  const row = { id: `SUP-${Date.now()}`, name: normalizedName, delivery_days: deliveryDays };
  const { data, error } = await db().from('suppliers').insert(row).select('*').single();
  throwIfError(error);
  return toSupplier(data);
}

export async function updateSupplier(id: string, patch: { name?: string; deliveryDays?: number }) {
  const next: Record<string, string | number> = {};
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.deliveryDays !== undefined) next.delivery_days = patch.deliveryDays;

  const { data, error } = await db().from('suppliers').update(next).eq('id', id).select('*').maybeSingle();
  throwIfError(error);
  return data ? toSupplier(data) : null;
}

export async function deleteSupplier(id: string) {
  const { data, error } = await db().from('suppliers').delete().eq('id', id).select('id');
  throwIfError(error);
  return Boolean(data?.length);
}

export async function listCategories() {
  const { data, error } = await db().from('categories').select('*').order('name', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(toCategory);
}

export async function createCategory(name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Название категории не указано');

  const { data: existing, error: existingError } = await db()
    .from('categories')
    .select('*')
    .ilike('name', normalizedName)
    .maybeSingle();
  throwIfError(existingError);
  if (existing) return toCategory(existing);

  const row = { id: `CAT-${Date.now()}`, name: normalizedName };
  const { data, error } = await db().from('categories').insert(row).select('*').single();
  throwIfError(error);
  return toCategory(data);
}

export async function deleteCategory(id: string) {
  const { data: category, error: categoryError } = await db().from('categories').select('*').eq('id', id).maybeSingle();
  throwIfError(categoryError);
  if (!category) return null;

  const { count, error: countError } = await db()
    .from('inventory')
    .select('id', { count: 'exact', head: true })
    .eq('category', category.name);
  throwIfError(countError);
  if (Number(count ?? 0) > 0) return 'in_use' as const;

  const { data, error } = await db().from('categories').delete().eq('id', id).select('id');
  throwIfError(error);
  return Boolean(data?.length);
}

function calculateMlConfidence(item: InventoryItem) {
  if (item.minStock <= 0) return 0;
  const shortageRatio = Math.max(0, (item.minStock - item.quantity) / item.minStock);
  return Math.min(99, Math.max(70, Math.round(82 + shortageRatio * 17)));
}

function getRecommendedMlOrderQuantity(item: InventoryItem, settings: Settings) {
  const baseTarget = item.minStock + Math.ceil(item.minStock * (settings.orderBuffer / 100));

  switch (settings.autoOrderStrategy) {
    case 'min_stock': {
      const recommended = item.minStock - item.quantity;
      return Math.max(settings.minOrderQuantity, Math.min(settings.maxOrderQuantity, recommended));
    }
    case 'hybrid': {
      const hybridTarget = baseTarget + Math.ceil(item.minStock * 0.15);
      const recommended = hybridTarget - item.quantity;
      return Math.max(settings.minOrderQuantity, Math.min(settings.maxOrderQuantity, recommended));
    }
    case 'ml_forecast':
    default: {
      const recommended = baseTarget - item.quantity;
      return Math.max(settings.minOrderQuantity, Math.min(settings.maxOrderQuantity, recommended));
    }
  }
}

function shouldCreateAutoOrder(item: InventoryItem, settings: Settings) {
  const isCritical = item.quantity <= Math.ceil(item.minStock * 0.35);
  const isLow = item.quantity < item.minStock;

  switch (settings.orderPriority) {
    case 'critical_only':
      return isCritical;
    case 'critical_and_low':
      return isCritical || isLow;
    case 'all_below_min':
      return isLow;
    default:
      return isLow;
  }
}


function monthNumber(date = new Date()) {
  return date.getMonth() + 1;
}

async function getAverageDemandByProduct(productId: string, fallback: number) {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data, error } = await db()
    .from('sales_history')
    .select('quantity, sold_at')
    .eq('product_id', productId)
    .gte('sold_at', since.toISOString());

  throwIfError(error);

  const rows = data ?? [];
  if (rows.length === 0) return Math.max(1, fallback);

  const total = rows.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0);
  const days = Math.max(1, Math.ceil((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000)));
  return Math.max(1, Number((total / days).toFixed(2)));
}

async function getPipelineQuantity(productName: string) {
  const orders = await listOrders();
  return orders
    .filter((order) => order.product === productName && ['pending', 'processing', 'scheduled'].includes(order.status))
    .reduce((sum, order) => sum + order.quantity, 0);
}

export async function runMlAutoOrders(): Promise<MlAutoOrderRunResult> {
  const settings = await getSettings();

  if (!settings.mlEnabled) {
    return { created: [], skipped: [], message: 'ML-модуль выключен в настройках' };
  }

  if (!settings.autoOrderEnabled) {
    return { created: [], skipped: [], message: 'Автоматическое создание заказов выключено в настройках' };
  }

  const [inventory, orders, suppliers] = await Promise.all([
    listInventory({}),
    listOrders(),
    listSuppliers()
  ]);

  if (suppliers.length === 0) {
    return { created: [], skipped: [], message: 'Нет поставщиков для создания ML-заказов' };
  }

  const activeProducts = new Set(
    orders
      .filter((order) => ['pending', 'processing', 'scheduled', 'paused'].includes(order.status))
      .map((order) => order.product)
  );

  const created: AutoOrder[] = [];
  const skipped: string[] = [];
  const supplier = suppliers.find((item) => item.name === settings.defaultSupplier) ?? suppliers[0];

  for (const item of inventory) {
    if (!shouldCreateAutoOrder(item, settings)) continue;

    if (activeProducts.has(item.name)) {
      skipped.push(`${item.name}: уже есть активный заказ`);
      continue;
    }

    const confidence = calculateMlConfidence(item);
    if (confidence < settings.mlConfidenceThreshold) {
      skipped.push(`${item.name}: уверенность ML ${confidence}% ниже порога ${settings.mlConfidenceThreshold}%`);
      continue;
    }

    const fallbackQuantity = getRecommendedMlOrderQuantity(item, settings);
    const avgDemand = await getAverageDemandByProduct(item.id, Math.max(1, item.minStock / 7));
    const pipeline = await getPipelineQuantity(item.name);

    const mlRecommendation = await getMlRecommendation({
      inventory: item.quantity,
      backlog: 0,
      pipeline,
      month: monthNumber(),
      avg_demand: avgDemand,
      category: item.category,
      min_stock: item.minStock,
      max_order: settings.maxOrderQuantity,
      unit_price: item.price
    });

    const quantity = Math.max(
      settings.minOrderQuantity,
      Math.min(settings.maxOrderQuantity, mlRecommendation?.recommended_order ?? fallbackQuantity)
    );

    const effectiveConfidence = mlRecommendation
      ? Math.round(mlRecommendation.confidence * 100)
      : confidence;

    const deliveryDate = new Date(Date.now() + supplier.deliveryDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const status: OrderStatus = settings.approvalRequired ? 'pending' : 'processing';

    const order = await createOrder({
      id: `AI-${Date.now()}-${item.id}`,
      product: item.name,
      quantity,
      supplier: supplier.name,
      predictedStock: item.quantity,
      aiConfidence: Math.max(0, Math.min(100, effectiveConfidence)),
      orderValue: item.price * quantity,
      status,
      createdAt: new Date().toLocaleString('ru-RU'),
      deliveryDate,
      reason: mlRecommendation
        ? `ML-${mlRecommendation.policy}: ${mlRecommendation.reason} Остаток ${item.quantity}, pipeline ${pipeline}, средний спрос ${avgDemand}`
        : `${settings.autoOrderStrategy === 'min_stock' ? 'Минимальный запас' : settings.autoOrderStrategy === 'hybrid' ? 'Гибридная стратегия' : 'ML fallback'}: остаток ${item.quantity}, минимальный запас ${item.minStock}`
    });

    activeProducts.add(item.name);
    created.push(order);
  }

  return {
    created,
    skipped,
    message: created.length > 0
      ? `Создано ML-заказов: ${created.length}`
      : 'Новых ML-заказов не создано'
  };
}

export async function getSettings() {
  const { data, error } = await db().from('settings').select('*').eq('id', 1).maybeSingle();
  throwIfError(error);
  if (data) return toSettings(data);

  const defaultSettings: Settings = {
    mlEnabled: true,
    mlConfidenceThreshold: 85,
    mlUpdateFrequency: 'daily',
    mlTrainingDataDays: 90,
    autoOrderEnabled: true,
    minOrderQuantity: 10,
    maxOrderQuantity: 1000,
    orderBuffer: 20,
    approvalRequired: false,
    emailNotifications: true,
    lowStockAlerts: true,
    orderConfirmations: true,
    mlRecommendations: true,
    defaultSupplier: '',
    orderLeadTime: 7,
    autoOrderStrategy: 'ml_forecast',
    orderPriority: 'critical_only',
    notificationEmail: '',
    digestFrequency: 'daily',
    seasonalityMode: 'auto',
    seasonalityCoefficients: {}
  };
  const { data: created, error: createError } = await db()
    .from('settings')
    .insert(fromSettings(defaultSettings))
    .select('*')
    .single();
  throwIfError(createError);
  return toSettings(created);
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  const next = { ...current, ...patch } as Settings;
  const { data, error } = await db().from('settings').upsert(fromSettings(next)).select('*').single();
  throwIfError(error);
  return toSettings(data);
}


export async function listStockMovements() {
  const { data, error } = await db().from('stock_movements').select('*').order('created_at', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(toStockMovement);
}


export async function simulateSale(input: SimulateSaleInput): Promise<SimulateSaleResult | 'not_found' | 'insufficient_stock'> {
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 0));
  const discountPercent = Math.max(0, Math.min(100, Number(input.discountPercent ?? 0)));
  const soldAt = input.soldAt ? new Date(input.soldAt) : new Date();
  const currentRows = await listInventory({});
  const item = currentRows.find((row) => row.id === input.productId);

  if (!item) return 'not_found';
  if (item.quantity < quantity) return 'insufficient_stock';

  const salePrice = Number((item.price * (1 - discountPercent / 100)).toFixed(2));
  const revenue = Number((salePrice * quantity).toFixed(2));
  const cost = Number((item.price * 0.62 * quantity).toFixed(2));

  const saleRow = {
    id: `SALE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_id: item.id,
    product_name: item.name,
    category: item.category,
    quantity,
    revenue,
    cost,
    sold_at: Number.isNaN(soldAt.getTime()) ? new Date().toISOString() : soldAt.toISOString()
  };

  const nextQuantity = item.quantity - quantity;
  const updatedItem = {
    ...item,
    quantity: nextQuantity,
    status: calculateStatus(nextQuantity, item.minStock)
  };

  const { data: updatedInventory, error: inventoryError } = await db()
    .from('inventory')
    .update(fromInventoryItem(updatedItem))
    .eq('id', item.id)
    .select('*')
    .single();
  throwIfError(inventoryError);

  const { data: saleData, error: saleError } = await db()
    .from('sales_history')
    .insert(saleRow)
    .select('*')
    .single();
  throwIfError(saleError);

  await recordStockMovement({
    productId: item.id,
    productName: item.name,
    type: 'outbound',
    quantity,
    source: 'Симуляция продажи'
  });

  return {
    sale: toSalesRecord(saleData),
    item: toInventoryItem(updatedInventory)
  };
}

export async function listSalesHistory() {
  const { data, error } = await db().from('sales_history').select('*').order('sold_at', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(toSalesRecord);
}

export async function listMlForecasts() {
  const { data, error } = await db().from('ml_forecasts').select('*').order('forecast_date', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(toMlForecast);
}

function calculateForecastConfidence(item: InventoryItem, historicalDemand: number, orderCount: number) {
  if (item.minStock <= 0) return 0;
  const shortageRatio = Math.max(0, (item.minStock - item.quantity) / item.minStock);
  const historyScore = Math.min(25, orderCount * 5);
  const shortageScore = Math.min(25, Math.round(shortageRatio * 25));
  return Math.min(99, 50 + historyScore + shortageScore);
}

export async function generateMlForecasts() {
  const [inventory, orders, settings, suppliers] = await Promise.all([
    listInventory({}),
    listOrders(),
    getSettings(),
    listSuppliers()
  ]);

  const avgLeadDays = suppliers.length > 0
    ? Math.round(suppliers.reduce((sum, supplier) => sum + supplier.deliveryDays, 0) / suppliers.length)
    : settings.orderLeadTime;

  const today = new Date().toISOString().slice(0, 10);
  const rows = inventory
    .map((item) => {
      const productOrders = orders.filter((order) => order.product === item.name && order.status === 'completed');
      const historicalDemand = productOrders.reduce((sum, order) => sum + order.quantity, 0);
      const shortage = Math.max(0, item.minStock - item.quantity);
      const demandBase = historicalDemand > 0 ? Math.ceil(historicalDemand / Math.max(1, productOrders.length)) : item.minStock;
      const rawSeasonalityCoefficient = settings.seasonalityMode === 'manual'
        ? Number(settings.seasonalityCoefficients?.[item.category] ?? 1)
        : 1;
      const seasonalityCoefficient = Number.isFinite(rawSeasonalityCoefficient) && rawSeasonalityCoefficient > 0
        ? rawSeasonalityCoefficient
        : 1;
      const predictedDemand = Math.max(shortage, Math.ceil(demandBase * seasonalityCoefficient));
      const recommendedOrder = Math.max(settings.minOrderQuantity, Math.min(settings.maxOrderQuantity, predictedDemand + Math.ceil(item.minStock * (settings.orderBuffer / 100)) - item.quantity));
      const confidence = calculateForecastConfidence(item, historicalDemand, productOrders.length);
      const urgencyRatio = item.minStock > 0 ? item.quantity / item.minStock : 1;
      const status = urgencyRatio <= 0.45 ? 'Критическая' : urgencyRatio < 1 ? 'Средняя' : 'Низкая';

      return {
        id: `FC-${today}-${item.id}`,
        product_id: item.id,
        product_name: item.name,
        forecast_date: today,
        horizon_label: today,
        actual_demand: historicalDemand,
        predicted_demand: Math.max(0, predictedDemand),
        confidence,
        recommended_order: Math.max(0, recommendedOrder),
        lead_days: avgLeadDays,
        status
      };
    })
    .filter((row) => row.predicted_demand > 0 || row.recommended_order > 0);

  if (rows.length === 0) return [];

  const { data, error } = await db()
    .from('ml_forecasts')
    .upsert(rows, { onConflict: 'id' })
    .select('*')
    .order('forecast_date', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(toMlForecast);
}


export async function getDashboard() {
  const [inventory, orders] = await Promise.all([listInventory({}), listOrders()]);
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const lowStock = inventory.filter((item) => item.quantity < item.minStock).length;
  const activeOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  const aiOrders = orders.filter((order) => order.aiConfidence > 0);
  const successfulAiOrders = aiOrders.filter((order) => ['completed', 'processing'].includes(order.status));
  const mlAccuracy = aiOrders.length > 0
    ? Number(((successfulAiOrders.length / aiOrders.length) * 100).toFixed(1))
    : null;

  return { totalItems, totalValue, lowStock, activeOrders: activeOrders.length, mlAccuracy };
}
