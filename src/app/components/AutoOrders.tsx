import { useEffect, useState } from 'react';
import { Bot, Settings, Package, DollarSign, Calendar, CheckCircle, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { api } from '../lib/api';

export default function AutoOrders() {
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [threshold, setThreshold] = useState([85]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/auto-orders'),
      api.get('/auto-orders/history')
    ]).then(([rulesData, historyData]) => {
      setRules(rulesData);
      setHistory(historyData);
      setLoading(false);
    });
  }, []);

  const toggleAutoOrder = async (enabled: boolean) => {
    setAutoEnabled(enabled);
    await api.post('/auto-orders/settings', { enabled, confidenceThreshold: threshold[0] });
  };

  const runCheck = async () => {
    await api.post('/auto-orders/run');
    const updated = await api.get('/auto-orders/history');
    setHistory(updated);
  };

  if (loading) return <div className="p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      {/* Статистика аналогична старой, но данные из API */}
      <div className="grid grid-cols-4 gap-4">...</div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><Settings className="h-5 w-5 text-white" /></div>
              <div><CardTitle>Настройки автоматизации</CardTitle><CardDescription>Параметры AI‑заказов</CardDescription></div>
            </div>
            <div className="flex items-center gap-2">
              <Label>{autoEnabled ? 'Включено' : 'Выключено'}</Label>
              <Switch checked={autoEnabled} onCheckedChange={toggleAutoOrder} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Минимальная уверенность AI: {threshold[0]}%</Label>
              <Slider value={threshold} onValueChange={setThreshold} min={50} max={100} step={5} disabled={!autoEnabled} className="w-64" />
            </div>
            <Button onClick={runCheck} disabled={!autoEnabled}>Запустить проверку сейчас</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>История автозаказов</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Кол-во</TableHead><TableHead>Сумма</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
            <TableBody>
              {history.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>{order.product?.name}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.totalPrice?.toLocaleString()} ₽</TableCell>
                  <TableCell><Badge>{order.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}