import {
  TrendingUp,
  Package,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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
  ResponsiveContainer,
} from "recharts";

const revenueData = [
  { month: "Янв", revenue: 2850000, cost: 1900000, profit: 950000 },
  { month: "Фев", revenue: 2620000, cost: 1750000, profit: 870000 },
  { month: "Мар", revenue: 3100000, cost: 2050000, profit: 1050000 },
  { month: "Апр", revenue: 3350000, cost: 2200000, profit: 1150000 },
  { month: "Май", revenue: 3680000, cost: 2400000, profit: 1280000 },
  { month: "Июн", revenue: 4200000, cost: 2750000, profit: 1450000 },
];

const categoryDistribution = [
  { name: "Электроника", value: 42, amount: 1890000 },
  { name: "Периферия", value: 28, amount: 1260000 },
  { name: "Комплектующие", value: 18, amount: 810000 },
  { name: "Аудио", value: 12, amount: 540000 },
];

const topPerformers = [
  { product: "Dell XPS 15", sales: 156, revenue: 19500000, growth: 45 },
  { product: "Samsung 27", sales: 234, revenue: 8190000, growth: 28 },
  { product: "SSD 1TB", sales: 478, revenue: 4541000, growth: 12 },
  { product: "Sony WH-1000XM5", sales: 189, revenue: 5292000, growth: 34 },
  { product: "Logitech MX", sales: 312, revenue: 2652000, growth: -8 },
];

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

export default function Analytics() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽19.8М</div>
            <div className="text-green-600 text-sm flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> +18.3%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Прибыль</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽6.7М</div>
            <div className="text-green-600 text-sm flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> +22.5%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Заказы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,847</div>
            <div className="text-green-600 text-sm flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> +12.8%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Финансовая аналитика</CardTitle>
          <CardDescription>Доходы и расходы</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="revenue" stroke="#3b82f6" name="Выручка" />
              <Line dataKey="cost" stroke="#ef4444" name="Затраты" />
              <Line dataKey="profit" stroke="#10b981" name="Прибыль" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Категории</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryDistribution} dataKey="value" label>
                  {categoryDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Оборачиваемость</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
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
        <CardContent className="space-y-3">
          {topPerformers.map((p, i) => (
            <div key={i} className="flex justify-between border p-3 rounded">
              <div>
                <div className="font-medium">{p.product}</div>
                <div className="text-sm text-gray-500">
                  Продажи: {p.sales}
                </div>
              </div>

              <div
                className={
                  p.growth >= 0 ? "text-green-600" : "text-red-600"
                }
              >
                {p.growth >= 0 ? "+" : ""}
                {p.growth}%
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
