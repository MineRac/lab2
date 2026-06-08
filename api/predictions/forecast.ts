import { withAuth } from '../../lib/authMiddleware';

export default withAuth(async (req, res) => {
  const weeks = parseInt(req.query.weeks as string) || 8;
  const data: { week: string; predicted: number }[] = [];
  for (let i = 1; i <= weeks; i++) {
    data.push({ week: `Неделя ${i}`, predicted: 800 + Math.random() * 400 });
  }
  res.json(data);
});
