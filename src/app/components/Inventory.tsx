import { useState } from 'react';
import { Search, Filter, Plus, Download, ArrowUpDown, Package2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';

const inventoryData = [
  { id: 'SKU-001', name: 'Ноутбук Dell XPS 15', category: 'Электроника', quantity: 156, minStock: 50, price: 125000, status: 'В наличии', location: 'A-12' },
  { id: 'SKU-002', name: 'Монитор Samsung 27"', category: 'Электроника', quantity: 89, minStock: 30, price: 35000, status: 'В наличии', location: 'B-08' },
  { id: 'SKU-003', name: 'Клавиатура Logitech MX', category: 'Периферия', quantity: 234, minStock: 100, price: 8500, status: 'В наличии', location: 'C-15' },
  { id: 'SKU-004', name: 'Мышь Logitech G502', category: 'Периферия', quantity: 45, minStock: 80, price: 6500, status: 'Низкий запас', location: 'C-16' },
  { id: 'SKU-005', name: 'Наушники Sony WH-1000XM5', category: 'Аудио', quantity: 178, minStock: 60, price: 28000, status: 'В наличии', location: 'D-04' },
  { id: 'SKU-006', name: 'Веб-камера Logitech C920', category: 'Периферия', quantity: 12, minStock: 40, price: 7500, status: 'Критический', location: 'C-17' },
  { id: 'SKU-007', name: 'SSD Samsung 1TB', category: 'Комплектующие', quantity: 267, minStock: 150, price: 9500, status: 'В наличии', location: 'E-22' },
  { id: 'SKU-008', name: 'ОЗУ Kingston 16GB', category: 'Комплектующие', quantity: 89, minStock: 100, price: 5500, status: 'Низкий запас', location: 'E-23' },
];

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredData = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Складские запасы</CardTitle>
              <CardDescription>Управление и отслеживание товаров на складе</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить новый товар</DialogTitle>
                    <DialogDescription>Введите информацию о товаре для добавления в систему</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Название товара</Label>
                      <Input placeholder="Введите название" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Категория</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="electronics">Электроника</SelectItem>
                            <SelectItem value="peripherals">Периферия</SelectItem>
                            <SelectItem value="components">Комплектующие</SelectItem>
                            <SelectItem value="audio">Аудио</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Количество</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Цена (₽)</Label>
                        <Input type="number" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Мин. запас</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Расположение</Label>
                      <Input placeholder="A-01" />
                    </div>
                    <Button className="w-full">Добавить товар</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск по названию или SKU..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                <SelectItem value="Электроника">Электроника</SelectItem>
                <SelectItem value="Периферия">Периферия</SelectItem>
                <SelectItem value="Комплектующие">Комплектующие</SelectItem>
                <SelectItem value="Аудио">Аудио</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="В наличии">В наличии</SelectItem>
                <SelectItem value="Низкий запас">Низкий запас</SelectItem>
                <SelectItem value="Критический">Критический</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.quantity < item.minStock && (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <span>{item.quantity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{item.minStock}</TableCell>
                    <TableCell>{item.price.toLocaleString('ru-RU')} ₽</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.location}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            Показано {filteredData.length} из {inventoryData.length} товаров
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
