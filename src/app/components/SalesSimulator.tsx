import { useEffect, useMemo, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { api, type InventoryItem, type SalesRecord } from '../lib/api';
import { BarChart3, Loader2, PackageMinus, Play, RefreshCw, ShoppingBag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

export default function SalesSimulator() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [soldAt, setSoldAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [inventoryData, salesData] = await Promise.all([
        api.getInventory(),
        api.getSalesHistory(),
      ]);
      setItems(inventoryData);
      setSales(salesData);
      if (!selectedProductId && inventoryData.length > 0) {
        setSelectedProductId(inventoryData[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить данные симуляции');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedProductId),
    [items, selectedProductId],
  );

  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const safeDiscount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const salePrice = selectedItem ? selectedItem.price * (1 - safeDiscount / 100) : 0;
  const projectedRevenue = salePrice * safeQuantity;
  const projectedRemaining = selectedItem ? selectedItem.quantity - safeQuantity : 0;
  const recentSales = useMemo(() => [...sales].sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()).slice(0, 8), [sales]);
  const todayRevenue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sales
      .filter((sale) => new Date(sale.soldAt).toISOString().slice(0, 10) === today)
      .reduce((sum, sale) => sum + sale.revenue, 0);
  }, [sales]);

  const simulateSale = async () => {
    if (!selectedItem) {
      toast.error('Выберите товар');
      return;
    }

    if (safeQuantity > selectedItem.quantity) {
      toast.error('Количество продажи больше текущего остатка');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.simulateSale({
        productId: selectedItem.id,
        quantity: safeQuantity,
        discountPercent: safeDiscount,
        soldAt: soldAt ? new Date(soldAt).toISOString() : undefined,
      });

      setItems((current) => current.map((item) => item.id === result.item.id ? result.item : item));
      setSales((current) => [result.sale, ...current]);
      setQuantity('1');
      toast.success('Продажа записана, остаток товара обновлён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось симулировать продажу');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickSale = async (product: InventoryItem) => {
    setSelectedProductId(product.id);
    setQuantity('1');
    setDiscountPercent('0');

    if (product.quantity <= 0) {
      toast.error('Товара нет на складе');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.simulateSale({
        productId: product.id,
        quantity: 1,
        discountPercent: 0,
      });
      setItems((current) => current.map((item) => item.id === result.item.id ? result.item : item));
      setSales((current) => [result.sale, ...current]);
      toast.success(`Продажа «${product.name}» записана`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось записать быструю продажу');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка симулятора продаж...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-5 shadow-sm">
        <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-blue-600 p-3 text-white shadow-lg shadow-emerald-200/60">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Симуляция продаж</h2>
              <p className="mt-1 text-sm text-slate-500">Запись продаж в sales_history с автоматическим уменьшением остатков склада</p>
            </div>
          </div>

          <Button variant="outline" onClick={loadData} className="rounded-xl bg-white/85 shadow-sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить данные
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Продаж сегодня</CardTitle>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{currency.format(todayRevenue)}</div>
            <p className="mt-3 text-xs font-medium text-emerald-600">По sales_history</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-100/70 blur-2xl" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Товаров доступно</CardTitle>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{items.filter((item) => item.quantity > 0).length}</div>
            <p className="mt-3 text-xs font-medium text-blue-600">Можно симулировать продажу</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Записей продаж</CardTitle>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-4xl font-bold tracking-tight text-slate-900">{sales.length.toLocaleString('ru-RU')}</div>
            <p className="mt-3 text-xs font-medium text-violet-600">Данные для обучения ML</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 shadow-sm">
          <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-emerald-100/50 blur-3xl" />
          <CardHeader className="relative">
            <CardTitle>Новая продажа</CardTitle>
            <CardDescription>Симуляция сразу записывает продажу и уменьшает остаток товара</CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-5">
            <div className="space-y-2">
              <Label>Товар</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите товар" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · остаток {item.quantity} шт
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItem && (
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{selectedItem.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{selectedItem.id} · {selectedItem.category}</div>
                  </div>
                  <Badge variant="outline" className="bg-white">Остаток: {selectedItem.quantity} шт</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-500">Цена</div>
                    <div className="font-semibold text-slate-900">{currency.format(selectedItem.price)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Мин. запас</div>
                    <div className="font-semibold text-slate-900">{selectedItem.minStock} шт</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Скидка, %</Label>
                <Input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Дата продажи</Label>
              <Input type="datetime-local" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
              <p className="text-xs text-slate-500">Если не выбрать дату, будет использовано текущее время.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500">Сумма продажи</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{currency.format(projectedRevenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Остаток после продажи</div>
                  <div className={`mt-1 text-xl font-bold ${projectedRemaining < 0 ? 'text-red-600' : 'text-slate-900'}`}>{projectedRemaining} шт</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Цена со скидкой</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{currency.format(salePrice)}</div>
                </div>
              </div>
            </div>

            <Button onClick={simulateSale} disabled={isSubmitting || !selectedItem || safeQuantity <= 0 || (selectedItem ? safeQuantity > selectedItem.quantity : true)} className="w-full rounded-xl">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Симулировать продажу
            </Button>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 shadow-sm">
          <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl" />
          <CardHeader className="relative">
            <CardTitle>Быстрая продажа</CardTitle>
            <CardDescription>Один клик — продажа 1 шт. выбранного товара</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  onClick={() => quickSale(item)}
                  disabled={isSubmitting || item.quantity <= 0}
                  className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.category}</div>
                    </div>
                    <PackageMinus className="h-4 w-4 shrink-0 text-blue-600" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Остаток</span>
                    <span className="font-semibold text-slate-900">{item.quantity} шт</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50/30 shadow-sm">
        <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-violet-100/50 blur-3xl" />
        <CardHeader className="relative">
          <CardTitle>Последние продажи</CardTitle>
          <CardDescription>Новые симуляции сразу появляются в истории продаж</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {recentSales.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Продаж пока нет</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Товар</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Количество</TableHead>
                    <TableHead>Выручка</TableHead>
                    <TableHead>Себестоимость</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-sm text-slate-600">{formatDate(sale.soldAt)}</TableCell>
                      <TableCell className="font-medium">{sale.productName}</TableCell>
                      <TableCell>{sale.category}</TableCell>
                      <TableCell>{sale.quantity} шт</TableCell>
                      <TableCell className="font-medium">{currency.format(sale.revenue)}</TableCell>
                      <TableCell>{currency.format(sale.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
