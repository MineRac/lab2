// Удалите эту строку:
// import type { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '../../lib/authMiddleware';
import { prisma } from '../../lib/db';
import { StockMovementType } from '@prisma/client';

// Замените NextApiRequest/NextApiResponse на any (или просто уберите аннотации)
export default withAuth(async (req: any, res: any) => {
  const { productId, days = 30 } = req.query;
  const movements = await prisma.stockMovement.findMany({
    where: { 
      productId: productId as string, 
      type: StockMovementType.OUT
    },
    orderBy: { createdAt: 'asc' },
  });
  const sales = movements.map(m => m.quantity);
  const forecast = simpleExponentialSmoothing(sales, Number(days));
  res.json({ forecast });
});

function simpleExponentialSmoothing(data: number[], steps: number, alpha = 0.3) {
  if (data.length === 0) return new Array(steps).fill(0);
  let last = data[0];
  for (let i = 1; i < data.length; i++) {
    last = alpha * data[i] + (1 - alpha) * last;
  }
  return new Array(steps).fill(last);
}
