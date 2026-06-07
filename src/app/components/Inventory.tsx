import { useEffect, useState } from 'react';
import { Search, Plus, Download, AlertCircle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { api } from '../lib/api';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', sku: '', category: '', price: 0, stock: 0, minStock: 0, location: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category !== 'all') params.append('category', category);
      const data = await api.get(`/inventory?${params.toString()}`);
      setProducts(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/inventory/${editingId}`, form);
      } else {
        await api.post('/inventory', form);
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm({ name: '', sku: '', category: '', price: 0, stock: 0, minStock: 0, location: '' });
      fetchProducts();
    } catch (err) {
      alert('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить товар?')) {
      await api.delete(`/inventory/${id}`);
      fetchProducts();
    }
  };

  const editProduct = (p: any) => {
    setEditingId(p.id);
    setForm(p);
    setDialogOpen(true);
  };

  const getStatus = (stock: number, minStock: number) => {
    if (stock <= 0) return { label: 'Критический', variant: 'destructive' };
    if (stock < minStock) return { label: 'Низкий запас', variant: 'default' };
    return { label: 'В наличии', variant: 'secondary' };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Складские запасы</CardTitle>
              <CardDescription>Управление товарами</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingId(null); setForm({ name: '', sku: '', category: '', price: 0, stock: 0, minStock: 0, location: '' }); }}>
                    <Plus className="h-4 w-4 mr-2" />Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Редактировать' : 'Новый товар'}</DialogTitle>
                    <DialogDescription>Заполните поля</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="SKU" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
                    <Input placeholder="Название" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <Input placeholder="Категория" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                    <Input type="number" placeholder="Цена" value={form.price} onChange={e => setForm({...form, price: +e.target.value})} />
                    <Input type="number" placeholder="Количество" value={form.stock} onChange={e => setForm({...form, stock: +e.target.value})} />
                    <Input type="number" placeholder="Мин. запас" value={form.minStock} onChange={e => setForm({...form, minStock: +e.target.value})} />
                    <Input placeholder="Расположение" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    <Button onClick={handleSave}>Сохранить</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Поиск..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="Электроника">Электроника</SelectItem>
                <SelectItem value="Периферия">Периферия</SelectItem>
                <SelectItem value="Комплектующие">Комплектующие</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead><TableHead>Название</TableHead><TableHead>Категория</TableHead>
                    <TableHead>Кол-во</TableHead><TableHead>Мин.</TableHead><TableHead>Цена</TableHead>
                    <TableHead>Статус</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: any) => {
                    const status = getStatus(p.stock, p.minStock);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.sku}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {p.stock < p.minStock && <AlertCircle className="h-4 w-4 text-amber-600" />}
                          {p.stock}
                        </TableCell>
                        <TableCell>{p.minStock}</TableCell>
                        <TableCell>{p.price.toLocaleString()} ₽</TableCell>
                        <TableCell><Badge variant={status.variant as any}>{status.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => editProduct(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}