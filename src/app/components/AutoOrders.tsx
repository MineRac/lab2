import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  Calendar,
  Loader2,
  Pause,
  Play,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { api, getOrderStatusLabel, type AutoOrder, type InventoryItem, type OrderStatus, type SettingsData, type Supplier } from '../lib/api';

const formatCurrency = (value: number) => `₽${value.toLocaleString('ru-RU')}`;
const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `₽${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₽${(value / 1_000).toFixed(0)}K`;
  return formatCurrency(value);
};

const getStatusVariantClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-600 hover:bg-green-600';
    case 'processing':
      return 'bg-blue-600 hover:bg-blue-600';
    case 'pending':
      return 'bg-slate-200 text-slate-900 hover:bg-slate-200';
    case 'scheduled':
      return 'bg-fuchsia-600 hover:bg-fuchsia-600';
    case 'paused':
      return 'bg-amber-600 hover:bg-amber-600';
    case 'cancelled':
      return 'bg-red-600 hover:bg-red-600';
    default:
      return 'bg-slate-600 hover:bg-slate-600';
  }
};

export default function AutoOrders() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [orders, setOrders] = useState<AutoOrder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [orderDeletingId, setOrderDeletingId] = useState<string | null>(null);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);
  const [manualOrderProduct, setManualOrderProduct] = useState('');
  const [manualOrderQuantity, setManualOrderQuantity] = useState('');
  const [manualOrderSupplier, setManualOrderSupplier] = useState('');
  const [plannedOrderSuppliers, setPlannedOrderSuppliers] = useState<Record<string, string>>({});
  const [plannedOrderQuantities, setPlannedOrderQuantities] = useState<Record<string, string>>({});
  const [planningItemId, setPlanningItemId] = useState<string | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierDeliveryDays, setNewSupplierDeliveryDays] = useState('7');
  const [supplierDeletingId, setSupplierDeletingId] = useState<string | null>(null);
  const [supplierSavingId, setSupplierSavingId] = useState<string | null>(null);
  const [isMlRunning, setIsMlRunning] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [orderData, settingsData, inventoryData, supplierData] = await Promise.all([
        api.getOrders(),
        api.getSettings(),
        api.getInventory(),
        api.getSuppliers(),
      ]);
      setOrders(orderData);
      setSettings(settingsData);
      setInventoryItems(inventoryData);
      setSuppliers(supplierData);
      const defaultSupplierName = supplierData[0]?.name ?? settingsData.defaultSupplier ?? '';
      setManualOrderSupplier(defaultSupplierName);
      setPlannedOrderSuppliers(Object.fromEntries(inventoryData.map((item) => [item.id, defaultSupplierName])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить заказы');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async (patch: Partial<SettingsData>) => {
    if (!settings) return;
    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      setSettings(await api.updateSettings(patch));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить настройки');
      setSettings(previous);
    }
  };

  const handleRunMlAutoOrders = async () => {
    setIsMlRunning(true);
    try {
      const result = await api.runMlAutoOrders();
      if (result.created.length > 0) {
        setOrders((current) => [...result.created, ...current]);
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
      if (result.skipped.length > 0) {
        console.info('ML auto-order skipped:', result.skipped);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось запустить ML-заказы');
    } finally {
      setIsMlRunning(false);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus, successMessage: string) => {
    try {
      const updated = await api.updateOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось изменить заказ');
    }
  };

  const handleCreateManualOrder = async () => {
    if (!manualOrderProduct || !manualOrderQuantity || !manualOrderSupplier) {
      toast.error('Заполните товар, количество и поставщика');
      return;
    }

    try {
      const selectedItem = inventoryItems.find((item) => item.name === manualOrderProduct);
      const quantity = Number(manualOrderQuantity);
      const created = await api.createOrder({
        product: manualOrderProduct,
        quantity,
        supplier: manualOrderSupplier,
        predictedStock: selectedItem?.quantity ?? 0,
        orderValue: selectedItem ? selectedItem.price * quantity : 0,
        reason: 'Создано вручную',
      });
      setOrders((current) => [created, ...current]);
      toast.success('Заказ успешно создан');
      setIsManualOrderOpen(false);
      setManualOrderProduct('');
      setManualOrderQuantity('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать заказ');
    }
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
      setManualOrderSupplier(created.name);
      setNewSupplierName('');
      setNewSupplierDeliveryDays('7');
      toast.success('Поставщик добавлен');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить поставщика');
    }
  };

  const handleUpdateSupplierDeliveryDays = async (supplier: Supplier, value: string) => {
    const deliveryDays = Number(value);
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) {
      toast.error('Срок доставки должен быть от 1 до 365 дней');
      return;
    }

    setSupplierSavingId(supplier.id);
    try {
      const updated = await api.updateSupplier(supplier.id, { deliveryDays });
      setSuppliers((current) => current.map((currentSupplier) => currentSupplier.id === updated.id ? updated : currentSupplier));
      toast.success('Срок доставки обновлён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить поставщика');
    } finally {
      setSupplierSavingId(null);
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    const confirmed = window.confirm(`Удалить поставщика «${supplier.name}»? Уже созданные заказы не изменятся.`);
    if (!confirmed) return;

    setSupplierDeletingId(supplier.id);
    try {
      await api.deleteSupplier(supplier.id);
      setSuppliers((current) => current.filter((currentSupplier) => currentSupplier.id !== supplier.id));
      if (manualOrderSupplier === supplier.name) setManualOrderSupplier('');
      toast.success('Поставщик удалён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить поставщика');
    } finally {
      setSupplierDeletingId(null);
    }
  };

  const getRecommendedOrderQuantity = (item: InventoryItem) => {
    const minOrderQuantity = settings?.minOrderQuantity ?? 10;
    const buffer = settings?.orderBuffer ?? 20;
    const targetStock = item.minStock + Math.ceil(item.minStock * (buffer / 100));
    return Math.max(minOrderQuantity, targetStock - item.quantity);
  };

  const handleCreatePlannedOrder = async (item: InventoryItem) => {
    const supplier = plannedOrderSuppliers[item.id];
    const quantity = Number(plannedOrderQuantities[item.id] || getRecommendedOrderQuantity(item));

    if (!supplier) {
      toast.error('Выберите поставщика для плановой закупки');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Укажите корректное количество');
      return;
    }

    setPlanningItemId(item.id);
    try {
      const created = await api.createOrder({
        product: item.name,
        quantity,
        supplier,
        predictedStock: item.quantity,
        orderValue: item.price * quantity,
        status: 'scheduled',
        reason: `Плановая закупка: остаток ${item.quantity}, минимальный запас ${item.minStock}`,
      });
      setOrders((current) => [created, ...current]);
      toast.success('Плановая закупка создана');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать плановую закупку');
    } finally {
      setPlanningItemId(null);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    await updateStatus(orderToCancel, 'cancelled', 'Заказ отменён');
    setOrderToCancel(null);
  };

  const handleDeleteOrder = async (order: AutoOrder) => {
    const confirmed = window.confirm(`Удалить отменённый заказ «${order.id}»? Это действие нельзя отменить.`);
    if (!confirmed) return;

    setOrderDeletingId(order.id);
    try {
      await api.deleteOrder(order.id);
      setOrders((current) => current.filter((currentOrder) => currentOrder.id !== order.id));
      toast.success('Заказ удалён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить заказ');
    } finally {
      setOrderDeletingId(null);
    }
  };

  const productOptions = useMemo(
    () => [...inventoryItems].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [inventoryItems]
  );

  const supplierOptions = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((supplier) => supplier.name),
    [suppliers]
  );

  const selectedManualOrderItem = useMemo(
    () => inventoryItems.find((item) => item.name === manualOrderProduct) ?? null,
    [inventoryItems, manualOrderProduct]
  );

  const manualOrderQuantityNumber = Number(manualOrderQuantity);
  const manualOrderTotal = selectedManualOrderItem && Number.isFinite(manualOrderQuantityNumber)
    ? selectedManualOrderItem.price * manualOrderQuantityNumber
    : 0;

  const productsWithActiveOrders = useMemo(() => new Set(
    orders
      .filter((order) => ['pending', 'processing', 'scheduled', 'paused'].includes(order.status))
      .map((order) => order.product)
  ), [orders]);

  const planningItems = useMemo(
    () => inventoryItems
      .filter((item) => item.quantity < item.minStock && !productsWithActiveOrders.has(item.name))
      .sort((a, b) => (a.quantity / Math.max(a.minStock, 1)) - (b.quantity / Math.max(b.minStock, 1))),
    [inventoryItems, productsWithActiveOrders]
  );

  const aiOrders = useMemo(() => orders.filter((order) => order.aiConfidence > 0), [orders]);
  const scheduledOrders = useMemo(() => orders.filter((order) => order.status === 'scheduled'), [orders]);
  const activeAiOrders = useMemo(() => aiOrders.filter((order) => !['completed', 'cancelled'].includes(order.status)), [aiOrders]);
  const aiTotalValue = aiOrders.reduce((sum, order) => sum + order.orderValue, 0);
  const avgConfidence = aiOrders.length > 0
    ? aiOrders.reduce((sum, order) => sum + order.aiConfidence, 0) / aiOrders.length
    : 0;
  const systemAccuracy = aiOrders.length > 0
    ? (aiOrders.filter((order) => ['completed', 'processing'].includes(order.status)).length / aiOrders.length) * 100
    : 0;
  const completedAiOrders = aiOrders.filter((order) => order.status === 'completed');
  const savingsEstimate = completedAiOrders.reduce((sum, order) => sum + order.orderValue, 0) * 0.04;
  const lowStockCount = inventoryItems.filter((item) => item.quantity < item.minStock).length;

  const automationRules = [
    `Заказ создаётся, если остаток товара ниже минимального запаса`,
    `AI-уверенность должна быть не ниже ${settings?.mlConfidenceThreshold ?? 0}%`,
    settings?.approvalRequired
      ? 'Новые ML-заказы создаются со статусом «Ожидает подтверждения»'
      : 'Новые ML-заказы сразу переходят в статус «В обработке»',
    'По товару с уже активным заказом дубликат не создаётся',
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className={getStatusVariantClass(status)}><CheckCircle className="h-3 w-3 mr-1" />{getOrderStatusLabel(status)}</Badge>;
      case 'processing':
        return <Badge className={getStatusVariantClass(status)}><Clock className="h-3 w-3 mr-1" />{getOrderStatusLabel(status)}</Badge>;
      case 'pending':
        return <Badge className={getStatusVariantClass(status)}><Clock className="h-3 w-3 mr-1" />{getOrderStatusLabel(status)}</Badge>;
      case 'scheduled':
        return <Badge className={getStatusVariantClass(status)}><Calendar className="h-3 w-3 mr-1" />{getOrderStatusLabel(status)}</Badge>;
      case 'paused':
        return <Badge className={getStatusVariantClass(status)}><Pause className="h-3 w-3 mr-1" />{getOrderStatusLabel(status)}</Badge>;
      case 'cancelled':
        return <Badge className={getStatusVariantClass(status)}><XCircle className="h-3 w-3 mr-1" />{getOrderStatusLabel(status)}</Badge>;
      default:
        return <Badge variant="outline">{getOrderStatusLabel(status)}</Badge>;
    }
  };

  const renderOrderActions = (order: AutoOrder) => (
    <div className="flex flex-wrap justify-end gap-2">
      {order.status === 'pending' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus(order.id, 'processing', 'Заказ подтверждён')}
          className="h-8 px-2 text-green-700 hover:text-green-800"
          title="Подтвердить заказ"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
      {order.status === 'processing' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus(order.id, 'completed', 'Заказ выполнен')}
          className="h-8 px-2 text-green-700 hover:text-green-800"
          title="Отметить как выполненный"
        >
          <CheckCircle className="h-3.5 w-3.5" />
        </Button>
      )}
      {order.status === 'paused' && (
        <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'pending', 'Заказ возобновлён')} title="Возобновить" className="h-8 px-2">
          <Play className="h-3.5 w-3.5" />
        </Button>
      )}
      {(order.status === 'pending' || order.status === 'scheduled') && (
        <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'paused', 'Заказ приостановлен')} title="Приостановить" className="h-8 px-2">
          <Pause className="h-3.5 w-3.5" />
        </Button>
      )}
      {order.status !== 'completed' && order.status !== 'cancelled' && (
        <Button size="sm" variant="outline" onClick={() => setOrderToCancel(order.id)} className="h-8 px-2 text-red-600 hover:text-red-700" title="Отменить">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
      {order.status === 'cancelled' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDeleteOrder(order)}
          className="h-8 px-2 text-red-600 hover:text-red-700"
          title="Удалить заказ"
          disabled={orderDeletingId === order.id}
        >
          {orderDeletingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка заказов...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">AI Автозаказы</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{aiOrders.length}</div>
            <p className="mt-3 text-xs font-medium text-slate-600">Активных: {activeAiOrders.length}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Общая сумма</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{formatCompactCurrency(aiTotalValue)}</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">Автоматические заказы</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Средняя уверенность</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{avgConfidence.toFixed(1)}%</div>
            <Progress value={avgConfidence} className="mt-4 h-2.5 rounded-full bg-orange-100/80" indicatorClassName="bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent" />
          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Точность системы</CardTitle>
            <div className="rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{systemAccuracy.toFixed(1)}%</div>
            <p className="mt-3 text-xs font-medium text-violet-600">Успешность AI-заказов</p>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm">
        <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />
        <CardHeader className="relative">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 shadow-lg shadow-blue-200/60">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Настройки автоматизации AI</CardTitle>
                <CardDescription>Управление параметрами автоматических заказов</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start rounded-full border bg-white/80 px-4 py-2 shadow-sm xl:pt-1">
              <span className="text-sm font-medium text-slate-700">{settings?.autoOrderEnabled ? 'Включено' : 'Выключено'}</span>
              <Switch checked={!!settings?.autoOrderEnabled} onCheckedChange={(value) => saveSettings({ autoOrderEnabled: value })} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Label>Минимальная уверенность AI: {settings?.mlConfidenceThreshold ?? 0}%</Label>
              <Slider
                value={[settings?.mlConfidenceThreshold ?? 0]}
                onValueChange={([value]) => saveSettings({ mlConfidenceThreshold: value })}
                min={50}
                max={100}
                step={1}
                disabled={!settings?.autoOrderEnabled}
              />
              <p className="text-xs text-slate-500">Заказы создаются только при уверенности AI выше заданного порога.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Требуется подтверждение</Label>
                  <p className="mt-1 text-xs text-slate-500">Если включено, все ML-заказы требуют ручного подтверждения перед отправкой поставщику.</p>
                </div>
                <Switch checked={!!settings?.approvalRequired} onCheckedChange={(value) => saveSettings({ approvalRequired: value })} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur">
            <h4 className="font-semibold text-slate-900">Активные правила автозаказа</h4>
            <div className="mt-3 space-y-2">
              {automationRules.map((rule) => (
                <div key={rule} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRunMlAutoOrders} disabled={isMlRunning || !settings?.mlEnabled || !settings?.autoOrderEnabled} className="rounded-xl shadow-sm">
              {isMlRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Запустить ML-заказы
            </Button>
            {!settings?.mlEnabled && <p className="self-center text-xs text-slate-500">ML-модуль выключен в настройках системы.</p>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="mb-2 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
          <TabsTrigger value="history">История заказов</TabsTrigger>
          <TabsTrigger value="scheduled">Запланированные ({scheduledOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 shadow-sm">
            <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl" />
            <CardHeader className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>История автоматических заказов</CardTitle>
                  <CardDescription>Все заказы, созданные системой AI и вручную за текущий период</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog open={isSuppliersOpen} onOpenChange={setIsSuppliersOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline"><Building2 className="mr-2 h-4 w-4" />Поставщики</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Поставщики</DialogTitle>
                        <DialogDescription>Список хранится в Supabase и используется в ручных заказах</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} placeholder="Название поставщика" onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSupplier(); }} />
                          <Input className="w-40" type="number" min={1} max={365} value={newSupplierDeliveryDays} onChange={(e) => setNewSupplierDeliveryDays(e.target.value)} placeholder="Дней" onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSupplier(); }} />
                          <Button onClick={handleCreateSupplier}><Plus className="mr-2 h-4 w-4" />Добавить</Button>
                        </div>
                        <div className="max-h-80 divide-y overflow-auto rounded-lg border">
                          {suppliers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">Поставщиков пока нет</div>
                          ) : suppliers.map((supplier) => (
                            <div key={supplier.id} className="flex items-center justify-between gap-4 p-3">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-slate-900">{supplier.name}</div>
                                {supplier.createdAt && <div className="mt-1 text-xs text-slate-500">Добавлен: {supplier.createdAt}</div>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="whitespace-nowrap text-xs text-slate-500">Доставка, дней</Label>
                                <Input
                                  className="w-24"
                                  type="number"
                                  min={1}
                                  max={365}
                                  defaultValue={supplier.deliveryDays}
                                  disabled={supplierSavingId === supplier.id}
                                  onBlur={(e) => {
                                    if (Number(e.currentTarget.value) !== supplier.deliveryDays) {
                                      handleUpdateSupplierDeliveryDays(supplier, e.currentTarget.value);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                  }}
                                />
                                {supplierSavingId === supplier.id && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteSupplier(supplier)} disabled={supplierDeletingId === supplier.id}>
                                  {supplierDeletingId === supplier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isManualOrderOpen} onOpenChange={setIsManualOrderOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="mr-2 h-4 w-4" />Создать заказ вручную</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Создать ручной заказ</DialogTitle>
                        <DialogDescription>Заказ будет сохранён в Supabase</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Товар</Label>
                          <Select value={manualOrderProduct} onValueChange={setManualOrderProduct}>
                            <SelectTrigger><SelectValue placeholder="Название товара" /></SelectTrigger>
                            <SelectContent>
                              {productOptions.length === 0 ? (
                                <SelectItem value="__empty_products" disabled>Нет товаров</SelectItem>
                              ) : productOptions.map((item) => (
                                <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Количество</Label>
                          <Input type="number" value={manualOrderQuantity} onChange={(e) => setManualOrderQuantity(e.target.value)} placeholder="0" />
                        </div>
                        {selectedManualOrderItem && (
                          <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Цена товара</span>
                              <span className="font-medium">{selectedManualOrderItem.price.toLocaleString('ru-RU')} ₽</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-slate-600">Итоговая сумма</span>
                              <span className="font-semibold text-slate-900">{manualOrderTotal > 0 ? `${manualOrderTotal.toLocaleString('ru-RU')} ₽` : '—'}</span>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Поставщик</Label>
                          <Select value={manualOrderSupplier} onValueChange={setManualOrderSupplier}>
                            <SelectTrigger><SelectValue placeholder="Выберите поставщика" /></SelectTrigger>
                            <SelectContent>
                              {supplierOptions.length === 0 ? (
                                <SelectItem value="__empty_suppliers" disabled>Нет поставщиков</SelectItem>
                              ) : supplierOptions.map((supplierName) => (
                                <SelectItem key={supplierName} value={supplierName}>{supplierName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {suppliers.find((supplier) => supplier.name === manualOrderSupplier)?.deliveryDays && (
                            <p className="text-xs text-slate-500">Дата доставки будет рассчитана по сроку выбранного поставщика.</p>
                          )}
                          {supplierOptions.length === 0 && <p className="text-xs text-slate-500">Добавьте поставщика через меню «Поставщики».</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateManualOrder} className="flex-1">Создать заказ</Button>
                          <Button variant="outline" onClick={() => setIsManualOrderOpen(false)} className="flex-1">Отмена</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm lg:block">
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
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-slate-500">Заказов пока нет</TableCell>
                      </TableRow>
                    ) : orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.product}</div>
                            <div className="mt-1 text-xs text-slate-500">{order.reason}</div>
                          </div>
                        </TableCell>
                        <TableCell>{order.quantity} шт</TableCell>
                        <TableCell>{order.supplier}</TableCell>
                        <TableCell className="font-medium">{order.orderValue > 0 ? formatCurrency(order.orderValue) : '—'}</TableCell>
                        <TableCell>
                          {order.aiConfidence > 0 ? (
                            <div className="flex min-w-32 items-center gap-2">
                              <Progress value={order.aiConfidence} className="h-2 w-16" />
                              <span className="text-sm font-medium">{order.aiConfidence}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">Ручной</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{order.createdAt}</TableCell>
                        <TableCell className="text-sm text-slate-600">{order.deliveryDate}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">{renderOrderActions(order)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 lg:hidden">
                {orders.length === 0 ? (
                  <div className="rounded-lg border p-6 text-center text-slate-500">Заказов пока нет</div>
                ) : orders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">{order.id}</div>
                        <div className="mt-1 font-semibold text-slate-900">{order.product}</div>
                        <div className="mt-1 text-xs text-slate-500">{order.reason}</div>
                      </div>
                      <div>{getStatusBadge(order.status)}</div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Количество</div>
                        <div className="font-medium">{order.quantity} шт</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Сумма</div>
                        <div className="font-medium">{order.orderValue > 0 ? formatCurrency(order.orderValue) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Поставщик</div>
                        <div className="font-medium break-words">{order.supplier}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Доставка</div>
                        <div className="font-medium">{order.deliveryDate}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <div className="text-xs text-slate-500">AI уверенность</div>
                      {order.aiConfidence > 0 ? (
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={order.aiConfidence} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{order.aiConfidence}%</span>
                        </div>
                      ) : (
                        <div className="font-medium">Ручной заказ</div>
                      )}
                    </div>
                    <div className="mt-4 border-t pt-3">{renderOrderActions(order)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50/40 shadow-sm">
            <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-fuchsia-100/40 blur-3xl" />
            <CardHeader className="relative">
              <CardTitle>Аналитика автоматических заказов</CardTitle>
              <CardDescription>Статистика и рекомендации AI</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-4 w-4" />Предотвращено дефицитов</div>
                  <div className="mt-3 text-3xl font-bold text-emerald-800">{Math.max(completedAiOrders.length, aiOrders.length - lowStockCount, 0)}</div>
                  <div className="mt-1 text-sm text-emerald-700">За последний период</div>
                </div>
                <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-blue-700"><DollarSign className="h-4 w-4" />Экономия средств</div>
                  <div className="mt-3 text-3xl font-bold text-blue-800">{formatCompactCurrency(savingsEstimate)}</div>
                  <div className="mt-1 text-sm text-blue-700">Оценка оптимизации запасов</div>
                </div>
                <div className="rounded-2xl border border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50 to-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-fuchsia-700"><TrendingUp className="h-4 w-4" />Время реакции</div>
                  <div className="mt-3 text-3xl font-bold text-fuchsia-800">&lt;2 мин</div>
                  <div className="mt-1 text-sm text-fuchsia-700">Среднее время создания заказа</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Запланированные заказы</CardTitle>
              <CardDescription>AI планирует создать эти заказы в ближайшее время</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">Запланированных заказов пока нет</div>
              ) : (
                <div className="space-y-3">
                  {scheduledOrders.map((order) => {
                    const confidence = order.aiConfidence > 0 ? order.aiConfidence : Math.max(settings?.mlConfidenceThreshold ?? 0, 70);
                    return (
                      <div key={order.id} className="rounded-xl border bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900">{order.product}</div>
                            <div className="mt-1 text-sm text-slate-500">Запланировано на {order.deliveryDate || '—'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-500">Количество</div>
                            <div className="text-2xl font-bold text-slate-900">{order.quantity} шт</div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <span className="text-sm text-slate-600">AI уверенность:</span>
                          <div className="flex flex-1 items-center gap-3">
                            <Progress value={confidence} className="h-2 flex-1" />
                            <span className="min-w-10 text-right text-sm font-medium">{confidence}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Планирование закупок</CardTitle>
              <CardDescription>Создание новых запланированных заказов по товарам ниже минимального запаса</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Товар</TableHead>
                      <TableHead>Остаток</TableHead>
                      <TableHead>Мин. запас</TableHead>
                      <TableHead>Рекомендация</TableHead>
                      <TableHead>Поставщик</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead className="text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planningItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-slate-500">Товаров для закупки сейчас нет или по ним уже есть активные заказы</TableCell>
                      </TableRow>
                    ) : planningItems.map((item) => {
                      const recommendedQuantity = getRecommendedOrderQuantity(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.id} · {item.category}</div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.minStock}</TableCell>
                          <TableCell>{recommendedQuantity} шт</TableCell>
                          <TableCell>
                            <Select value={plannedOrderSuppliers[item.id] ?? ''} onValueChange={(value) => setPlannedOrderSuppliers((current) => ({ ...current, [item.id]: value }))}>
                              <SelectTrigger className="w-56">
                                <SelectValue placeholder="Выберите поставщика" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.length === 0 ? (
                                  <SelectItem value="__empty_suppliers" disabled>Нет поставщиков</SelectItem>
                                ) : suppliers.map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.name}>{supplier.name} · {supplier.deliveryDays} дн.</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input className="w-28" type="number" min={1} value={plannedOrderQuantities[item.id] ?? String(recommendedQuantity)} onChange={(e) => setPlannedOrderQuantities((current) => ({ ...current, [item.id]: e.target.value }))} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleCreatePlannedOrder(item)} disabled={planningItemId === item.id || suppliers.length === 0}>
                              {planningItemId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                              Запланировать
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!orderToCancel} onOpenChange={() => setOrderToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить заказ?</AlertDialogTitle>
            <AlertDialogDescription>Это действие изменит статус заказа на сервере.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} className="bg-red-600 hover:bg-red-700">Отменить заказ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
