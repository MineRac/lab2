import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Download, Package2, AlertCircle, Loader2, Trash2, Tags } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { api, type Category, type InventoryItem } from '../lib/api';

const emptyForm = { name: '', category: '', quantity: '', minStock: '', price: '', location: '' };

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const [inventoryData, categoryData] = await Promise.all([api.getInventory(), api.getCategories()]);
      setItems(inventoryData);
      setCategories(categoryData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить товары');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredData = useMemo(() => items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  }), [items, searchQuery, filterCategory, filterStatus]);

  const categoryOptions = useMemo(
    () => categories.map((category) => category.name).sort((a, b) => a.localeCompare(b, 'ru')),
    [categories]
  );

  const handleCreate = async () => {
    if (!form.name || !form.category || !form.quantity || !form.minStock || !form.price || !form.location) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      const created = await api.createInventoryItem({
        name: form.name,
        category: form.category,
        quantity: Number(form.quantity),
        minStock: Number(form.minStock),
        price: Number(form.price),
        location: form.location
      });
      setItems([created, ...items]);
      setForm(emptyForm);
      setIsDialogOpen(false);
      toast.success('Товар добавлен');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить товар');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      const created = await api.createCategory(newCategoryName);
      setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      setForm((current) => ({ ...current, category: current.category || created.name }));
      setNewCategoryName('');
      toast.success('Категория добавлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить категорию');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    const confirmed = window.confirm(`Удалить категорию «${category.name}»?`);
    if (!confirmed) return;

    setDeletingCategoryId(category.id);
    try {
      await api.deleteCategory(category.id);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (form.category === category.name) {
        setForm((current) => ({ ...current, category: '' }));
      }
      if (filterCategory === category.name) {
        setFilterCategory('all');
      }
      toast.success('Категория удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить категорию');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const confirmed = window.confirm(`Удалить товар «${item.name}» (${item.id})? Это действие нельзя отменить.`);
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      await api.deleteInventoryItem(item.id);
      setItems(currentItems => currentItems.filter(currentItem => currentItem.id !== item.id));
      toast.success('Товар удалён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить товар');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const encodeWindows1251 = (value: string) => {
      const bytes: number[] = [];

      for (const char of value) {
        const code = char.charCodeAt(0);

        if (code <= 0x7F) {
          bytes.push(code);
        } else if (code >= 0x0410 && code <= 0x044F) {
          bytes.push(code - 0x0350);
        } else {
          switch (code) {
            case 0x0401: bytes.push(0xA8); break; // Ё
            case 0x0451: bytes.push(0xB8); break; // ё
            case 0x2116: bytes.push(0xB9); break; // №
            case 0x20BD: bytes.push(0x88); break; // ₽
            case 0x00AB: bytes.push(0xAB); break; // «
            case 0x00BB: bytes.push(0xBB); break; // »
            case 0x2013: bytes.push(0x96); break; // –
            case 0x2014: bytes.push(0x97); break; // —
            case 0x2018: bytes.push(0x91); break; // ‘
            case 0x2019: bytes.push(0x92); break; // ’
            case 0x201C: bytes.push(0x93); break; // “
            case 0x201D: bytes.push(0x94); break; // ”
            default: bytes.push(0x3F); // ?
          }
        }
      }

      return new Uint8Array(bytes);
    };

    const escapeCsvValue = (value: string | number) => {
      const raw = String(value ?? '');
      const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    };

    const header = ['SKU', 'Название товара', 'Категория', 'Количество', 'Минимальный запас', 'Цена, руб.', 'Расположение', 'Статус'];
    const rows = filteredData.map(item => [
      item.id,
      item.name,
      item.category,
      item.quantity,
      item.minStock,
      item.price,
      item.location,
      item.status
    ]);

    const csv = [
      'sep=;',
      header.map(escapeCsvValue).join(';'),
      ...rows.map(row => row.map(escapeCsvValue).join(';'))
    ].join('\r\n');

    const blob = new Blob([encodeWindows1251(csv)], { type: 'text/csv;charset=windows-1251' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `inventory-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'В наличии':
        return <Badge variant="default" className="bg-green-600">В наличии</Badge>;
      case 'Низкий запас':
        return <Badge variant="default" className="bg-amber-600">Низкий запас</Badge>;
      case 'Критический':
        return <Badge variant="destructive">Критический</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Складские запасы</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Tags className="h-4 w-4 mr-2" />
                    Добавить категорию
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Категории товаров</DialogTitle>
                    <DialogDescription>Добавляйте категории, которые будут доступны при создании товара</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Например, Электроника" onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }} />
                      <Button onClick={handleCreateCategory}><Plus className="h-4 w-4 mr-2" />Добавить</Button>
                    </div>

                    <div className="space-y-2">
                      {categoryOptions.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">Категорий пока нет</div>
                      ) : (
                        categories
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                          .map((category) => (
                            <div key={category.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <div className="font-medium text-slate-900">{category.name}</div>
                                {category.createdAt && <div className="mt-1 text-xs text-slate-500">Добавлена: {category.createdAt}</div>}
                              </div>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteCategory(category)} disabled={deletingCategoryId === category.id}>
                                {deletingCategoryId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить новый товар</DialogTitle>
                    <DialogDescription>После сохранения товар попадёт в Supabase</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Название товара</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Введите название" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Категория</Label>
                        <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.length === 0 ? (
                              <SelectItem value="__empty" disabled>Сначала добавьте категорию</SelectItem>
                            ) : categoryOptions.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {categoryOptions.length === 0 && <p className="text-xs text-slate-500">Нажмите «Добавить категорию», чтобы создать первую категорию.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Количество</Label>
                        <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Цена (₽)</Label>
                        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Мин. запас</Label>
                        <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="0" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Расположение</Label>
                      <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="A-01" />
                    </div>
                    <Button className="w-full" onClick={handleCreate} disabled={categoryOptions.length === 0}>Добавить товар</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Поиск по названию или SKU..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categoryOptions.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="В наличии">В наличии</SelectItem>
                <SelectItem value="Низкий запас">Низкий запас</SelectItem>
                <SelectItem value="Критический">Критический</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Название товара</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Мин. запас</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Расположение</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Загрузка...</div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-slate-500">Товары не найдены</TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.quantity < item.minStock && <AlertCircle className="h-4 w-4 text-amber-500" />}
                          {item.quantity}
                        </div>
                      </TableCell>
                      <TableCell>{item.minStock}</TableCell>
                      <TableCell>{item.price.toLocaleString('ru-RU')} ₽</TableCell>
                      <TableCell><Badge variant="outline">{item.location}</Badge></TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(item)} disabled={deletingId === item.id}>
                          {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Package2 className="h-4 w-4" />
            Показано {filteredData.length} из {items.length} товаров
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
