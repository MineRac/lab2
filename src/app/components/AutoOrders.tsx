import { useState } from 'react';
import { Bot, CheckCircle, Clock, XCircle, Settings, Zap, Package, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';

const autoOrders = [
  {
    id: 'AO-001',
    product: 'Веб-камера Logitech C920',
    quantity: 100,
    supplier: 'ООО "ТехОптТорг"',
    predictedStock: 12,
    aiConfidence: 96,
    orderValue: 750000,
    status: 'completed',
    createdAt: '2026-06-07 09:23',
    deliveryDate: '2026-06-14',
    reason: 'Критический уровень запасов + высокий прогноз спроса'
  },
  {
    id: 'AO-002',
    product: 'Мышь Logitech G502',
    quantity: 150,
    supplier: 'ООО "ТехОптТорг"',
    predictedStock: 45,
    aiConfidence: 94,
    orderValue: 975000,
    status: 'processing',
    createdAt: '2026-06-07 14:15',
    deliveryDate: '2026-06-16',
    reason: 'Прогноз дефицита через 7 дней'
  },
  {
    id: 'AO-003',
    product: 'ОЗУ Kingston 16GB',
    quantity: 80,
    supplier: 'ООО "КомпМастер"',
    predictedStock: 89,
    aiConfidence: 92,
    orderValue: 440000,
    status: 'pending',
    createdAt: '2026-06-07 16:45',
    deliveryDate: '2026-06-21',
    reason: 'Прогноз роста спроса на 35%'
  },
  {
    id: 'AO-004',
    product: 'SSD Samsung 2TB',
    quantity: 120,
    supplier: 'ООО "ТехноЛидер"',
    predictedStock: 156,
    aiConfidence: 89,
    orderValue: 1680000,
    status: 'scheduled',
    createdAt: '2026-06-07 18:30',
    deliveryDate: '2026-06-20',
    reason: 'Сезонный рост + оптимизация запасов'
  },
];

const upcomingOrders = [
  { product: 'Клавиатура Logitech MX', quantity: 100, scheduledDate: '2026-06-10', confidence: 89 },
  { product: 'Монитор LG 32"', quantity: 50, scheduledDate: '2026-06-12', confidence: 91 },
  { product: 'Наушники JBL Pro', quantity: 75, scheduledDate: '2026-06-15', confidence: 87 },
];

export default function AutoOrders() {
  const [autoOrderEnabled, setAutoOrderEnabled] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState([85]);
  const [approvalRequired, setApprovalRequired] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Выполнен
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            Обрабатывается
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Ожидание
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-purple-600">
            <Calendar className="h-3 w-3 mr-1" />
            Запланирован
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalAutoOrders = autoOrders.length;
  const totalValue = autoOrders.reduce((sum, order) => sum + order.orderValue, 0);
  const avgConfidence = autoOrders.reduce((sum, order) => sum + order.aiConfidence, 0) / autoOrders.length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">AI Автозаказы</CardTitle>
            <Bot className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalAutoOrders}</div>
            <p className="text-xs text-slate-600 mt-1">За последние 24 часа</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Общая сумма</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₽{(totalValue / 1000000).toFixed(1)}М</div>
            <p className="text-xs text-green-600 mt-1">Автоматические заказы</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Средняя уверенность</CardTitle>
            <Zap className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{avgConfidence.toFixed(1)}%</div>
            <Progress value={avgConfidence} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Точность системы</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">97.2%</div>
            <p className="text-xs text-slate-600 mt-1">Успешных заказов</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Настройки автоматизации AI</CardTitle>
                <CardDescription>Управление параметрами автоматических заказов</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-order-toggle" className="text-sm font-medium">
                {autoOrderEnabled ? 'Включено' : 'Выключено'}
              </Label>
              <Switch
                id="auto-order-toggle"
                checked={autoOrderEnabled}
                onCheckedChange={setAutoOrderEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Минимальная уверенность AI: {confidenceThreshold[0]}%</Label>
              </div>
              <Slider
                value={confidenceThreshold}
                onValueChange={setConfidenceThreshold}
                min={50}
                max={100}
                step={5}
                className="w-full"
                disabled={!autoOrderEnabled}
              />
              <p className="text-xs text-slate-600">
                Заказы создаются только при уверенности AI выше этого порога
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Требуется подтверждение</Label>
                <Switch
                  checked={approvalRequired}
                  onCheckedChange={setApprovalRequired}
                  disabled={!autoOrderEnabled}
                />
              </div>
              <p className="text-xs text-slate-600">
                Если включено, все заказы требуют ручного подтверждения перед отправкой поставщику
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <h4 className="font-semibold text-slate-900 mb-3">Активные правила автозаказа</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-slate-700">Критический уровень запасов ({"<"}20% от минимума)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-slate-700">Прогноз дефицита в течение 7 дней</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-slate-700">Сезонный рост спроса {">"}30%</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-slate-700">Корреляция с популярными товарами</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Orders */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history">История заказов</TabsTrigger>
          <TabsTrigger value="upcoming">Запланированные ({upcomingOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>История автоматических заказов</CardTitle>
              <CardDescription>Все заказы, созданные системой AI за последний период</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID заказа</TableHead>
                      <TableHead>Товар</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Поставщик</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>AI уверенность</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Доставка</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {autoOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.product}</div>
                            <div className="text-xs text-slate-500 mt-1">{order.reason}</div>
                          </div>
                        </TableCell>
                        <TableCell>{order.quantity} шт</TableCell>
                        <TableCell className="text-sm">{order.supplier}</TableCell>
                        <TableCell className="font-medium">
                          ₽{order.orderValue.toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={order.aiConfidence} className="w-16" />
                            <span className="text-sm font-medium">{order.aiConfidence}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{order.createdAt}</TableCell>
                        <TableCell className="text-sm text-slate-600">{order.deliveryDate}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Запланированные заказы</CardTitle>
              <CardDescription>AI планирует создать эти заказы в ближайшее время</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingOrders.map((order, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <Package className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{order.product}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Запланировано на {order.scheduledDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600">Количество</div>
                        <div className="text-xl font-bold text-slate-900">{order.quantity} шт</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">AI уверенность:</span>
                      <Progress value={order.confidence} className="flex-1" />
                      <span className="text-sm font-medium text-slate-900">{order.confidence}%</span>
                    </div>
                    {approvalRequired && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Одобрить
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <XCircle className="h-4 w-4 mr-2" />
                          Отклонить
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Аналитика автоматических заказов</CardTitle>
          <CardDescription>Статистика и рекомендации AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900">Предотвращено дефицитов</span>
              </div>
              <div className="text-3xl font-bold text-green-900">18</div>
              <p className="text-sm text-green-700 mt-1">За последний месяц</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Экономия средств</span>
              </div>
              <div className="text-3xl font-bold text-blue-900">₽2.4М</div>
              <p className="text-sm text-blue-700 mt-1">Оптимизация запасов</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-purple-900">Время реакции</span>
              </div>
              <div className="text-3xl font-bold text-purple-900">{"<"}2 мин</div>
              <p className="text-sm text-purple-700 mt-1">Среднее время создания заказа</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
