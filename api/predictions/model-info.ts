import { withAuth } from '../../lib/authMiddleware';

export default withAuth(async (req, res) => {
  res.json({ accuracy: 94.3, predictionsCount: 2847, avgConfidence: 91.8, savings: 1200000 });
});