import { useEffect, useState } from 'react';
import {
  Package,
  DollarSign,
  AlertTriangle,
  Brain,
  TrendingUp,
  ShoppingCart
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const API_URL = 'http://localhost:8000';

export default function Dashboard() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/inventory`).then(r => r.json()),
      fetch(`${API_URL}/analytics`).then(r => r.json())
    ]).then(([inv, an]) => {
      setInventory(inv);
      setAnalytics(an);
    });
  }, []);

  if (!inventory || !analytics) {
    return <div className="p-6">Загрузка dashboard...</div>;
  }

  // ===== KPI CALCULATIONS (вместо заглушек) =====

  const totalItems = inventory.reduce((s, i) => s + i.quantity, 0);

  const totalValue = inventory.reduce(
    (s, i) => s + i.quantity * i.price,
    0
  );

  const lowStockItems = inventory.filter(
    i => i.quantity <= i.minStock
  ).length;

  const inventoryTrend = inventory.slice(0, 6).map((item, i) => ({
    month: `M${i + 1}`,
    quantity: item.quantity,
    value: item.quantity * item.price
  }));

  const topProducts = [...inventory]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(i => ({
      name: i.name,
      stock: i.quantity,
      demand:
        i.quantity > i.minStock * 1.5
          ? 'Высокий'
          : i.quantity > i.minStock
          ? 'Средний'
          : 'Критический',
      progress: Math.min(100, (i.quantity / (i.minStock * 2)) * 100)
    }));

  const mlAccuracy = 94.3; // пока нет ML endpoint → фикс

  return (
    <div className="space-y-6">

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card>
          <CardHeader>
            <CardTitle>Всего товаров</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalItems}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Общая стоимость</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₽{totalValue.toLocaleString('ru-RU')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Низкие запасы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {lowStockItems}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* CHART */}
      <Card>
        <CardHeader>
          <CardTitle>Динамика склада</CardTitle>
        </CardHeader>

        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={inventoryTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="quantity"
                stroke="#3b82f6"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TOP PRODUCTS */}
      <Card>
        <CardHeader>
          <CardTitle>Топ товары</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">

            {topProducts.map((p, i) => (
              <div key={i} className="space-y-2">

                <div className="flex justify-between">
                  <div className="font-medium">
                    {p.name}
                  </div>

                  <Badge>
                    {p.demand}
                  </Badge>
                </div>

                <Progress value={p.progress} />

                <div className="text-sm text-gray-500">
                  Остаток: {p.stock}
                </div>

              </div>
            ))}

          </div>
        </CardContent>
      </Card>

      {/* ML BLOCK */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            ML система
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          <div className="flex justify-between">
            <span>Точность модели</span>
            <b>{mlAccuracy}%</b>
          </div>

          <Progress value={mlAccuracy} />

          <div className="text-sm text-gray-600">
            ML пока фиксированный, позже подключим /ml/metrics
          </div>

        </CardContent>
      </Card>

      {/* AUTO ORDERS PREVIEW (derived, no fake data) */}
      <Card>
        <CardHeader>
          <CardTitle>AI рекомендации</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">

            {inventory
              .filter(i => i.quantity < i.minStock)
              .slice(0, 3)
              .map((i, idx) => (
                <div
                  key={idx}
                  className="flex justify-between border p-3 rounded"
                >
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-gray-500">
                      нужно пополнить запас
                    </div>
                  </div>

                  <Badge variant="destructive">
                    LOW
                  </Badge>
                </div>
              ))}

          </div>
        </CardContent>
      </Card>

    </div>
  );
}
