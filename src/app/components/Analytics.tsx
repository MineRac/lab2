import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  Loader2,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type AutoOrder, type InventoryItem, type SalesRecord } from '../lib/api';
import { toast } from 'sonner';

const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const compactCurrency = (value: number) => {
  if (value >= 1_000_000) return `₽${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₽${(value / 1_000).toFixed(1)}K`;
  return currency.format(value);
};

const categoryColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

function monthKey(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('ru-RU', { month: 'short' });
}

function getLastMonths(count: number, baseDate: Date = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (count - 1 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = monthLabel(key);
    return {
      key,
      month: label.charAt(0).toUpperCase() + label.slice(1),
    };
  });
}

function calculatePercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return ((current - previous) / previous) * 100;
}

function formatChangeLabel(value: number, suffix = 'от прошлого периода') {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue > 0 ? '+' : '';
  return `${sign}${safeValue.toLocaleString('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}% ${suffix}`;
}

function formatTurnoverComparison(current: number, average: number) {
  if (average <= 0) return 'Нет данных для сравнения';
  const ratio = current / average;
  const sign = ratio >= 1 ? '+' : '';
  return `${sign}${ratio.toLocaleString('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}x от среднего показателя`;
}

export default function Analytics() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<AutoOrder[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getInventory(), api.getOrders(), api.getSalesHistory()])
      .then(([inventory, orderData, salesData]) => {
        setItems(inventory);
        setOrders(orderData);
        setSales(salesData);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Не удалось загрузить аналитику'))
      .finally(() => setIsLoading(false));
  }, []);

  const latestSaleDate = useMemo(() => {
    const timestamps = sales
      .map((record) => new Date(record.soldAt).getTime())
      .filter(Number.isFinite);

    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
  }, [sales]);

  const lastSixMonths = useMemo(() => getLastMonths(6, latestSaleDate), [latestSaleDate]);

  const categoryData = useMemo(() => {
    const grouped = new Map<string, { category: string; quantity: number; value: number }>();

    items.forEach((item) => {
      const current = grouped.get(item.category) ?? { category: item.category, quantity: 0, value: 0 };
      current.quantity += item.quantity;
      current.value += item.quantity * item.price;
      grouped.set(item.category, current);
    });

    // Если inventory пустой или ещё не совпадает с sales_history,
    // строим распределение по фактическим продажам, чтобы аналитика не была пустой.
    if (grouped.size === 0 && sales.length > 0) {
      sales.forEach((record) => {
        const current = grouped.get(record.category) ?? { category: record.category, quantity: 0, value: 0 };
        current.quantity += record.quantity;
        current.value += record.revenue;
        grouped.set(record.category, current);
      });
    }

    const totalValue = Array.from(grouped.values()).reduce((sum, row) => sum + row.value, 0);

    return Array.from(grouped.values())
      .sort((a, b) => b.value - a.value)
      .map((row) => ({
        ...row,
        share: totalValue > 0 ? (row.value / totalValue) * 100 : 0,
      }));
  }, [items, sales]);

  const financialData = useMemo(() => {
    const grouped = new Map<string, { revenue: number; expenses: number; profit: number }>();

    sales.forEach((record) => {
      const key = monthKey(record.soldAt);
      if (!key) return;
      const current = grouped.get(key) ?? { revenue: 0, expenses: 0, profit: 0 };
      current.revenue += record.revenue;
      current.expenses += record.cost;
      current.profit += Math.max(0, record.revenue - record.cost);
      grouped.set(key, current);
    });

    return lastSixMonths.map(({ key, month }) => {
      const current = grouped.get(key) ?? { revenue: 0, expenses: 0, profit: 0 };
      return {
        month,
        revenue: current.revenue,
        expenses: current.expenses,
        profit: current.profit,
      };
    });
  }, [lastSixMonths, sales]);

  const totalInventoryValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalRevenue = financialData.reduce((sum, row) => sum + row.revenue, 0);
  const totalExpenses = financialData.reduce((sum, row) => sum + row.expenses, 0);
  const grossProfit = financialData.reduce((sum, row) => sum + row.profit, 0);
  const turnover = totalInventoryValue > 0 ? totalRevenue / totalInventoryValue : 0;

  const revenueGrowthLabel = useMemo(() => {
    const current = financialData[financialData.length - 1]?.revenue ?? 0;
    const previous = financialData[financialData.length - 2]?.revenue ?? 0;
    return formatChangeLabel(calculatePercentChange(current, previous));
  }, [financialData]);

  const profitGrowthLabel = useMemo(() => {
    const current = financialData[financialData.length - 1]?.profit ?? 0;
    const previous = financialData[financialData.length - 2]?.profit ?? 0;
    return formatChangeLabel(calculatePercentChange(current, previous));
  }, [financialData]);

  const ordersGrowthLabel = useMemo(() => {
    const months = lastSixMonths.map((point) => point.key);
    const currentKey = months[months.length - 1];
    const previousKey = months[months.length - 2];
    const currentCount = orders.filter((order) => monthKey(order.createdAt) === currentKey).length;
    const previousCount = orders.filter((order) => monthKey(order.createdAt) === previousKey).length;
    return formatChangeLabel(calculatePercentChange(currentCount, previousCount));
  }, [lastSixMonths, orders]);

  const turnoverData = useMemo(() => {
    const revenueByCategory = new Map<string, number>();
    sales.forEach((record) => {
      revenueByCategory.set(record.category, (revenueByCategory.get(record.category) ?? 0) + record.revenue);
    });

    const rows = categoryData
      .map((category) => {
        const revenue = revenueByCategory.get(category.category) ?? 0;
        const current = category.value > 0 ? Number((revenue / category.value).toFixed(2)) : 0;
        return {
          category: category.category,
          current,
        };
      })
      .filter((row) => row.current > 0);

    const average = rows.length > 0
      ? Number((rows.reduce((sum, row) => sum + row.current, 0) / rows.length).toFixed(2))
      : 0;

    return rows.map((row) => ({
      ...row,
      average,
    }));
  }, [categoryData, sales]);

  const turnoverAverage = turnoverData.length > 0
    ? turnoverData.reduce((sum, row) => sum + row.current, 0) / turnoverData.length
    : 0;
  const turnoverGrowthLabel = formatTurnoverComparison(turnover, turnoverAverage);

  const topProducts = useMemo(() => {
    const currentKey = lastSixMonths[lastSixMonths.length - 1]?.key;
    const previousKey = lastSixMonths[lastSixMonths.length - 2]?.key;

    const grouped = new Map<string, { productId: string; name: string; sales: number; revenue: number; currentRevenue: number; previousRevenue: number }>();

    sales.forEach((record) => {
      const current = grouped.get(record.productName) ?? {
        productId: record.productId,
        name: record.productName,
        sales: 0,
        revenue: 0,
        currentRevenue: 0,
        previousRevenue: 0,
      };

      current.sales += record.quantity;
      current.revenue += record.revenue;

      const key = monthKey(record.soldAt);
      if (key === currentKey) current.currentRevenue += record.revenue;
      if (key === previousKey) current.previousRevenue += record.revenue;

      grouped.set(record.productName, current);
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((product) => ({
        ...product,
        changePercent: calculatePercentChange(product.currentRevenue, product.previousRevenue),
      }));
  }, [lastSixMonths, sales]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка аналитики...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-violet-100/40 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Аналитика</h2>
            <p className="mt-1 text-sm text-slate-500">Финансовые показатели, структура категорий и эффективность продаж на основе реальных данных</p>
          </div>
          <Badge variant="outline" className="w-fit bg-white/80 px-3 py-1 text-slate-600">Последние 6 месяцев продаж</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Общая выручка</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{compactCurrency(totalRevenue)}</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">↗ {revenueGrowthLabel}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Валовая прибыль</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{compactCurrency(grossProfit)}</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">↗ {profitGrowthLabel}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Оборачиваемость</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <RotateCcw className="h-4 w-4 text-sky-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{turnover.toFixed(1)}x</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">↗ {turnoverGrowthLabel}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Всего заказов</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <ShoppingCart className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{orders.length.toLocaleString('ru-RU')}</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">↗ {ordersGrowthLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-50 shadow-sm">
        <div className="absolute -left-12 top-0 h-36 w-36 rounded-full bg-blue-100/40 blur-3xl" />
        <CardHeader className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Финансовая аналитика</CardTitle>
              <CardDescription>Выручка, затраты и прибыль за последние 6 месяцев</CardDescription>
            </div>
            <Badge variant="outline" className="bg-white/80">6 месяцев</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {financialData.every((row) => row.revenue === 0 && row.expenses === 0 && row.profit === 0) ? (
            <div className="py-12 text-center text-slate-500">За выбранный период нет продаж. Проверь даты в sales_history.</div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={financialData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}
                    formatter={(value: number, name: string) => [currency.format(value), name]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Выручка" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }} />
                  <Line type="monotone" dataKey="expenses" name="Затраты" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }} />
                  <Line type="monotone" dataKey="profit" name="Прибыль" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 shadow-sm">
          <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-violet-100/35 blur-3xl" />
          <CardHeader className="relative">
            <CardTitle>Распределение по категориям</CardTitle>
            <CardDescription>Процентное соотношение товарных категорий</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {categoryData.length === 0 ? (
              <div className="py-12 text-center text-slate-500">Нет данных для графика</div>
            ) : (
              <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm lg:grid-cols-[1fr_1.1fr]">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="category" innerRadius={0} outerRadius={95}>
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.category} fill={categoryColors[index % categoryColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => currency.format(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {categoryData.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors[index % categoryColors.length] }} />
                        <span className="truncate">{category.category}</span>
                      </div>
                      <div className="shrink-0 font-medium">{currency.format(category.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/30 shadow-sm">
          <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-sky-100/35 blur-3xl" />
          <CardHeader className="relative">
            <CardTitle>Скорость оборачиваемости</CardTitle>
            <CardDescription>Показатель по категориям (раз в год)</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {turnoverData.length === 0 ? (
              <div className="py-12 text-center text-slate-500">Нет продаж для расчёта оборачиваемости</div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={turnoverData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" name="Текущая оборачиваемость" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="average" name="Средняя оборачиваемость" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 shadow-sm">
        <div className="absolute -left-12 top-0 h-36 w-36 rounded-full bg-emerald-100/35 blur-3xl" />
        <CardHeader className="relative">
          <CardTitle>Топ товаров по выручке</CardTitle>
          <CardDescription>Самые прибыльные товары за текущий период</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Истории продаж пока нет</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product) => {
                const positive = product.changePercent >= 0;
                const badgeClass = positive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700';
                const badgeText = `${positive ? '↗' : '↘'} ${Math.abs(product.changePercent).toLocaleString('ru-RU', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}%`;

                return (
                  <div key={product.productId} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Продано: {product.sales} шт · Выручка: {currency.format(product.revenue)}
                      </div>
                    </div>
                    <Badge className={badgeClass}>{badgeText}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
