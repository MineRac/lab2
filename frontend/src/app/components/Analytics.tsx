import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_URL = 'http://localhost:8000';

export default function Analytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/analytics`).then(r => r.json()),
      fetch(`${API_URL}/inventory`).then(r => r.json()),
    ]).then(([analytics, inventory]) => {
      setData({ analytics, inventory });
    });
  }, []);

  if (!data) {
    return <div className="p-6">Загрузка аналитики...</div>;
  }

  const { analytics, inventory } = data;

  // динамика (замена revenueData)
  const revenueData = [
    { month: 'Янв', value: 2.8 },
    { month: 'Фев', value: 2.6 },
    { month: 'Мар', value: 3.1 },
    { month: 'Апр', value: 3.3 },
    { month: 'Май', value: 3.6 },
    { month: 'Июн', value: 4.2 },
  ];

  // категории из inventory (вместо заглушки)
  const categoryMap = inventory.reduce((acc: any, item: any) => {
    acc[item.category] = (acc[item.category] || 0) + item.quantity;
    return acc;
  }, {});

  const categoryDistribution = Object.entries(categoryMap).map(
    ([name, value], idx) => ({
      id: idx,
      name,
      value
    })
  );

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  const topPerformers = [...inventory]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(item => ({
      product: item.name,
      sales: item.quantity,
      revenue: item.quantity * item.price,
      growth: item.quantity > item.minStock ? 20 : -10
    }));

  const turnoverData = categoryDistribution.map(cat => ({
    category: cat.name,
    turnover: Math.random() * 15 + 5,
    avg: 10
  }));

  return (
    <div className="space-y-6">

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card>
          <CardHeader>
            <CardTitle>Общая выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₽{(analytics.total_items * 12000).toLocaleString('ru-RU')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Низкий запас</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {analytics.out_of_stock}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Всего товаров</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventory.length}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Финансовая динамика</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category + Turnover */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>Категории</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  dataKey="value"
                  label
                  outerRadius={100}
                >
                  {categoryDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Оборачиваемость</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={turnoverData}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="turnover" fill="#3b82f6" />
                <Bar dataKey="avg" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle>Топ товаров</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.map((p, i) => (
              <div key={i} className="flex justify-between border p-3 rounded">
                <div>
                  <div className="font-medium">{p.product}</div>
                  <div className="text-sm text-gray-500">
                    {p.sales} шт
                  </div>
                </div>

                <div className={p.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                  {p.growth > 0 ? '+' : ''}{p.growth}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
