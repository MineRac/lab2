import { useEffect, useState } from 'react';
import {
  Search,
  AlertCircle,
  Package2
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const API_URL = 'http://localhost:8000';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    fetch(`${API_URL}/inventory`)
      .then(r => r.json())
      .then(setItems);
  }, []);

  const filtered = items.filter(i => {
    const matchesSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === 'all' || i.category === category;

    const matchesStatus =
      status === 'all' || i.status === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'В наличии':
        return <Badge className="bg-green-600">{status}</Badge>;

      case 'Низкий запас':
        return <Badge className="bg-amber-500">{status}</Badge>;

      case 'Критический':
        return <Badge className="bg-red-600">{status}</Badge>;

      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <Card>
        <CardHeader>
          <CardTitle>Склад</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex gap-2">

            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </div>

          <div className="flex gap-2">

            <select
              className="border p-2 rounded"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Все категории</option>
              <option value="Электроника">Электроника</option>
              <option value="Периферия">Периферия</option>
              <option value="Комплектующие">Комплектующие</option>
              <option value="Аудио">Аудио</option>
            </select>

            <select
              className="border p-2 rounded"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Все статусы</option>
              <option value="В наличии">В наличии</option>
              <option value="Низкий запас">Низкий запас</option>
              <option value="Критический">Критический</option>
            </select>

          </div>

        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Товары ({filtered.length})</CardTitle>
        </CardHeader>

        <CardContent>

          <div className="space-y-2">

            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border p-3 rounded"
              >

                <div>
                  <div className="font-medium">
                    {item.name}
                  </div>

                  <div className="text-sm text-gray-500">
                    {item.id} • {item.category}
                  </div>

                  <div className="text-sm">
                    Остаток: {item.quantity} / min {item.minStock}
                  </div>
                </div>

                <div className="flex items-center gap-3">

                  {item.quantity < item.minStock && (
                    <AlertCircle className="text-amber-500" />
                  )}

                  {getStatusBadge(item.status)}

                </div>

              </div>
            ))}

          </div>

        </CardContent>
      </Card>

    </div>
  );
}
