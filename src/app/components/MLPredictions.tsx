import { useEffect, useState } from 'react';
import { Brain, TrendingUp, Target, Zap, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { api } from '../lib/api';

export default function MLPredictions() {
  const [modelInfo, setModelInfo] = useState({ accuracy: 94.3, predictionsCount: 2847, avgConfidence: 91.8, savings: 1200000 });
  const [forecast, setForecast] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [seasonality, setSeasonality] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/predictions/model-info'),
      api.get('/predictions/forecast?weeks=8'),
      api.get('/predictions/restock-recommendations'),
      api.get('/analytics/seasonality')
    ]).then(([info, fc, rec, seas]) => {
      setModelInfo(info);
      setForecast(fc);
      setRecommendations(rec);
      setSeasonality(seas);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Загрузка прогнозов...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{modelInfo.accuracy}%</div><p className="text-sm">Точность модели</p><Progress value={modelInfo.accuracy} className="mt-2" /></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{modelInfo.predictionsCount}</div><p className="text-sm">Прогнозов создано</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{modelInfo.avgConfidence}%</div><p className="text-sm">Средняя уверенность</p><Progress value={modelInfo.avgConfidence} className="mt-2" /></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">₽{(modelInfo.savings / 1e6).toFixed(1)}М</div><p className="text-sm">Экономия</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Прогноз спроса (следующие 8 недель)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><AreaChart data={forecast}><CartesianGrid /><XAxis dataKey="week" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="predicted" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name="Прогноз ML" /></AreaChart></ResponsiveContainer></CardContent></Card>

      <Card><CardHeader><CardTitle>Рекомендации по закупке</CardTitle></CardHeader><CardContent>{recommendations.map((rec, idx) => (<div key={idx} className="border p-4 rounded-lg mb-3"><h4 className="font-bold">{rec.productName}</h4><div className="grid grid-cols-3 gap-2 mt-2"><div>Текущий запас: {rec.currentStock}</div><div>Рекомендуемый заказ: {rec.recommendedOrder}</div><div>Уверенность: {rec.confidence}%</div></div><Progress value={rec.confidence} className="mt-2" /></div>))}</CardContent></Card>
    </div>
  );
}