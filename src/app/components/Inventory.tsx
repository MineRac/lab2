import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Download,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

import { getInventory } from "../../api/inventory";

export default function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getInventory();
        setInventory(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = inventory.filter((item) => {
    const name = item.product?.name?.toLowerCase() || "";
    const sku = item.id?.toString() || "";
    return (
      name.includes(search.toLowerCase()) ||
      sku.includes(search.toLowerCase())
    );
  });

  const getStatus = (item: any) => {
    if (item.quantity <= item.min_stock) {
      return "Критический";
    }
    if (item.quantity <= item.min_stock * 1.5) {
      return "Низкий запас";
    }
    return "В наличии";
  };

  const getBadge = (status: string) => {
    switch (status) {
      case "Критический":
        return <Badge variant="destructive">{status}</Badge>;
      case "Низкий запас":
        return <Badge variant="secondary">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Загрузка склада...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Склад</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по товару или SKU..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Фильтр
          </Button>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Товары</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Количество</TableHead>
                <TableHead>Мин. запас</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((item) => {
                const status = getStatus(item);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      SKU-{item.id}
                    </TableCell>

                    <TableCell>{item.product?.name}</TableCell>

                    <TableCell>{item.product?.category}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.quantity <= item.min_stock && (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        {item.quantity}
                      </div>
                    </TableCell>

                    <TableCell>{item.min_stock}</TableCell>

                    <TableCell>
                      ₽{item.product?.price?.toLocaleString("ru-RU")}
                    </TableCell>

                    <TableCell>{item.location}</TableCell>

                    <TableCell>{getBadge(status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="mt-4 text-sm text-slate-500">
            Показано {filtered.length} из {inventory.length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
