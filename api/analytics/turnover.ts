import { withAuth } from '../../lib/authMiddleware';

export default withAuth(async (req, res) => {
  const period = req.query.period as string || '6months';
  const months = period === '12months' ? 12 : 6;
  // ✅ указываем тип массива
  const data: { month: string; quantity: number }[] = [];
  for (let i = 0; i < months; i++) {
    data.push({ month: `Месяц ${i+1}`, quantity: 3000 + Math.random() * 3000 });
  }
  res.json(data);
});
