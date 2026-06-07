import { Package, TrendingUp, AlertTriangle, DollarSign, ShoppingCart, TrendingDown, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const inventoryTrend = [
  { id: 1, month: 'Янв', количество: 4200, стоимость: 3200 },
  { id: 2, month: 'Фев', количество: 3800, стоимость: 3100 },
  { id: 3, month: 'Мар', количество: 4100, стоимость: 3400 },
  { id: 4, month: 'Апр', количество: 4500, стоимость: 3800 },
  { id: 5, month: 'Май', количество: 4800, стоимость: 4100 },
  { id: 6, month: 'Июн', количество: 5200, стоимость: 4500 },
];

const topProducts = [
  { name: 'Ноутбук Dell XPS 15', stock: 156, demand: 'Высокий', trend: 'up' },
  { name: 'Монитор Samsung 27"', stock: 89, demand: 'Средний', trend: 'stable' },
  { name: 'Клавиатура Logitech MX', stock: 234, demand: 'Высокий', trend: 'up' },
  { name: 'Мышь Logitech G502', stock: 45, demand: 'Критический', trend: 'down' },
  { name: 'Наушники Sony WH-1000XM5', stock: 178, demand: 'Средний', trend: 'stable' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Всего товаров</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">5,234</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +12.5% от прошлого месяца
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Общая стоимость</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₽4.5М</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +8.2% от прошлого месяца
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Низкие запасы</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">23</div>
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              Требуется пополнение
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Точность ML</CardTitle>
            <Brain className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">94.3%</div>
            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
              Модель прогнозирования
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Динамика складских запасов</CardTitle>
            <CardDescription>Количество и стоимость товаров за последние 6 месяцев</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={inventoryTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line key="line-quantity" type="monotone" dataKey="количество" stroke="#3b82f6" strokeWidth={2} />
                <Line key="line-cost" type="monotone" dataKey="стоимость" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Топ-5 товаров по объему</CardTitle>
            <CardDescription>Текущий уровень запасов популярных товаров</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{product.name}</span>
                      {product.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {product.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                    </div>
                    <Badge variant={product.demand === 'Критический' ? 'destructive' : product.demand === 'Высокий' ? 'default' : 'secondary'}>
                      {product.demand}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(product.stock / 250) * 100} className="flex-1" />
                    <span className="text-sm text-slate-600 min-w-12 text-right">{product.stock} шт</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Auto Orders */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded-lg">
              <Brain className="h-4 w-4 text-white" />
            </div>
            Недавние автоматические заказы AI
          </CardTitle>
          <CardDescription>Система AI автоматически создала эти заказы на основе прогнозов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white border border-purple-200 rounded-lg">
              <div className="bg-green-100 p-2 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-900">Веб-камера Logitech C920 - 100 шт</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Выполнен</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">AI уверенность: 96% • Сумма: ₽750,000</p>
                <p className="text-xs text-slate-500">Причина: Критический уровень запасов + высокий прогноз спроса</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white border border-purple-200 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-900">Мышь Logitech G502 - 150 шт</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Обрабатывается</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">AI уверенность: 94% • Сумма: ₽975,000</p>
                <p className="text-xs text-slate-500">Причина: Прогноз дефицита через 7 дней</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white border border-purple-200 rounded-lg">
              <div className="bg-amber-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-900">ОЗУ Kingston 16GB - 80 шт</p>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">Ожидание</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">AI уверенность: 92% • Сумма: ₽440,000</p>
                <p className="text-xs text-slate-500">Причина: Прогноз роста спроса на 35%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Уведомления и рекомендации ML</CardTitle>
          <CardDescription>Автоматические рекомендации на основе машинного обучения</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Brain className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">AI создал автоматический заказ</p>
                <p className="text-sm text-green-700 mt-1">Веб-камера Logitech C920 - заказ на 100 единиц успешно размещен у поставщика</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Растущий спрос обнаружен</p>
                <p className="text-sm text-blue-700 mt-1">Ноутбук Dell XPS 15 показывает рост на 45% - AI планирует заказ через 3 дня</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Package className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">Оптимальный уровень запасов</p>
                <p className="text-sm text-purple-700 mt-1">Клавиатура Logitech MX - текущий уровень соответствует прогнозируемому спросу</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
