import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Brain, Calendar, DollarSign, Loader2, Package, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { api, type MlForecast, type SalesRecord } from '../lib/api';
import { toast } from 'sonner';

const categoryColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

function getStatusBadgeClass(status: MlForecast['status']) {
  switch (status) {
    case 'Критическая': return 'bg-red-600 hover:bg-red-600';
    case 'Средняя': return 'bg-blue-600 hover:bg-blue-600';
    default: return 'bg-green-600 hover:bg-green-600';
  }
}

function getInsightStyles(type: 'purple' | 'blue' | 'amber') {
  switch (type) {
    case 'purple': return {
      wrapper: 'border-purple-200 bg-purple-50 text-purple-800',
      icon: 'text-purple-600',
    };
    case 'blue': return {
      wrapper: 'border-blue-200 bg-blue-50 text-blue-800',
      icon: 'text-blue-600',
    };
    default: return {
      wrapper: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: 'text-amber-600',
    };
  }
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `₽${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₽${(value / 1_000).toFixed(1)}K`;
  return `₽${value.toLocaleString('ru-RU')}`;
}

function monthKey(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('ru-RU', { month: 'short' });
}

export default function MLPredictions() {
  const [forecasts, setForecasts] = useState<MlForecast[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [forecastData, salesData] = await Promise.all([api.getMlForecasts(), api.getSalesHistory()]);
      setForecasts(forecastData);
      setSales(salesData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить прогнозы');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateForecasts = async () => {
    setIsGenerating(true);
    try {
      const generated = await api.generateMlForecasts();
      setForecasts(generated);
      toast.success(generated.length > 0 ? 'ML-прогнозы сформированы' : 'Нет данных для формирования прогнозов');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сформировать прогнозы');
    } finally {
      setIsGenerating(false);
    }
  };

  const forecastConfidence = useMemo(() => {
    if (forecasts.length === 0) return 0;
    return forecasts.reduce((sum, forecast) => sum + forecast.confidence, 0) / forecasts.length;
  }, [forecasts]);

  const avgConfidence = forecastConfidence;
  const totalForecastedDemand = forecasts.reduce((sum, item) => sum + item.predictedDemand, 0);
  const estimatedSavings = sales.reduce((sum, record) => sum + Math.max(0, record.revenue - record.cost), 0);

  const demandForecastData = useMemo(() => forecasts.map((forecast) => ({
    week: forecast.horizonLabel || forecast.forecastDate,
    actual: forecast.actualDemand,
    predicted: forecast.predictedDemand,
  })), [forecasts]);

  const salesAnalysisData = useMemo(() => {
    const grouped = new Map<string, number>();
    sales.forEach((record) => {
      const key = monthKey(record.soldAt);
      if (!key) return;
      grouped.set(key, (grouped.get(key) ?? 0) + record.quantity);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, quantity]) => ({ month: monthLabel(key), sales: quantity }));
  }, [sales]);

  const insights = useMemo(() => {
    const topForecast = [...forecasts].sort((a, b) => b.predictedDemand - a.predictedDemand)[0];
    const critical = forecasts.find((item) => item.status === 'Критическая');

    const salesByMonth = new Map<string, number>();
    sales.forEach((record) => {
      const key = monthKey(record.soldAt);
      if (!key) return;
      salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + record.quantity);
    });

    const salesTrend = Array.from(salesByMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
    const lastSales = salesTrend[salesTrend.length - 1]?.[1] ?? 0;
    const previousSales = salesTrend[salesTrend.length - 2]?.[1] ?? 0;
    const growthPercent = previousSales > 0 ? Math.round(((lastSales - previousSales) / previousSales) * 100) : null;

    const correlationText = topForecast
      ? `Спрос на «${topForecast.productName}» прогнозируется на уровне ${topForecast.predictedDemand} шт. при уверенности ${topForecast.confidence}%`
      : 'Недостаточно прогнозов для расчёта корреляции спроса';

    const seasonalText = growthPercent !== null
      ? `${growthPercent >= 0 ? 'Ожидается рост' : 'Ожидается снижение'} спроса на ${Math.abs(growthPercent)}% относительно предыдущего периода`
      : 'Для сезонного анализа нужно больше фактических продаж';

    const anomalyText = critical
      ? `Необычно низкий запас по товару «${critical.productName}» — рекомендуется заказ ${critical.recommendedOrder} шт.`
      : 'Критичных аномалий в текущих прогнозах не обнаружено';

    return [
      {
        title: 'Обнаружена корреляция',
        text: correlationText,
        type: 'purple' as const,
        icon: 'brain' as const,
      },
      {
        title: 'Сезонный паттерн',
        text: seasonalText,
        type: 'blue' as const,
        icon: 'calendar' as const,
      },
      {
        title: 'Аномалия обнаружена',
        text: anomalyText,
        type: 'amber' as const,
        icon: 'alert' as const,
      },
    ];
  }, [forecasts, sales]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка прогнозов...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 p-3 text-white shadow-lg shadow-violet-200/60">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">ML Прогнозы</h2>
              <p className="mt-1 text-sm text-slate-500">Прогнозирование спроса, рекомендации и обнаружение паттернов</p>
            </div>
          </div>

          <Button onClick={handleGenerateForecasts} disabled={isGenerating} className="rounded-xl shadow-sm">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Сформировать прогнозы
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Уверенность прогнозов</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <Brain className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{forecasts.length > 0 ? `${forecastConfidence.toFixed(1)}%` : 'Нет данных'}</div>
            {forecasts.length > 0 && <Progress value={forecastConfidence} className="mt-4 h-2.5 rounded-full bg-blue-100/80" indicatorClassName="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Прогнозов создано</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{totalForecastedDemand.toLocaleString('ru-RU')}</div>
            <p className="mt-3 text-xs font-medium text-violet-600">За последний месяц</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Средняя уверенность</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{forecasts.length > 0 ? `${avgConfidence.toFixed(1)}%` : 'Нет данных'}</div>
            {forecasts.length > 0 && <Progress value={avgConfidence} className="mt-4 h-2.5 rounded-full bg-emerald-100/80" indicatorClassName="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Экономия</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{compactCurrency(estimatedSavings)}</div>
            <p className="mt-3 text-xs font-medium text-amber-600">Оптимизация запасов</p>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/50 shadow-sm">
        <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-violet-100/50 blur-3xl" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Прогноз спроса</CardTitle>
              <CardDescription>Сравнение фактического и прогнозируемого спроса с уровнем уверенности</CardDescription>
            </div>
            <Badge variant="outline" className="bg-white/80">ML-модель</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {demandForecastData.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Прогнозов пока нет</div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={demandForecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="actual" name="Фактический спрос" stroke="#2563eb" fill="url(#actualGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="predicted" name="Прогноз ML" stroke="#a78bfa" fill="url(#predictedGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50/40 shadow-sm">
        <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-violet-100/50 blur-3xl" />
        <CardHeader className="relative">
          <CardTitle>Рекомендации по пополнению запасов</CardTitle>
          <CardDescription>Автоматические рекомендации на основе прогнозов машинного обучения</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {forecasts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Прогнозов пока нет</div>
          ) : (
            <div className="space-y-4">
              {forecasts.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 p-2"><Package className="h-4 w-4 text-purple-600" /></div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{item.productName}</h4>
                          <p className="mt-1 text-sm text-slate-500">Факт. спрос: {item.actualDemand} · Прогноз спроса: {item.predictedDemand}</p>
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-slate-500">Рекомендуемый заказ</div>
                      <div className="mt-1 text-xl font-bold text-slate-900">{item.recommendedOrder} шт</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Срок заказа</div>
                      <div className="mt-1 text-xl font-bold text-slate-900">{item.leadDays} дней</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Уверенность ML</div>
                      <div className="mt-1 text-xl font-bold text-slate-900">{item.confidence}%</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={item.confidence} className="h-2 flex-1" />
                    <span className="min-w-24 text-right text-xs text-slate-500">{item.confidence}% уверенности</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 shadow-sm">
        <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-emerald-100/50 blur-3xl" />
        <CardHeader className="relative">
          <CardTitle>Анализ сезонности</CardTitle>
          <CardDescription>Выявление сезонных паттернов в данных продаж</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {salesAnalysisData.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Истории продаж пока нет</div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                          <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesAnalysisData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value.toLocaleString('ru-RU'), 'Объём продаж']} />
                <Legend />
                <Bar dataKey="sales" name="Объём продаж" radius={[4, 4, 0, 0]}>
                  {salesAnalysisData.map((entry, index) => (
                    <Cell key={`cell-${entry.month}`} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-purple-50/40 shadow-sm">
        <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-purple-100/50 blur-3xl" />
        <CardHeader className="relative">
          <CardTitle>Ключевые выводы</CardTitle>
          <CardDescription>Автоматически обнаруженные паттерны и аномалии</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-3">
            {insights.map((insight) => {
              const styles = getInsightStyles(insight.type);
              const Icon = insight.icon === 'brain' ? Brain : insight.icon === 'calendar' ? Calendar : AlertTriangle;

              return (
                <div key={insight.title} className={`rounded-xl border px-4 py-4 ${styles.wrapper}`}>
                  <div className="flex items-start gap-4">
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} />
                    <div>
                      <div className="font-semibold">{insight.title}</div>
                      <div className="mt-2 text-sm">{insight.text}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
