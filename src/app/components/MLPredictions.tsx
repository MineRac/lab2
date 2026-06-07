import { Brain, TrendingUp, Calendar, Target, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const demandForecast = [
  { id: 1, week: 'Неделя 1', actual: 850, predicted: 830, confidence: 95 },
  { id: 2, week: 'Неделя 2', actual: 920, predicted: 910, confidence: 94 },
  { id: 3, week: 'Неделя 3', actual: 880, predicted: 895, confidence: 93 },
  { id: 4, week: 'Неделя 4', actual: 1050, predicted: 1020, confidence: 92 },
  { id: 5, week: 'Неделя 5', actual: null, predicted: 1150, confidence: 91 },
  { id: 6, week: 'Неделя 6', actual: null, predicted: 1200, confidence: 89 },
  { id: 7, week: 'Неделя 7', actual: null, predicted: 1180, confidence: 87 },
  { id: 8, week: 'Неделя 8', actual: null, predicted: 1100, confidence: 85 },
];

const restockRecommendations = [
  { product: 'Мышь Logitech G502', currentStock: 45, predictedDemand: 180, recommendedOrder: 150, urgency: 'Высокая', days: 7, confidence: 94 },
  { product: 'Веб-камера Logitech C920', currentStock: 12, predictedDemand: 95, recommendedOrder: 100, urgency: 'Критическая', days: 3, confidence: 96 },
  { product: 'ОЗУ Kingston 16GB', currentStock: 89, predictedDemand: 145, recommendedOrder: 80, urgency: 'Средняя', days: 14, confidence: 92 },
  { product: 'Клавиатура Logitech MX', currentStock: 234, predictedDemand: 280, recommendedOrder: 100, urgency: 'Низкая', days: 21, confidence: 89 },
];

const seasonalityData = [
  { id: 1, month: 'Янв', sales: 3200, trend: 'low' },
  { id: 2, month: 'Фев', sales: 2900, trend: 'low' },
  { id: 3, month: 'Мар', sales: 3400, trend: 'medium' },
  { id: 4, month: 'Апр', sales: 3800, trend: 'medium' },
  { id: 5, month: 'Май', sales: 4100, trend: 'high' },
  { id: 6, month: 'Июн', sales: 4500, trend: 'high' },
  { id: 7, month: 'Июл', sales: 4200, trend: 'high' },
  { id: 8, month: 'Авг', sales: 3900, trend: 'medium' },
  { id: 9, month: 'Сен', sales: 5200, trend: 'peak' },
  { id: 10, month: 'Окт', sales: 4800, trend: 'high' },
  { id: 11, month: 'Ноя', sales: 6100, trend: 'peak' },
  { id: 12, month: 'Дек', sales: 5800, trend: 'peak' },
];

export default function MLPredictions() {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Критическая': return 'bg-red-600';
      case 'Высокая': return 'bg-amber-600';
      case 'Средняя': return 'bg-blue-600';
      case 'Низкая': return 'bg-green-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Точность модели</CardTitle>
            <Brain className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">94.3%</div>
            <Progress value={94.3} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Прогнозов создано</CardTitle>
            <Zap className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">2,847</div>
            <p className="text-xs text-slate-600 mt-1">За последний месяц</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Средняя уверенность</CardTitle>
            <Target className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">91.8%</div>
            <Progress value={91.8} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Экономия</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₽1.2М</div>
            <p className="text-xs text-green-600 mt-1">Оптимизация запасов</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Прогноз спроса</CardTitle>
          <CardDescription>Сравнение фактического и прогнозируемого спроса с уровнем уверенности</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={demandForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area key="area-actual" type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Фактический спрос" />
              <Area key="area-predicted" type="monotone" dataKey="predicted" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Прогноз модели" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Restock Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Рекомендации по пополнению запасов</CardTitle>
          <CardDescription>Автоматические рекомендации на основе прогнозов машинного обучения</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {restockRecommendations.map((rec, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{rec.product}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <span>Текущий запас: <span className="font-medium text-slate-900">{rec.currentStock}</span></span>
                      <span>Прогноз спроса: <span className="font-medium text-slate-900">{rec.predictedDemand}</span></span>
                    </div>
                  </div>
                  <Badge className={getUrgencyColor(rec.urgency)}>{rec.urgency}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-600 mb-1">Рекомендуемый заказ</div>
                    <div className="text-lg font-bold text-slate-900">{rec.recommendedOrder} шт</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-600 mb-1">Срок заказа</div>
                    <div className="text-lg font-bold text-slate-900">{rec.days} дней</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-600 mb-1">Уверенность модели</div>
                    <div className="text-lg font-bold text-slate-900">{rec.confidence}%</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Progress value={rec.confidence} className="flex-1" />
                  <span className="text-xs text-slate-600">{rec.confidence}% уверенность</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seasonality Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Анализ сезонности</CardTitle>
          <CardDescription>Выявление сезонных паттернов в данных продаж</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={seasonalityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar key="bar-sales" dataKey="sales" fill="#3b82f6" name="Объем продаж" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600">Пиковый сезон</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-600">Высокий спрос</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600">Средний спрос</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span className="text-sm text-slate-600">Низкий спрос</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ключевые выводы модели</CardTitle>
          <CardDescription>Автоматически обнаруженные паттерны и аномалии</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">Обнаружена корреляция</p>
                <p className="text-sm text-purple-700 mt-1">Спрос на ноутбуки растет на 23% при увеличении продаж мониторов</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Сезонный паттерн</p>
                <p className="text-sm text-blue-700 mt-1">Ожидается увеличение спроса на 45% в период с сентября по ноябрь</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Аномалия обнаружена</p>
                <p className="text-sm text-amber-700 mt-1">Необычно низкий спрос на веб-камеры в последние 2 недели - рекомендуется проверка</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
