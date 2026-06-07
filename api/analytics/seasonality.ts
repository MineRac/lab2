import { withAuth } from '../../lib/authMiddleware';

export default withAuth(async (req, res) => {
  // Статические данные сезонности (можно заменить агрегацией по месяцам)
  const data = [
    { month: 'Янв', sales: 3200 }, { month: 'Фев', sales: 2900 }, { month: 'Мар', sales: 3400 },
    { month: 'Апр', sales: 3800 }, { month: 'Май', sales: 4100 }, { month: 'Июн', sales: 4500 },
    { month: 'Июл', sales: 4200 }, { month: 'Авг', sales: 3900 }, { month: 'Сен', sales: 5200 },
    { month: 'Окт', sales: 4800 }, { month: 'Ноя', sales: 6100 }, { month: 'Дек', sales: 5800 },
  ];
  res.json(data);
});