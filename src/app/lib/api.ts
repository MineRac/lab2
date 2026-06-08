export type InventoryStatus = 'В наличии' | 'Низкий запас' | 'Критический';
export type OrderStatus = 'completed' | 'processing' | 'pending' | 'scheduled' | 'paused' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  completed: 'Выполнен',
  processing: 'В обработке',
  pending: 'Ожидает подтверждения',
  scheduled: 'Запланирован',
  paused: 'Приостановлен',
  cancelled: 'Отменён'
};

export function getOrderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export interface User {
  id: string;
  username: string;
  role: string;
}

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

export interface Category {
  id: string;
  name: string;
  createdAt: string;
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

export interface Supplier {
  id: string;
  name: string;
  deliveryDays: number;
  createdAt: string;
}

export interface SettingsData {
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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'inventory.auth.token';
const USER_KEY = 'inventory.auth.user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function storeAuth(data: { token: string; user: User }) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = 'Ошибка запроса к серверу';
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const data = await request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  return storeAuth(data);
}

export async function setupFirstUser(username: string, password: string) {
  const data = await request<{ token: string; user: User }>('/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  return storeAuth(data);
}

export const api = {
  authStatus: () => request<{ hasUsers: boolean }>('/auth/status'),
  setupFirstUser,
  getInventory: (params: { search?: string; category?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return request<InventoryItem[]>(`/inventory${qs ? `?${qs}` : ''}`);
  },
  createInventoryItem: (item: Omit<InventoryItem, 'id' | 'status'>) => request<InventoryItem>('/inventory', {
    method: 'POST',
    body: JSON.stringify(item)
  }),
  deleteInventoryItem: (id: string) => request<void>(`/inventory/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }),
  getOrders: () => request<AutoOrder[]>('/orders'),
  createOrder: (order: Pick<AutoOrder, 'product' | 'quantity' | 'supplier'> & Partial<AutoOrder>) => request<AutoOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify(order)
  }),
  updateOrderStatus: (id: string, status: OrderStatus) => request<AutoOrder>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  deleteOrder: (id: string) => request<void>(`/orders/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }),
  runMlAutoOrders: () => request<MlAutoOrderRunResult>('/ml/auto-orders/run', {
    method: 'POST'
  }),
  getStockMovements: () => request<StockMovement[]>('/stock-movements'),
  getSalesHistory: () => request<SalesRecord[]>('/sales-history'),
  simulateSale: (input: SimulateSaleInput) => request<SimulateSaleResult>('/sales-history/simulate', {
    method: 'POST',
    body: JSON.stringify(input)
  }),
  getMlForecasts: () => request<MlForecast[]>('/ml/forecasts'),
  generateMlForecasts: () => request<MlForecast[]>('/ml/forecasts/generate', {
    method: 'POST'
  }),
  getSuppliers: () => request<Supplier[]>('/suppliers'),
  createSupplier: (name: string, deliveryDays: number) => request<Supplier>('/suppliers', {
    method: 'POST',
    body: JSON.stringify({ name, deliveryDays })
  }),
  updateSupplier: (id: string, patch: Partial<Pick<Supplier, 'name' | 'deliveryDays'>>) => request<Supplier>(`/suppliers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  }),
  deleteSupplier: (id: string) => request<void>(`/suppliers/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }),
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (name: string) => request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify({ name })
  }),
  deleteCategory: (id: string) => request<void>(`/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }),
  getDashboard: () => request<DashboardData>('/dashboard'),
  getSettings: () => request<SettingsData>('/settings'),
  updateSettings: (settings: Partial<SettingsData>) => request<SettingsData>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
};
