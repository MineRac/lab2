import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Brain,
  DollarSign,
  Loader2,
  Package,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api, getOrderStatusLabel, type AutoOrder, type DashboardData, type InventoryItem, type SettingsData, type StockMovement } from '../lib/api';
import { toast } from 'sonner';

const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function calculatePercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

function formatPercentChange(value: number) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% от прошлого месяца`;
}

function getOrderBadgeClass(status: string) {
  switch (status) {
    case 'completed': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    case 'processing': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'pending': return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
    case 'scheduled': return 'bg-violet-100 text-violet-700 hover:bg-violet-100';
    case 'paused': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    case 'cancelled': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
    default: return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  }
}

function getVolumeStatus(item: InventoryItem, maxQuantity: number) {
  const quantityShare = maxQuantity > 0 ? item.quantity / maxQuantity : 0;

  if (item.quantity <= item.minStock || quantityShare <= 0.35) {
    return { label: 'Критический', className: 'bg-rose-100 text-rose-700 hover:bg-rose-100' };
  }

  if (quantityShare < 0.75) {
    return { label: 'Средний', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' };
  }

  return { label: 'Высокий', className: 'bg-slate-900 text-white hover:bg-slate-900' };
}


function buildStockHistory(movements: StockMovement[], items: InventoryItem[]) {
  if (items.length === 0) return [];

  const monthPoints = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(23, 59, 59, 999);
    date.setMonth(date.getMonth() - (5 - index) + 1, 0);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('ru-RU', { month: 'short' }),
      end: new Date(date),
    };
  });

  const currentById = new Map(items.map((item) => [item.id, { quantity: item.quantity, price: item.price }]));
  const datedMovements = movements
    .map((movement) => ({ ...movement, timestamp: new Date(movement.createdAt).getTime() }))
    .filter((movement) => Number.isFinite(movement.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp);

  const reverseMovement = (currentQuantity: number, movement: StockMovement) => {
    switch (movement.type) {
      case 'inbound':
        return currentQuantity - movement.quantity;
      case 'outbound':
        return currentQuantity + movement.quantity;
      case 'adjustment':
      default:
        return currentQuantity - movement.quantity;
    }
  };

  return monthPoints.map((point) => {
    let totalQuantity = 0;
    let totalValue = 0;

    for (const item of items) {
      let quantityAtMonthEnd = item.quantity;
      for (const movement of datedMovements) {
        if (movement.productId !== item.id) continue;
        if (movement.timestamp <= point.end.getTime()) continue;
        quantityAtMonthEnd = reverseMovement(quantityAtMonthEnd, movement);
      }
      quantityAtMonthEnd = Math.max(0, quantityAtMonthEnd);
      totalQuantity += quantityAtMonthEnd;
      totalValue += quantityAtMonthEnd * item.price;
    }

    return {
      month: point.label.charAt(0).toUpperCase() + point.label.slice(1),
      quantity: totalQuantity,
      value: totalValue,
    };
  });
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<AutoOrder[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getInventory(), api.getOrders(), api.getSettings(), api.getStockMovements()])
      .then(([dashboardData, inventoryData, orderData, settingsData, movementData]) => {
        setDashboard(dashboardData);
        setItems(inventoryData);
        setOrders(orderData);
        setSettings(settingsData);
        setMovements(movementData);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Не удалось загрузить панель управления'))
      .finally(() => setIsLoading(false));
  }, []);

  const totalProducts = items.length;
  const totalValue = dashboard?.totalValue ?? 0;
  const lowStockItems = useMemo(() => items.filter((item) => item.quantity < item.minStock), [items]);
  const aiOrders = useMemo(() => orders.filter((order) => order.aiConfidence > 0), [orders]);
  const mlAccuracy = useMemo(() => {
    if (dashboard?.mlAccuracy !== null && dashboard?.mlAccuracy !== undefined) return dashboard.mlAccuracy;
    if (aiOrders.length === 0) return null;
    const successfulAiOrders = aiOrders.filter((order) => ['completed', 'processing'].includes(order.status));
    return (successfulAiOrders.length / aiOrders.length) * 100;
  }, [dashboard, aiOrders]);

  const historyData = useMemo(() => buildStockHistory(movements, items), [movements, items]);
  const topItems = useMemo(() => [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 5), [items]);
  const maxTopQuantity = topItems[0]?.quantity ?? 1;
  const recentAiOrders = useMemo(() => aiOrders.slice(0, 3), [aiOrders]);
  const productsGrowthLabel = useMemo(() => {
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const previousProductsCount = items.filter((item) => {
      const createdAt = new Date(item.createdAt).getTime();
      return Number.isFinite(createdAt) && createdAt < startOfCurrentMonth.getTime();
    }).length;

    return formatPercentChange(calculatePercentChange(totalProducts, previousProductsCount));
  }, [items, totalProducts]);

  const totalValueGrowthLabel = useMemo(() => {
    const previousMonthValue = historyData.length >= 2 ? historyData[historyData.length - 2].value : 0;
    return formatPercentChange(calculatePercentChange(totalValue, previousMonthValue));
  }, [historyData, totalValue]);

  const recommendations = useMemo(() => {
    const result: { title: string; text: string; className: string; icon: JSX.Element }[] = [];

    if (recentAiOrders[0]) {
      result.push({
        title: 'AI создал автоматический заказ',
        text: `${recentAiOrders[0].product} — заказ на ${recentAiOrders[0].quantity} шт. подготовлен по прогнозу спроса`,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        icon: <Bot className="h-4 w-4" />,
      });
    }

    if (lowStockItems[0]) {
      result.push({
        title: 'Низкий запас обнаружен',
        text: `${lowStockItems[0].name} имеет остаток ${lowStockItems[0].quantity} при минимальном уровне ${lowStockItems[0].minStock}`,
        className: 'border-blue-200 bg-blue-50 text-blue-800',
        icon: <TrendingUp className="h-4 w-4" />,
      });
    }

    if (topItems[0]) {
      result.push({
        title: 'Максимальный остаток',
        text: `${topItems[0].name} имеет самый большой текущий остаток: ${topItems[0].quantity} шт.`,
        className: 'border-violet-200 bg-violet-50 text-violet-800',
        icon: <Sparkles className="h-4 w-4" />,
      });
    }

    if (result.length === 0) {
      result.push({
        title: 'Пока нет данных для рекомендаций',
        text: 'Добавьте товары, заказы и движения склада, чтобы панель начала формировать рекомендации.',
        className: 'border-slate-200 bg-slate-50 text-slate-700',
        icon: <WandSparkles className="h-4 w-4" />,
      });
    }

    return result;
  }, [lowStockItems, recentAiOrders, topItems]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка данных...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Всего товаров</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{totalProducts.toLocaleString('ru-RU')}</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">↗ {productsGrowthLabel}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Общая стоимость</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{currency.format(totalValue)}</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">↗ {totalValueGrowthLabel}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Низкие запасы</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{lowStockItems.length}</div>
            <p className="mt-3 text-xs font-medium text-amber-600">Требуется пополнение</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Точность ML</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <Brain className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{mlAccuracy !== null ? `${mlAccuracy.toFixed(1)}%` : settings?.mlEnabled ? 'Нет данных' : 'Выкл.'}</div>
            <p className="mt-3 text-xs font-medium text-violet-600">{settings?.mlEnabled ? 'Успешность AI-заказов' : 'ML-модуль отключён'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative flex h-full flex-col overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/60">
          <div className="absolute -left-12 top-0 h-36 w-36 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-emerald-100/60 blur-3xl" />
          <CardHeader className="relative pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl tracking-tight">Динамика складских запасов</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Количество и стоимость товаров за последние 6 месяцев</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white/80">6 месяцев</Badge>
                <Badge variant="outline" className="bg-white/80">Склад + стоимость</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative flex-1">
            {historyData.length === 0 ? (
              <div className="py-12 text-center text-slate-500">Истории движений склада пока нет</div>
            ) : (
              <div className="h-[500px] rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm sm:h-[560px] sm:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stockQuantityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="stockValueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis yAxisId="quantity" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => Number(value).toLocaleString('ru-RU')} />
                    <YAxis yAxisId="value" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000).toLocaleString('ru-RU')}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}
                      formatter={(value: number, name: string) => [name === 'Количество' ? value.toLocaleString('ru-RU') : currency.format(value), name]}
                    />
                    <Legend />
                    <Area yAxisId="quantity" type="monotone" dataKey="quantity" name="Количество" stroke="#2563eb" fill="url(#stockQuantityGradient)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 5 }} />
                    <Area yAxisId="value" type="monotone" dataKey="value" name="Стоимость" stroke="#10b981" fill="url(#stockValueGradient)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative flex h-full flex-col overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/60">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-violet-100/60 blur-3xl" />
          <CardHeader className="relative">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Топ-5 товаров по объёму</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Текущий уровень запасов популярных товаров</p>
              </div>
              <Badge variant="outline" className="w-fit bg-white/80 text-slate-600">Обновляется по складу</Badge>
            </div>
          </CardHeader>
          <CardContent className="relative flex-1">
            {topItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500">Пока нет товаров для отображения</div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                {topItems.map((item, index) => {
                  const percent = maxTopQuantity > 0 ? Math.max(4, Math.round((item.quantity / maxTopQuantity) * 100)) : 0;
                  const volumeStatus = getVolumeStatus(item, maxTopQuantity);

                  return (
                    <div key={item.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Минимальный запас: {item.minStock} шт</div>
                          </div>
                        </div>
                        <Badge className={volumeStatus.className}>{volumeStatus.label}</Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 shadow-sm"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="min-w-16 text-right text-sm font-medium text-slate-700">{item.quantity} шт</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-violet-200 bg-violet-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Brain className="h-5 w-5 text-violet-600" />Недавние автоматические заказы AI
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">Система AI автоматически создала эти заказы на основе прогнозов</p>
        </CardHeader>
        <CardContent>
          {recentAiOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-violet-200 bg-white/80 p-6 text-center text-slate-500">
              Пока нет автоматических заказов AI
            </div>
          ) : (
            <div className="space-y-3">
              {recentAiOrders.map((order) => (
                <div key={order.id} className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{order.product} - {order.quantity} шт</p>
                    <p className="mt-1 text-sm text-slate-600">AI уверенность: {order.aiConfidence}% · Сумма: {currency.format(order.orderValue)}</p>
                    <p className="mt-2 text-xs text-slate-500">Причина: {order.reason}</p>
                  </div>
                  <Badge className={`${getOrderBadgeClass(order.status)} self-start`}>{getOrderStatusLabel(order.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Уведомления и рекомендации ML</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Автоматические рекомендации на основе текущих данных</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((item, index) => (
              <div key={`${item.title}-${index}`} className={`rounded-xl border px-4 py-3 ${item.className}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
