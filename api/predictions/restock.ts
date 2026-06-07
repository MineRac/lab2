import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export default withAuth(async (req, res) => {
  // Получаем все товары с низким запасом
  const products = await prisma.product.findMany({
    where: { stock: { lt: prisma.product.fields.minStock } },
  });
  // Для каждого товара запрашиваем у ML‑модели оптимальный заказ
  const recommendations = [];
  for (const product of products) {
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          current_stock: product.stock,
          min_stock: product.minStock,
          max_stock: product.maxStock,
          history: await getDemandHistory(product.id), // функция получает последние продажи
        }),
      });
      const mlData = await mlResponse.json();
      recommendations.push({
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        recommendedOrder: mlData.recommended_order,
        confidence: mlData.confidence,
      });
    } catch (err) {
      console.error(`ML error for ${product.id}`, err);
    }
  }
  res.json(recommendations);
});

async function getDemandHistory(productId: string, days = 30) {
  const movements = await prisma.stockMovement.findMany({
    where: { productId, type: 'OUTBOUND', createdAt: { gte: new Date(Date.now() - days * 86400000) } },
    orderBy: { createdAt: 'asc' },
  });
  return movements.map(m => m.quantity);
}