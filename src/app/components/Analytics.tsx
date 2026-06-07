import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { api } from '../lib/api';
import { TrendingUp, DollarSign, Package, ShoppingCart, ArrowUpRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export default function Analytics() {
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, turnover: 0, orders: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [categoryDist, setCategoryDist] = useState([]);
  const [turnoverData, setTurnoverData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/revenue?months=6'),
      api.get('/analytics/categories'),
      api.get('/analytics/turnover-by-category'),
      api.get('/inventory?sort=revenue:desc&limit=5')
    ]).then(([overview, revenue, categories, turnover, top]) => {
      setSummary(overview);
      setRevenueData(revenue);
      setCategoryDist(categories);
      setTurnoverData(turnover);
      setTopProducts(top);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">₽{(summary.revenue / 1e6).toFixed(1)}М</div><p className="text-sm text-slate-500">Выручка</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">₽{(summary.profit / 1e6).toFixed(1)}М</div><p className="text-sm text-slate-500">Прибыль</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.turnover}x</div><p className="text-sm text-slate-500">Оборачиваемость</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.orders}</div><p className="text-sm text-slate-500">Заказов</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Выручка по месяцам</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={revenueData}><CartesianGrid /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="revenue" stroke="#3b82f6" /></LineChart></ResponsiveContainer></CardContent></Card>

      <div className="grid grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Категории</CardTitle></CardHeader><CardContent><PieChart width={400} height={300}><Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label><Cell fill="#3b82f6" /><Cell fill="#8b5cf6" /><Cell fill="#10b981" /><Cell fill="#f59e0b" /></Pie><Tooltip /></PieChart></CardContent></Card>
        <Card><CardHeader><CardTitle>Оборачиваемость по категориям</CardTitle></CardHeader><CardContent><BarChart width={400} height={300} data={turnoverData}><CartesianGrid /><XAxis dataKey="category" /><YAxis /><Tooltip /><Bar dataKey="turnover" fill="#3b82f6" /></BarChart></CardContent></Card>
      </div>
    </div>
  );
}