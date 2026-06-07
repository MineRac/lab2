import { withAuth } from '../../lib/authMiddleware';

export default withAuth(async (req, res) => {
  // В реальности эти настройки можно хранить в отдельной таблице Settings
  const { enabled, confidenceThreshold } = req.body;
  // Пока просто сохраняем в переменные окружения? Или в БД.
  // Для простоты просто возвращаем успех
  res.json({ success: true, enabled, confidenceThreshold });
});