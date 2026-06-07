import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from './jwt';

export function withAuth(handler: Function) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      req.user = payload; // добавим поле user в req
      return handler(req, res);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}