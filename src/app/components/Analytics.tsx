import { TrendingUp, DollarSign, Package, ShoppingCart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const revenueData = [
  { id: 1, month: 'Янв', revenue: 2850000, cost: 1900000, profit: 950000 },
  { id: 2, month: 'Фев', revenue: 2620000, cost: 1750000, profit: 870000 },
  { id: 3, month: 'Мар', revenue: 3100000, cost: 2050000, profit: 1050000 },
  { id: 4, month: 'Апр', revenue: 3350000, cost: 2200000, profit: 1150000 },
  { id: 5, month: 'Май', revenue: 3680000, cost: 2400000, profit: 1280000 },
  { id: 6, month: 'Июн', revenue: 4200000, cost: 2750000, profit: 1450000 },
];

const categoryDistribution = [
  { id: 1, name: 'Электроника', value: 42, amount: 1890000 },
  { id: 2, name: 'Периферия', value: 28, amount: 1260000 },
  { id: 3, name: 'Комплектующие', value: 18, amount: 810000 },
  { id: 4, name: 'Аудио', value: 12, amount: 540000 },
];

const topPerformers = [
  { product: 'Ноутбук Dell XPS 15', sales: 156, revenue: 19500000, growth: 45 },
  { product: 'Монитор Samsung 27"', sales: 234, revenue: 8190000, growth: 28 },
  { product: 'SSD Samsung 1TB', sales: 478, revenue: 4541000, growth: 12 },
  { product: 'Наушники Sony WH-1000XM5', sales: 189, revenue: 5292000, growth: 34 },
  { product: 'Клавиатура Logitech MX', sales: 312, revenue: 2652000, growth: -8 },
];

const turnoverData = [
  { id: 1, category: 'Электроника', turnover: 8.2, avg: 6.5 },
  { id: 2, category: 'Периферия', turnover: 12.4, avg: 6.5 },
  { id: 3, category: 'Комплектующие', turnover: 15.8, avg: 6.5 },
  { id: 4, category: 'Аудио', turnover: 7.6, avg: 6.5 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export default function Analytics() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Общая выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₽19.8М</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">+18.3% от прошлого периода</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Валовая прибыль</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₽6.7М</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">+22.5% от прошлого периода</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Оборачиваемость</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">11.2x</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">+1.8 от среднего показателя</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Всего заказов</CardTitle>
            <ShoppingCart className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">1,847</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">+12.8% от прошлого периода</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Финансовая аналитика</CardTitle>
              <CardDescription>Выручка, затраты и прибыль за последние 6 месяцев</CardDescription>
            </div>
            <Select defaultValue="6months">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 месяца</SelectItem>
                <SelectItem value="6months">6 месяцев</SelectItem>
                <SelectItem value="12months">12 месяцев</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `₽${(value as number).toLocaleString('ru-RU')}`} />
              <Legend />
              <Line key="line-revenue" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Выручка" />
              <Line key="line-cost" type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="Затраты" />
              <Line key="line-profit" type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Прибыль" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение по категориям</CardTitle>
            <CardDescription>Процентное соотношение товарных категорий</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    key="pie-category"
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={COLORS[(entry.id - 1) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryDistribution.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                    <span className="text-slate-700">{cat.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">₽{cat.amount.toLocaleString('ru-RU')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Turnover Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Скорость оборачиваемости</CardTitle>
            <CardDescription>Показатель по категориям (раз в год)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar key="bar-turnover" dataKey="turnover" fill="#3b82f6" name="Текущая оборачиваемость" />
                <Bar key="bar-avg" dataKey="avg" fill="#cbd5e1" name="Средняя оборачиваемость" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Топ товаров по выручке</CardTitle>
          <CardDescription>Самые прибыльные товары за текущий период</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{item.product}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <span>Продано: <span className="font-medium text-slate-900">{item.sales} шт</span></span>
                    <span>Выручка: <span className="font-medium text-slate-900">₽{item.revenue.toLocaleString('ru-RU')}</span></span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${item.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.growth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{Math.abs(item.growth)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
