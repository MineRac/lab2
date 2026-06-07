import { useEffect, useState } from "react";
import { Search, Filter, Plus, AlertCircle } from "lucide-react";

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

import { getInventory } from "@/api/inventory";

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
    const name = item.name?.toLowerCase() || "";
    const sku = item.id?.toString() || "";

    return (
      name.includes(search.toLowerCase()) ||
      sku.includes(search.toLowerCase())
    );
  });

  const getStatus = (item: any) => {
    if (item.quantity <= item.minStock) return "Критический";
    if (item.quantity <= item.minStock * 1.5) return "Низкий запас";
    return "В наличии";
  };

  const getBadge = (status: string) => {
    if (status === "Критический")
      return <Badge variant="destructive">{status}</Badge>;

    if (status === "Низкий запас")
      return <Badge variant="secondary">{status}</Badge>;

    return <Badge>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <Card>
        <CardHeader>
          <CardTitle>Склад</CardTitle>

          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Фильтр
            </Button>

            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* TABLE */}
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

                    <TableCell>{item.name}</TableCell>

                    <TableCell>{item.category}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.quantity <= item.minStock && (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        {item.quantity}
                      </div>
                    </TableCell>

                    <TableCell>{item.minStock}</TableCell>

                    <TableCell>
                      ₽{item.price?.toLocaleString("ru-RU")}
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
