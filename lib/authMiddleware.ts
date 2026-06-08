import { verifyToken } from './jwt';

export function withAuth(handler: Function) {
  return async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: no token' });
    }

    try {
      const decoded = verifyToken(token);
      req.user = decoded; // { userId, role }
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }
  };
}
