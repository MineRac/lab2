import { useEffect, useState } from 'react';
import {
  Bell,
  Bot,
  Brain,
  Building2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { api, type Category, type SettingsData, type Supplier } from '../lib/api';
import { toast } from 'sonner';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [savedSettings, setSavedSettings] = useState<SettingsData | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierDeliveryDays, setNewSupplierDeliveryDays] = useState('7');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [settingsData, supplierData, categoryData] = await Promise.all([api.getSettings(), api.getSuppliers(), api.getCategories()]);
      setSettings(settingsData);
      setSavedSettings(settingsData);
      setSuppliers(supplierData);
      setCategories(categoryData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить настройки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const patch = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  };

  const patchSeasonalityCoefficient = (categoryName: string, value: number) => {
    setSettings((current) => current ? {
      ...current,
      seasonalityCoefficients: {
        ...(current.seasonalityCoefficients ?? {}),
        [categoryName]: value,
      },
    } : current);
  };

  const save = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const saved = await api.updateSettings(settings);
      setSettings(saved);
      setSavedSettings(saved);
      toast.success('Настройки сохранены');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    if (!savedSettings) return;
    setSettings(savedSettings);
    toast.info('Изменения сброшены');
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error('Введите название поставщика');
      return;
    }

    const deliveryDays = Number(newSupplierDeliveryDays);
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) {
      toast.error('Срок доставки должен быть от 1 до 365 дней');
      return;
    }

    try {
      const created = await api.createSupplier(newSupplierName, deliveryDays);
      setSuppliers((current) => {
        const withoutDuplicate = current.filter((supplier) => supplier.id !== created.id && supplier.name.toLowerCase() !== created.name.toLowerCase());
        return [...withoutDuplicate, created].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      });
      setNewSupplierName('');
      setNewSupplierDeliveryDays('7');
      toast.success('Поставщик добавлен');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить поставщика');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-slate-600"><Loader2 className="h-5 w-5 animate-spin mr-2" />Загрузка настроек...</div>;
  }

  if (!settings) {
    return <div className="py-16 text-center text-slate-500">Настройки недоступны</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-violet-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-3 text-white shadow-lg shadow-blue-200/60">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки системы</h1>
              <p className="mt-1 text-sm text-slate-500">Управление параметрами ML и автоматических заказов</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="rounded-xl bg-white/80 shadow-sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Сбросить
            </Button>
            <Button onClick={save} disabled={isSaving} className="rounded-xl shadow-sm">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить изменения
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="ml" className="w-full">
        <TabsList className="rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
          <TabsTrigger value="ml"><Brain className="h-4 w-4 mr-2" />Машинное обучение</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-2" />Автозаказы</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Уведомления</TabsTrigger>
          <TabsTrigger value="suppliers"><Building2 className="h-4 w-4 mr-2" />Поставщики</TabsTrigger>
        </TabsList>

        <TabsContent value="ml" className="space-y-4">
          <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 shadow-sm">
            <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />
            <CardHeader className="relative">
              <CardTitle>Настройки ML-модели</CardTitle>
              <CardDescription>Параметры системы машинного обучения и прогнозирования спроса</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Включить ML-прогнозирование</Label>
                    <p className="text-xs text-slate-500 mt-1">Использовать машинное обучение для прогнозирования спроса</p>
                  </div>
                  <Switch checked={settings.mlEnabled} onCheckedChange={(value) => patch('mlEnabled', value)} />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Минимальный порог уверенности: {settings.mlConfidenceThreshold}%</Label>
                <Slider
                  value={[settings.mlConfidenceThreshold]}
                  onValueChange={([value]) => patch('mlConfidenceThreshold', value)}
                  min={0}
                  max={100}
                  step={1}
                  disabled={!settings.mlEnabled}
                />
                <p className="text-xs text-slate-500">Прогнозы с уверенностью ниже этого порога будут игнорироваться</p>
              </div>

              <div className="space-y-3">
                <Label>Глубина обучающих данных: {settings.mlTrainingDataDays} дней</Label>
                <Slider
                  value={[settings.mlTrainingDataDays]}
                  onValueChange={([value]) => patch('mlTrainingDataDays', value)}
                  min={7}
                  max={365}
                  step={1}
                  disabled={!settings.mlEnabled}
                />
                <p className="text-xs text-slate-500">Количество дней исторических данных для обучения модели</p>
              </div>

              <div className="space-y-3">
                <Label>Частота обновления модели</Label>
                <Select value={settings.mlUpdateFrequency} onValueChange={(value: SettingsData['mlUpdateFrequency']) => patch('mlUpdateFrequency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Ежечасно</SelectItem>
                    <SelectItem value="daily">Ежедневно</SelectItem>
                    <SelectItem value="weekly">Еженедельно</SelectItem>
                    <SelectItem value="monthly">Ежемесячно</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Как часто модель будет переобучаться на новых данных</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 shadow-sm">
            <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-emerald-100/50 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent" />
            <CardHeader className="relative">
              <CardTitle>Учет сезонности</CardTitle>
              <CardDescription>Единая ML-модель может учитывать сезонность автоматически или через ручные коэффициенты по категориям</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-5">
              <div className="space-y-2">
                <Label>Режим сезонности</Label>
                <Select value={settings.seasonalityMode} onValueChange={(value: SettingsData['seasonalityMode']) => patch('seasonalityMode', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Автоматически</SelectItem>
                    <SelectItem value="manual">Ручной коэффициент по категориям</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Алгоритм единый; меняется только способ применения сезонного коэффициента.</p>
              </div>

              {settings.seasonalityMode === 'manual' && (
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                  <div className="mb-4">
                    <div className="font-medium text-slate-900">Коэффициенты сезонности по категориям</div>
                    <p className="mt-1 text-xs text-slate-500">1.00 — без изменений, 1.20 — спрос выше на 20%, 0.80 — спрос ниже на 20%.</p>
                  </div>

                  {categories.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-white/80 p-4 text-center text-sm text-slate-500">Категорий пока нет</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {categories.map((category) => (
                        <div key={category.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <Label>{category.name}</Label>
                            <span className="text-xs text-slate-500">×{Number(settings.seasonalityCoefficients?.[category.name] ?? 1).toFixed(2)}</span>
                          </div>
                          <Input
                            type="number"
                            min={0.1}
                            max={5}
                            step={0.05}
                            value={settings.seasonalityCoefficients?.[category.name] ?? 1}
                            onChange={(e) => patchSeasonalityCoefficient(category.name, Number(e.target.value))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50/40 shadow-sm">
            <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-violet-100/50 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent" />
            <CardHeader className="relative">
              <CardTitle>Настройки автоматических заказов</CardTitle>
              <CardDescription>Параметры создания и управления автоматическими заказами</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Включить автозаказы</Label>
                  <p className="text-xs text-slate-500 mt-1">Разрешить ML-модулю создавать заказы</p>
                </div>
                <Switch checked={settings.autoOrderEnabled} onCheckedChange={(value) => patch('autoOrderEnabled', value)} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Требовать подтверждение</Label>
                  <p className="text-xs text-slate-500 mt-1">Если выключено, ML-заказ сразу создаётся со статусом «В обработке»</p>
                </div>
                <Switch checked={settings.approvalRequired} onCheckedChange={(value) => patch('approvalRequired', value)} />
              </div>

              <Card className="border-slate-200 bg-white/80 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Правила создания заказов</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Стратегия заказа</Label>
                    <Select value={settings.autoOrderStrategy} onValueChange={(value: SettingsData['autoOrderStrategy']) => patch('autoOrderStrategy', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml_forecast">Прогнозная (ML-прогноз)</SelectItem>
                        <SelectItem value="min_stock">По минимальному запасу</SelectItem>
                        <SelectItem value="hybrid">Гибридная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Приоритет заказов</Label>
                    <Select value={settings.orderPriority} onValueChange={(value: SettingsData['orderPriority']) => patch('orderPriority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical_only">Только критические</SelectItem>
                        <SelectItem value="critical_and_low">Критические и низкие</SelectItem>
                        <SelectItem value="all_below_min">Все ниже минимума</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Минимальный заказ</Label>
                  <Input type="number" min={1} value={settings.minOrderQuantity} onChange={(e) => patch('minOrderQuantity', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Максимальный заказ</Label>
                  <Input type="number" min={1} value={settings.maxOrderQuantity} onChange={(e) => patch('maxOrderQuantity', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Буфер запаса, %</Label>
                  <Input type="number" min={0} value={settings.orderBuffer} onChange={(e) => patch('orderBuffer', Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Поставщик по умолчанию</Label>
                  <Select value={settings.defaultSupplier || '__none'} onValueChange={(value) => patch('defaultSupplier', value === '__none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите поставщика" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Не выбран</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>{supplier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Срок поставки по умолчанию, дней</Label>
                  <Input type="number" min={1} value={settings.orderLeadTime} onChange={(e) => patch('orderLeadTime', Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/40 shadow-sm">
            <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-amber-100/50 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
            <CardHeader className="relative">
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>Управление типами уведомлений и способами доставки</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                  <Label>Email-уведомления</Label>
                  <Switch checked={settings.emailNotifications} onCheckedChange={(value) => patch('emailNotifications', value)} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                  <Label>Низкие запасы</Label>
                  <Switch checked={settings.lowStockAlerts} onCheckedChange={(value) => patch('lowStockAlerts', value)} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                  <Label>Подтверждения заказов</Label>
                  <Switch checked={settings.orderConfirmations} onCheckedChange={(value) => patch('orderConfirmations', value)} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                  <Label>ML-рекомендации</Label>
                  <Switch checked={settings.mlRecommendations} onCheckedChange={(value) => patch('mlRecommendations', value)} />
                </div>
              </div>

              <Card className="border-slate-200 bg-white/80 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Email настройки</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email адрес для уведомлений</Label>
                    <Input
                      type="email"
                      value={settings.notificationEmail}
                      onChange={(e) => patch('notificationEmail', e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Частота дайджеста</Label>
                    <Select value={settings.digestFrequency} onValueChange={(value: SettingsData['digestFrequency']) => patch('digestFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Ежедневно</SelectItem>
                        <SelectItem value="weekly">Еженедельно</SelectItem>
                        <SelectItem value="monthly">Ежемесячно</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/40 shadow-sm">
            <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-sky-100/50 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-transparent" />
            <CardHeader className="relative">
              <CardTitle>Поставщики</CardTitle>
              <CardDescription>Управление поставщиками и параметрами доставки</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
                  <div className="space-y-2">
                    <Label>Название поставщика</Label>
                    <Input
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Например, ООО &quot;DNS&quot;"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateSupplier();
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Срок доставки</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={newSupplierDeliveryDays}
                      onChange={(e) => setNewSupplierDeliveryDays(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateSupplier();
                      }}
                    />
                  </div>

                  <Button onClick={handleCreateSupplier}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>
              </div>

              {suppliers.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-white/80 p-6 text-center text-slate-500">Поставщиков пока нет</div>
              ) : (
                <div className="space-y-3">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                      <div>
                        <div className="font-medium text-slate-900">{supplier.name}</div>
                        <div className="text-xs text-slate-500 mt-1">Добавлен: {supplier.createdAt || '—'}</div>
                      </div>
                      <Badge variant="outline">{supplier.deliveryDays} дней</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
